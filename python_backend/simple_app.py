#!/usr/bin/env python3
"""
Simple Python backend for emotion analysis
Works without external dependencies for demo purposes
"""

import json
import random
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import threading

class EmotionAnalysisHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "status": "healthy",
                "service": "emotion-analysis-api",
                "timestamp": datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except:
            data = {}

        parsed_path = urlparse(self.path)
        
        # Set CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        
        if parsed_path.path == '/analyze/facial':
            response = self.analyze_facial(data)
        elif parsed_path.path == '/analyze/voice':
            response = self.analyze_voice(data)
        elif parsed_path.path == '/analyze/text':
            response = self.analyze_text(data)
        elif parsed_path.path == '/analyze/complete':
            response = self.analyze_complete(data)
        else:
            self.send_response(404)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

    def analyze_facial(self, data):
        """Simulate facial emotion analysis"""
        emotions = ['happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted', 'neutral']
        
        # Add time-based emotion patterns
        hour = datetime.now().hour
        if 6 <= hour <= 10:  # Morning
            emotions = ['calm', 'neutral', 'happy', 'excited']
        elif 12 <= hour <= 14:  # Lunch
            emotions = ['happy', 'excited', 'neutral', 'energetic']
        elif 18 <= hour <= 22:  # Evening
            emotions = ['calm', 'tired', 'relaxed', 'stressed']
        
        emotion = random.choice(emotions)
        confidence = random.randint(65, 95)
        
        return {
            "success": True,
            "result": {
                "emotion": emotion,
                "confidence": confidence,
                "landmarks": {
                    "face_detected": True,
                    "face_count": 1,
                    "quality_score": round(random.uniform(0.7, 1.0), 2)
                },
                "timestamp": datetime.now().isoformat()
            }
        }

    def analyze_voice(self, data):
        """Simulate voice emotion analysis"""
        emotions = ['happy', 'sad', 'angry', 'fearful', 'excited', 'calm', 'stressed']
        emotion = random.choice(emotions)
        confidence = random.randint(60, 90)
        
        return {
            "success": True,
            "result": {
                "emotion": emotion,
                "confidence": confidence,
                "features": {
                    "pitch_mean": round(random.uniform(80, 300), 1),
                    "energy_level": round(random.uniform(0.1, 0.9), 2),
                    "speaking_rate": round(random.uniform(100, 200), 1),
                    "audio_quality": round(random.uniform(0.6, 1.0), 2)
                },
                "timestamp": datetime.now().isoformat()
            }
        }

    def analyze_text(self, data):
        """Analyze text sentiment"""
        text = data.get('text', '').lower()
        
        positive_words = ['good', 'great', 'awesome', 'happy', 'love', 'amazing', 'wonderful', 'excited']
        negative_words = ['bad', 'terrible', 'hate', 'sad', 'angry', 'awful', 'horrible', 'stressed']
        
        positive_count = sum(1 for word in positive_words if word in text)
        negative_count = sum(1 for word in negative_words if word in text)
        
        if positive_count > negative_count:
            sentiment = "positive"
            confidence = min(95, 60 + positive_count * 10)
        elif negative_count > positive_count:
            sentiment = "negative"
            confidence = min(95, 60 + negative_count * 10)
        else:
            sentiment = "neutral"
            confidence = 70
            
        return {
            "success": True,
            "result": {
                "sentiment": sentiment,
                "confidence": confidence,
                "analysis": {
                    "positive_words": positive_count,
                    "negative_words": negative_count,
                    "text_length": len(text.split()) if text else 0
                },
                "timestamp": datetime.now().isoformat()
            }
        }

    def analyze_complete(self, data):
        """Perform complete multi-modal emotion analysis"""
        facial_result = None
        voice_result = None
        text_result = None
        
        # Analyze each modality if data is provided
        if data.get('image_data'):
            facial_result = self.analyze_facial(data)['result']
        if data.get('audio_data'):
            voice_result = self.analyze_voice(data)['result']
        if data.get('text'):
            text_result = self.analyze_text(data)['result']
            
        # Fuse the results
        fused_result = self.fuse_emotions(facial_result, voice_result, text_result)
        
        return {
            "success": True,
            "results": {
                "facial": facial_result,
                "voice": voice_result,
                "text": text_result,
                "fused": fused_result
            }
        }

    def fuse_emotions(self, facial, voice, text):
        """Fuse multiple emotion inputs"""
        sources = []
        weights = []
        
        if facial:
            sources.append(facial)
            weights.append(0.4)  # Facial gets highest weight
        if voice:
            sources.append(voice)
            weights.append(0.35)  # Voice gets medium weight
        if text:
            sources.append(text)
            weights.append(0.25)  # Text gets lowest weight
            
        if not sources:
            return {
                "emotion": "neutral",
                "confidence": 60,
                "timestamp": datetime.now().isoformat()
            }
            
        # Simple fusion: weighted average
        best_emotion = None
        best_score = 0
        
        for i, source in enumerate(sources):
            emotion = source.get('emotion') or source.get('sentiment', 'neutral')
            confidence = source.get('confidence', 50)
            weighted_score = confidence * weights[i]
            
            if weighted_score > best_score:
                best_score = weighted_score
                best_emotion = emotion
                
        return {
            "emotion": best_emotion or "neutral",
            "confidence": int(min(95, max(20, best_score))),
            "sources": len(sources),
            "timestamp": datetime.now().isoformat()
        }

def run_server(port=5001):
    """Run the emotion analysis server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, EmotionAnalysisHandler)
    print(f"Python Emotion Analysis API running on port {port}")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()