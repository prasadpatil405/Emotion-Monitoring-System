import os
import sys
import json
import base64
from datetime import datetime
import random
import math
import traceback

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False

import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import core engines
try:
    from emotion_engine import EmotionFusionEngine
    # Try to use deep learning detector first
    try:
        from facial_detection_deeplearning import DeepLearningFacialEmotionDetector as FacialEmotionDetector
        logger.info("✅ Using Deep Learning CNN (HSEmotion) for facial detection")
    except ImportError as e:
        logger.warning(f"Deep learning detector not available, falling back to heuristic: {e}")
        from facial_detection import FacialEmotionDetector
except ImportError as e:
    logger.error(f"Failed to import core modules: {str(e)}")
    # We will handle missing modules in initialization

import numpy as np
from scipy.io import wavfile
import soundfile as sf
import io

class VoiceEmotionAnalyzer:
    def __init__(self):
        self.emotions = ['neural', 'happy', 'sad', 'angry', 'fearful', 'excited', 'cry']
        
    def analyze_emotion(self, audio_data):
        try:
            # Decode base64 audio data
            # The frontend sends standard base64 string
            decoded_audio = base64.b64decode(audio_data)
            
            # Read Audio Data
            try:
                # Try reading with soundfile (supports OGG/WebM/etc)
                data, sr = sf.read(io.BytesIO(decoded_audio))
            except Exception as e:
                # Fallback to wavfile (only supports WAV)
                try:
                    sr, data = wavfile.read(io.BytesIO(decoded_audio))
                except Exception as e2:
                    logger.error(f"Error reading audio (sf: {e}, wav: {e2})")
                    return None
                
            # Convert to float32 for analysis if needed
            if data.dtype == np.int16:
                data = data.astype(np.float32) / 32768.0
            
            # Mono conversion
            if len(data.shape) > 1:
                data = np.mean(data, axis=1)
                
            # --- Audio Feature Extraction ---
            
            # 1. RMS Energy (Volume/Intensity)
            rms = np.sqrt(np.mean(data**2))
            
            # 2. Zero Crossing Rate (Rough Pitch/Noise approximation)
            zcr = ((data[:-1] * data[1:]) < 0).sum() / len(data)
            
            # 3. Peak Amplitude
            peak = np.max(np.abs(data))
            
            detected_emotion = "neutral"
            confidence = 60
            
            # --- Heuristic Logic for Voice ---
            
            # High Energy + High Pitch -> Fear/Excitement/Anger (Crying)
            # Increased thresholds to avoid noise triggering 'excited'
            if rms > 0.25: # Very Loud (was 0.15)
                if zcr > 0.15: # High frequency noise (Screaming/Crying)
                    detected_emotion = "cry" 
                    confidence = 85
                elif zcr > 0.08:
                    detected_emotion = "angry"
                    confidence = 75
                else:
                    detected_emotion = "excited"
                    confidence = 70
            
            # Medium Energy
            elif rms > 0.08: # (was 0.05)
                if zcr > 0.12:
                    detected_emotion = "happy"
                    confidence = 65
                else:
                    detected_emotion = "neutral"
                    confidence = 60
                    
            # Low Energy -> Sad/Calm
            else:
                if zcr < 0.03: # Low monotone
                    detected_emotion = "sad" # Depression often sounds flat/low energy
                    confidence = 70
                elif zcr > 0.15 and rms < 0.05:
                     # High pitch but low energy (whimpering/quiet sobbing)
                     detected_emotion = "cry"
                     confidence = 65
                else:
                    detected_emotion = "calm"
                    confidence = 75
            
            return {
                "emotion": detected_emotion,
                "confidence": int(confidence),
                "features": {
                    "energy": float(rms),
                    "pitch_proxy": float(zcr),
                    "peak": float(peak)
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Voice Analysis Error: {str(e)}")
            return {
                "emotion": "neutral",
                "confidence": 50,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

class TextSentimentAnalyzer:
    def __init__(self):
        self.positive_words = [
            'good', 'great', 'awesome', 'happy', 'love', 'amazing', 'wonderful', 'excited',
            'joy', 'cheerful', 'delighted', 'confident', 'optimistic', 'blessed', 'energetic',
            'grateful', 'peaceful', 'calm', 'content', 'proud', 'fantastic', 'brilliant'
        ]
        self.negative_words = [
            'bad', 'terrible', 'hate', 'sad', 'angry', 'awful', 'horrible', 'stressed',
            'depressed', 'lonely', 'anxious', 'scared', 'fear', 'nervous', 'tired',
            'exhausted', 'annoyed', 'upset', 'disappointed', 'hopeless', 'grief', 'pain',
            'struggling', 'overwhelmed', 'hurt', 'miserable', 'empty'
        ]
        self.neutral_words = ['okay', 'fine', 'normal', 'usual', 'maybe', 'think', 'probably', 'so-so', 'balanced']
        
    def analyze_sentiment(self, text):
        if not text:
            return {"sentiment": "neutral", "confidence": 50, "analysis": {}}
            
        text_lower = text.lower()
        words = text_lower.split()
        
        positive_count = sum(1 for word in words if word in self.positive_words)
        negative_count = sum(1 for word in words if word in self.negative_words)
        neutral_count = sum(1 for word in words if word in self.neutral_words)
        
        total_emotional_words = positive_count + negative_count + neutral_count
        
        if total_emotional_words == 0:
            sentiment = "neutral"
            confidence = 60
        elif positive_count > negative_count:
            sentiment = "positive"
            confidence = min(95, 60 + (positive_count / len(words)) * 35)
        elif negative_count > positive_count:
            sentiment = "negative" 
            confidence = min(95, 60 + (negative_count / len(words)) * 35)
        else:
            sentiment = "neutral"
            confidence = 70
            
        return {
            "sentiment": sentiment,
            "confidence": int(confidence),
            "analysis": {
                "positive_words": positive_count,
                "negative_words": negative_count,
                "neutral_words": neutral_count,
                "text_length": len(words),
                "emotional_intensity": total_emotional_words / len(words) if words else 0
            },
            "timestamp": datetime.now().isoformat()
        }

# Initialize the analyzers

# Initialize emotion analysis components
try:
    facial_detector = FacialEmotionDetector()
    voice_analyzer = VoiceEmotionAnalyzer()
    text_analyzer = TextSentimentAnalyzer()
    fusion_engine = EmotionFusionEngine()
    logger.info("All emotion analysis components initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize components: {str(e)}")
    facial_detector = None
    voice_analyzer = None
    text_analyzer = None
    fusion_engine = None

    fusion_engine = None

# Flask application setup
if FLASK_AVAILABLE:
    app = Flask(__name__)
    CORS(app, origins=["http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:5002", "http://127.0.0.1:5002"])

# Use a Blueprint to handle the /api/analyze prefix on Vercel
from flask import Blueprint
analyze_bp = Blueprint('analyze', __name__)

@analyze_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'components': {
            'facial_detector': facial_detector is not None,
            'voice_analyzer': voice_analyzer is not None,
            'text_analyzer': text_analyzer is not None,
            'fusion_engine': fusion_engine is not None
        }
    })

@analyze_bp.route('/analyze/facial', methods=['POST'])
def analyze_facial():
    """Analyze facial emotions from image data"""
    try:
        if not facial_detector:
            return jsonify({'error': 'Facial detector not available'}), 503
        
        image_data = None
        
        # Check for JSON data (Base64)
        if request.is_json:
            data = request.get_json()
            if 'image_data' in data:
                # Remove header if present (e.g., "data:image/jpeg;base64,")
                b64_data = data['image_data']
                if 'base64,' in b64_data:
                    b64_data = b64_data.split('base64,')[1]
                try:
                    image_data = base64.b64decode(b64_data)
                except Exception as e:
                    return jsonify({'error': 'Invalid base64 image data'}), 400
        
        # Check for File upload
        elif 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename != '':
                image_data = image_file.read()
                
        if image_data is None:
             return jsonify({'error': 'No image data provided (json or file)'}), 400

        # Analyze facial emotion
        # facial_detector expects raw image bytes
        result = facial_detector.analyze_emotion(image_data)
        
        if result is None:
            logger.error("Facial analysis returned None")
            return jsonify({'error': 'Failed to analyze facial emotion'}), 500
        
        if 'error' in result:
             # Just log it, return the result (which contains 'error')
             logger.warning(f"Facial analysis warning: {result['error']}")

        logger.info(f"Facial Analysis Result: {result['emotion']} ({result['confidence']}%)")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in facial analysis: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error during facial analysis'}), 500

@analyze_bp.route('/analyze/voice', methods=['POST'])
def analyze_voice():
    """Analyze voice emotions from audio data"""
    try:
        if not voice_analyzer:
            return jsonify({'error': 'Voice analyzer not available'}), 503
        
        audio_data = None
        is_base64 = False
        
        # Check for JSON data (Base64)
        if request.is_json:
            data = request.get_json()
            if 'audio_data' in data:
                b64_data = data['audio_data']
                # Remove header if present
                if 'base64,' in b64_data:
                    b64_data = b64_data.split('base64,')[1]
                # voice_analyzer expects BASE64 STRING/BYTES, let's look at it.
                # line 43: decoded_audio = base64.b64decode(audio_data)
                # So we should pass the BASE64 string (or bytes of it).
                audio_data = b64_data
                is_base64 = True

        # Check for File upload
        elif 'audio' in request.files:
            audio_file = request.files['audio']
            if audio_file.filename != '':
                # If it's a file, it's likely raw binary WAV
                # But voice_analyzer UNCONDITIONALLY base64 decodes it!
                # We must base64 encode it first if we want to use the existing class logic,
                # OR we modify the class. Modifying the input here is safer.
                raw_data = audio_file.read()
                audio_data = base64.b64encode(raw_data).decode('utf-8')
                is_base64 = True
        
        if audio_data is None:
            return jsonify({'error': 'No audio data provided'}), 400
        
        # Analyze voice emotion
        # audio_data is now a base64 string
        result = voice_analyzer.analyze_emotion(audio_data)
        
        if result is None:
            logger.error("Voice analysis returned None")
            return jsonify({'error': 'Failed to analyze voice emotion'}), 500
        
        logger.info(f"Voice Analysis Result: {result.get('emotion', 'unknown')} ({result.get('confidence', 0)}%)")
        # Log features for debugging
        if 'features' in result:
             logger.info(f"Voice Features: {result['features']}")

        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in voice analysis: {str(e)}")
        # Return fallback instead of 500 to keep the app running
        return jsonify({
            'emotion': 'neutral',
            'confidence': 0,
            'error': str(e)
        })

@analyze_bp.route('/analyze/text', methods=['POST'])
def analyze_text():
    """Analyze text sentiment"""
    try:
        if not text_analyzer:
            return jsonify({'error': 'Text analyzer not available'}), 503
        
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text data provided'}), 400
        
        text = data['text']
        if not text.strip():
            return jsonify({'error': 'Empty text provided'}), 400
        
        # Analyze text sentiment
        result = text_analyzer.analyze_sentiment(text)
        
        if result is None:
            return jsonify({'error': 'Failed to analyze text sentiment'}), 500
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in text analysis: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error during text analysis'}), 500

@analyze_bp.route('/analyze/fuse', methods=['POST'])
def fuse_emotions():
    """Fuse multiple emotion inputs into a single result"""
    try:
        if not fusion_engine:
            return jsonify({'error': 'Fusion engine not available'}), 503
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract emotion data from different modalities
        facial_data = data.get('facial')
        voice_data = data.get('voice')
        text_data = data.get('text')
        
        # Validate that at least one modality is provided
        if not any([facial_data, voice_data, text_data]):
            return jsonify({'error': 'At least one emotion modality must be provided'}), 400
        
        # Fuse emotions
        result = fusion_engine.fuse_emotions(
            facial_emotion=facial_data,
            voice_emotion=voice_data,
            text_emotion=text_data
        )
        
        if result is None:
            return jsonify({'error': 'Failed to fuse emotions'}), 500
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in emotion fusion: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error during emotion fusion'}), 500

@analyze_bp.route('/analyze/complete', methods=['POST'])
def complete_analysis():
    """Perform complete multi-modal emotion analysis"""
    try:
        if not all([facial_detector, voice_analyzer, text_analyzer, fusion_engine]):
            return jsonify({'error': 'One or more analysis components not available'}), 503
        
        results = {}
        
        # Analyze facial emotion if image provided
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename != '':
                image_data = image_file.read()
                facial_result = facial_detector.analyze_emotion(image_data)
                if facial_result:
                    results['facial'] = facial_result
        
        # Analyze voice emotion if audio provided
        if 'audio' in request.files:
            audio_file = request.files['audio']
            if audio_file.filename != '':
                audio_data = audio_file.read()
                voice_result = voice_analyzer.analyze_emotion(audio_data)
                if voice_result:
                    results['voice'] = voice_result
        
        # Analyze text sentiment if text provided
        text_data = request.form.get('text')
        if text_data and text_data.strip():
            text_result = text_analyzer.analyze_sentiment(text_data)
            if text_result:
                results['text'] = text_result
        
        # Validate that at least one analysis was successful
        if not results:
            return jsonify({'error': 'No valid inputs provided or all analyses failed'}), 400
        
        # Fuse emotions
        fused_result = fusion_engine.fuse_emotions(
            facial_emotion=results.get('facial'),
            voice_emotion=results.get('voice'),
            text_emotion=results.get('text')
        )
        
        if fused_result is None:
            return jsonify({'error': 'Failed to fuse emotions'}), 500
        
        # Return complete analysis
        return jsonify({
            'individual_results': results,
            'fused_result': fused_result,
            'timestamp': fusion_engine.get_timestamp()
        })
        
    except Exception as e:
        logger.error(f"Error in complete analysis: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error during complete analysis'}), 500

@analyze_bp.route('/autism/patterns', methods=['POST'])
def analyze_autism_patterns():
    """Analyze autism-specific emotion patterns"""
    try:
        if not fusion_engine:
            return jsonify({'error': 'Fusion engine not available'}), 503
        
        data = request.get_json()
        if not data or 'sessions' not in data:
            return jsonify({'error': 'No session data provided'}), 400
        
        sessions = data['sessions']
        if not isinstance(sessions, list) or len(sessions) == 0:
            return jsonify({'error': 'Invalid or empty session data'}), 400
        
        # Analyze autism-specific patterns
        result = fusion_engine.analyze_autism_patterns(sessions)
        
        if result is None:
            return jsonify({'error': 'Failed to analyze autism patterns'}), 500
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in autism pattern analysis: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error during autism pattern analysis'}), 500

@analyze_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@analyze_bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405

@analyze_bp.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

# Register the blueprint
app.register_blueprint(analyze_bp, url_prefix='/api/analyze')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug_mode = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting EmotionAI Python Backend on port {port}")
    logger.info(f"Debug mode: {debug_mode}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug_mode,
        threaded=True
    )

# @Copyright reserved . 2026 | Made By Prasad,Vedant And Krish
