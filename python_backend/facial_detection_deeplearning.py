import cv2
import numpy as np
import logging
import io
from PIL import Image
import ssl
import certifi

logger = logging.getLogger(__name__)

# Fix SSL certificate verification for model downloads
ssl._create_default_https_context = ssl._create_unverified_context

try:
    import torch
    from hsemotion.facial_emotions import HSEmotionRecognizer
    
    # Monkey-patch the underlying torch.load in timm to use weights_only=False
    # HSEmotion models are from a trusted source (official GitHub repo)
    original_torch_load = torch.load
    def patched_torch_load(f, *args, **kwargs):
        # Force weights_only=False for loading trusted pre-trained models
        kwargs['weights_only'] = False
        return original_torch_load(f, *args, **kwargs)
    torch.load = patched_torch_load
    
except ImportError as e:
    logger.error(f"HSEmotion or dependencies not installed: {e}")
    HSEmotionRecognizer = None


class DeepLearningFacialEmotionDetector:
    """
    Production-grade facial emotion detection using HSEmotion pre-trained CNN
    Provides accurate emotion recognition trained on large datasets
    """
    
    def __init__(self):
        if HSEmotionRecognizer is None:
            raise ImportError("HSEmotion library not available")
            
        logger.info("Initializing DeepLearning FacialEmotionDetector with HSEmotion CNN...")
        
        # Initialize the emotion recognizer
        # This will download pre-trained weights on first run
        self.model = HSEmotionRecognizer(model_name='enet_b0_8_best_afew')
        
        # PATCH: Fix compatibility issue between old model weights and new timm library
        # The old model doesn't have 'conv_s2d' or 'aa' attributes which new timm code expects
        logger.info("Applying runtime patch for timm compatibility...")
        patch_count = 0
        try:
            import torch.nn as nn
            
            # We need to iterate through all modules to find DepthwiseSeparableConv
            # HSEmotion wraps the model in self.model
            if hasattr(self.model, 'model'):
                modules_to_patch = self.model.model.modules()
            else:
                modules_to_patch = self.model.modules()
                
            for m in modules_to_patch:
                if m.__class__.__name__ in ['DepthwiseSeparableConv', 'InvertedResidual']:
                    # Fix conv_s2d (checked with if is not None)
                    if not hasattr(m, 'conv_s2d'):
                        m.conv_s2d = None
                        patch_count += 1
                    
                    # Fix aa (called directly, needs to be callable)
                    if not hasattr(m, 'aa'):
                        m.aa = nn.Identity()
                        patch_count += 1
                        
            logger.info(f"Patched {patch_count} attributes in EfficientNet model")
        except Exception as e:
            logger.warning(f"Failed to apply timm patch: {e}")

        
        # Load Haar Cascade for face detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        # Emotion labels from HSEmotion model
        self.emotion_labels = ['angry', 'contempt', 'disgusted', 'fearful', 'happy', 'neutral', 'sad', 'surprised']
        
        # Extended emotion mapping for compatibility
        self.extended_emotions = {
            'angry': ['angry', 'frustrated'],
            'contempt': ['contempt', 'disgusted'],
            'disgusted': ['disgusted'],
            'fearful': ['fearful', 'anxious', 'stressed'],
            'happy': ['happy', 'excited', 'energetic'],
            'neutral': ['neutral', 'calm', 'focused', 'contemplative'],
            'sad': ['sad', 'cry'],
            'surprised': ['surprised']
        }
        
        logger.info("DeepLearning FacialEmotionDetector initialized successfully with CNN model")
    
    def analyze_emotion(self, image_data):
        """
        Analyze facial emotion using deep learning CNN
        """
        try:
            # Convert bytes to image
            image_pil = Image.open(io.BytesIO(image_data))
            
            # Force convert to RGB (removes alpha channel if present)
            if image_pil.mode != 'RGB':
                image_pil = image_pil.convert('RGB')
            
            image_np = np.array(image_pil)
            
            # Convert RGB to BGR for OpenCV
            image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(30, 30)
            )
            
            if len(faces) == 0:
                logger.warning("No faces detected in image")
                return {
                    'emotion': 'neutral',
                    'confidence': 30,
                    'emotion_scores': {'neutral': 100.0},
                    'landmarks': {},
                    'faces_detected': 0,
                    'model_used': 'HSEmotion_CNN_enet_b0_8'
                }
            
            # Get the largest face
            if len(faces) > 1:
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            
            x, y, w, h = faces[0]
            
            # Extract face ROI
            face_roi = image_bgr[y:y+h, x:x+w]
            
            # Convert to RGB for the model (HSEmotion expects RGB via PIL)
            face_roi_rgb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB)
            
            # Run emotion recognition using deep learning model (WITHOUT logits! Use probabilities)
            emotion, scores = self.model.predict_emotions(face_roi_rgb, logits=False)
            
            logger.info(f"🔍 Raw CNN Output: emotion={emotion}, raw_scores={scores}")
            
            # Convert scores to percentages (0-100)
            # scores is already a numpy array with probabilities summing to ~1.0
            emotion_scores_raw = {}
            for i, label in enumerate(self.emotion_labels):
                emotion_scores_raw[label] = float(scores[i]) * 100
            
            logger.info(f"📊 Emotion percentages: {emotion_scores_raw}")
            
            # Keep top 5 emotions
            top_emotions = sorted(emotion_scores_raw.items(), key=lambda x: x[1], reverse=True)[:5]
            emotion_scores_filtered = dict(top_emotions)
            
            # Re-normalize to sum to 100
            total_filtered = sum(emotion_scores_filtered.values())
            if total_filtered > 0:
                emotion_scores_filtered = {k: round((v / total_filtered) * 100, 2) for k, v in emotion_scores_filtered.items()}
            
            # Get dominant emotion and its confidence
            # Fix: Ensure emotion string matches list keys (lowercase)
            detected_emotion = emotion.lower() if isinstance(emotion, str) else emotion
            confidence = emotion_scores_filtered.get(detected_emotion, emotion_scores_raw.get(detected_emotion, 0))
            
            result = {
                'emotion': detected_emotion,
                'confidence': round(confidence, 2),
                'emotion_scores': emotion_scores_filtered,
                'landmarks': {
                    'face_box': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)}
                },
                'faces_detected': len(faces),
                'model_used': 'HSEmotion_CNN_enet_b0_8'
            }
            
            logger.info(f"✅ Final: {detected_emotion} ({confidence:.1f}%) | Top3: {list(emotion_scores_filtered.keys())[:3]}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error in deep learning facial analysis: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'emotion': 'neutral',
                'confidence': 30,
                'emotion_scores': {'neutral': 100.0},
                'error': str(e),
                'model_used': 'HSEmotion_CNN_enet_b0_8'
            }
    
    def get_supported_emotions(self):
        return self.emotion_labels

