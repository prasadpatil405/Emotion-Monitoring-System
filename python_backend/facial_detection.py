import cv2
import numpy as np
import logging
import io
from PIL import Image
import os
import hashlib
import time

logger = logging.getLogger(__name__)

class FacialEmotionDetector:
    """
    Facial emotion detection using OpenCV heuristics and deterministic mapping
    Designed to work without heavy deep learning dependencies
    """
    
    def __init__(self):
        self.emotion_labels = ['angry', 'disgusted', 'fearful', 'happy', 'sad', 'surprised', 'neutral', 'excited', 'energetic', 'cry']
        
        self.face_cascade = None
        self.smile_cascade = None
        self.eye_cascade = None
        
        # Track previous frame for movement detection
        self.prev_gray = None
        self.movement_score = 0
        self.last_movement_check = time.time()
        
        # Initialize cascades
        self._load_cascades()
        
        logger.info("FacialEmotionDetector (Heuristic) initialized")
    
    def _load_cascades(self):
        """Load OpenCV cascade classifiers"""
        try:
            # Face cascade
            face_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_cascade = cv2.CascadeClassifier(face_path)
            
            # Smile cascade
            smile_path = cv2.data.haarcascades + 'haarcascade_smile.xml'
            self.smile_cascade = cv2.CascadeClassifier(smile_path)
            
            # Eye cascade
            eye_path = cv2.data.haarcascades + 'haarcascade_eye.xml'
            self.eye_cascade = cv2.CascadeClassifier(eye_path)
            
            if self.face_cascade.empty():
                logger.error("Failed to load face cascade classifier")
                # Fallback to local files if needed, but for now log error
            
        except Exception as e:
            logger.error(f"Error loading cascades: {str(e)}")

    def _get_face_hash_emotion(self, face_img):
        """
        Generate a consistent base emotion for a specific face using hashing
        This ensures that even without an ML model, the same person gets 
        consistent 'personality' or base mood unless specific triggers (smile/movement) override it.
        """
        try:
            # Resize to small fixed size for hashing to be robust to small variations
            small_face = cv2.resize(face_img, (32, 32))
            
            # Convert to grayscale
            if len(small_face.shape) == 3:
                gray = cv2.cvtColor(small_face, cv2.COLOR_BGR2GRAY)
            else:
                gray = small_face
                
            # Quantize to reduce noise sensitivity
            gray = (gray // 32) * 32
            
            # Generate hash
            face_hash = hashlib.md5(gray.tobytes()).hexdigest()
            
            # Map hash to an emotion (excluding extreme ones like happy/energetic which are triggered)
            base_emotions = ['calm', 'neutral', 'focused', 'contemplative', 'serious']
            hash_val = int(face_hash, 16)
            emotion_idx = hash_val % len(base_emotions)
            
            return base_emotions[emotion_idx]
            
        except Exception as e:
            logger.error(f"Error in face hashing: {str(e)}")
            return 'neutral'

    def _detect_movement(self, current_gray):
        """Detect global movement amount between frames"""
        try:
            current_time = time.time()
            
            # Only checking periodically or if we have a previous frame
            if self.prev_gray is None:
                self.prev_gray = current_gray
                return 0
                
            # Resize for performance
            curr_small = cv2.resize(current_gray, (160, 120))
            prev_small = cv2.resize(self.prev_gray, (160, 120))
            
            # Compute absolute difference
            frame_diff = cv2.absdiff(curr_small, prev_small)
            
            # Threshold to get binary motion mask
            _, thresh = cv2.threshold(frame_diff, 25, 255, cv2.THRESH_BINARY)
            
            # Calculate movement score (percentage of pixels changed)
            total_pixels = curr_small.shape[0] * curr_small.shape[1]
            non_zero = cv2.countNonZero(thresh)
            movement_score = (non_zero / total_pixels) * 100
            
            # Update state
            self.prev_gray = current_gray
            self.movement_score = movement_score
            self.last_movement_check = current_time
            
            return movement_score
            
        except Exception as e:
            logger.error(f"Error in movement detection: {str(e)}")
            return 0

    def analyze_emotion(self, image_data):
        """
        Analyze facial emotion using heuristics with stateful tracking
        """
        try:
            # Convert bytes to image
            image_pil = Image.open(io.BytesIO(image_data))
            image_np = np.array(image_pil)
            
            if len(image_np.shape) == 3:
                image_cv = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
                gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
            else:
                image_cv = cv2.cvtColor(image_np, cv2.COLOR_GRAY2BGR)
                gray = image_np
            
            # 1. Evaluate Movement (Global)
            movement = self._detect_movement(gray)
            is_high_movement = movement > 25.0  # Increased threshold to avoid false positives
            
            # 2. Detect Faces
            faces = []
            if self.face_cascade:
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=(60, 60), # Minimum size increased to ignore background noise
                    flags=cv2.CASCADE_SCALE_IMAGE
                )
            
            if len(faces) == 0:
                return {
                    'emotion': 'neutral',
                    'confidence': 30,
                    'landmarks': {},
                    'faces_detected': 0,
                    'error': 'No faces detected'
                }
            
            # Process the largest face
            largest_face = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = largest_face
            
            # Extract ROI (Region of Interest)
            roi_gray = gray[y:y+h, x:x+w]
            roi_color = image_cv[y:y+h, x:x+w]
            
            # 3. Detect Smiles within Face ROI (Bottom Half) - ULTRA STRICT
            roi_gray_lower = roi_gray[int(h/2):h, :]
            smiles = []
            if self.smile_cascade:
                smiles = self.smile_cascade.detectMultiScale(
                    roi_gray_lower,
                    scaleFactor=1.8,  # More strict
                    minNeighbors=45,  # MUCH higher threshold - only very clear smiles
                    minSize=(30, 20)  # Larger minimum size
                )
            
            # ULTRA-STRICT Smile Validation
            is_smiling = False
            valid_smile_count = 0
            
            for (sx, sy, sw, sh) in smiles:
                aspect_ratio = sw / sh
                # Real smiles must be VERY wide (aspect ratio > 1.8)
                # AND positioned in lower half of face
                # AND have reasonable size
                if aspect_ratio > 1.8 and sw > 30 and sy > h * 0.3:
                    valid_smile_count += 1
            
            # Only consider it a smile if we have at least 2 strong smile detections
            # This prevents false positives from mouth movements
            is_smiling = valid_smile_count >= 2
            
            # 4. Detect Eyes (Top Half)
            roi_gray_upper = roi_gray[0:int(h/2), :]
            eyes = []
            if self.eye_cascade:
                eyes = self.eye_cascade.detectMultiScale(roi_gray_upper)
            eyes_open = len(eyes) >= 2
            
            # --- Advanced Multi-Emotion Probability System with STRICT HAPPY PREVENTION ---
            # Initialize emotion scores (0-100)
            emotion_scores = {
                'happy': 0.0,
                'sad': 0.0,
                'angry': 0.0,
                'fearful': 0.0,
                'surprised': 0.0,
                'disgusted': 0.0,
                'neutral': 15.0,  # Higher base neutral
                'calm': 12.0,
                'excited': 0.0,
                'focused': 10.0,
                'anxious': 0.0,
                'stressed': 0.0,
                'contemplative': 8.0,
                'energetic': 0.0,
                'cry': 0.0
            }
            
            # Advanced Feature Analysis
            smile_strength = valid_smile_count * 20  # Based on validated smiles only
            
            # Analyze face regions
            face_height = h
            face_width = w
            
            # Upper face analysis (eyebrows - top 30%)
            upper_face = roi_gray[0:int(h*0.3), :]
            # Lower face analysis (mouth/jaw - bottom 40%)
            lower_face = roi_gray[int(h*0.6):h, :]
            
            # Calculate intensity variations
            upper_std = np.std(upper_face) if upper_face.size > 0 else 0
            lower_std = np.std(lower_face) if lower_face.size > 0 else 0
            
            # Brow tension detection
            brow_tension = upper_std > 35
            
            # Mouth contour analysis for frown detection
            mouth_region = roi_gray[int(h*0.65):h, int(w*0.25):int(w*0.75)]
            mouth_downturned = False
            if mouth_region.size > 0:
                edges = cv2.Canny(mouth_region, 50, 150)
                contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                if len(contours) > 0:
                    largest_contour = max(contours, key=cv2.contourArea)
                    if cv2.contourArea(largest_contour) > 50:
                        mx, my, mw, mh = cv2.boundingRect(largest_contour)
                        # Downturned mouth: height > width
                        if mh > mw * 0.6:
                            mouth_downturned = True
            
            # CRITICAL: Prevent happy detection if ANY sad indicators present
            has_sad_indicators = mouth_downturned or (not is_smiling and movement < 8)
            
            # SCENARIO 1: SMILING (Happy/Excited/Energetic) - ONLY if truly smiling
            if is_smiling and not mouth_downturned and not has_sad_indicators:
                emotion_scores['happy'] = 70 + smile_strength
                emotion_scores['neutral'] = 5
                emotion_scores['calm'] = 3
                
                if eyes_open:
                    emotion_scores['excited'] = 60 + (smile_strength * 0.7)
                    emotion_scores['energetic'] = 45 + (movement * 1.5)
                else:
                    emotion_scores['happy'] = 50
                    
                if is_high_movement:
                    emotion_scores['energetic'] = 80
                    emotion_scores['excited'] = 70
                    emotion_scores['happy'] = 60
            
            # SCENARIO 2: SAD FACE (Downturned mouth + low movement + no smile)
            elif mouth_downturned and not is_smiling and movement < 10:
                emotion_scores['sad'] = 70 + (10 - movement) * 2
                emotion_scores['contemplative'] = 35
                emotion_scores['calm'] = 20
                emotion_scores['neutral'] = 10
                
                if brow_tension:
                    # Sad + tense brows = more intense sadness or worry
                    emotion_scores['sad'] = 80
                    emotion_scores['anxious'] = 40
                    emotion_scores['stressed'] = 30
                
                if not eyes_open:
                    # Sad + closed eyes = crying or deep sadness
                    emotion_scores['cry'] = 75
                    emotion_scores['sad'] = 65
            
            # SCENARIO 3: ANGRY FACE (Tense brows + no smile + moderate movement)
            elif brow_tension and not is_smiling and not mouth_downturned:
                emotion_scores['angry'] = 65
                emotion_scores['stressed'] = 45
                emotion_scores['focused'] = 35
                emotion_scores['neutral'] = 10
                
                if movement > 12:
                    # Angry + movement = more agitated
                    emotion_scores['angry'] = 80
                    emotion_scores['stressed'] = 55
                    emotion_scores['frustrated'] = 45
                else:
                    # Angry but still = controlled anger or concentration
                    emotion_scores['focused'] = 50
                    emotion_scores['angry'] = 60
            
            # SCENARIO 4: HIGH MOVEMENT (Surprised/Fearful/Anxious/Cry)
            elif is_high_movement:
                if not eyes_open:
                    # Closed eyes + movement = distress
                    emotion_scores['cry'] = 80
                    emotion_scores['sad'] = 55
                    emotion_scores['anxious'] = 50
                    emotion_scores['stressed'] = 45
                else:
                    # Open eyes + movement = surprise/fear
                    emotion_scores['surprised'] = 70
                    emotion_scores['fearful'] = 50
                    emotion_scores['anxious'] = 40
                    emotion_scores['excited'] = 25
                    
                emotion_scores['neutral'] = 5
                emotion_scores['calm'] = 2
            
            # SCENARIO 5: LOW MOVEMENT + NO STRONG SIGNALS
            elif movement < 5.0:
                if not eyes_open:
                    # Very still, eyes not detected -> Calm/Contemplative
                    emotion_scores['calm'] = 60
                    emotion_scores['contemplative'] = 50
                    emotion_scores['neutral'] = 30
                    emotion_scores['sad'] = 25  # Slight sadness possibility
                else:
                    # Still with eyes open -> Focused/Calm/Neutral
                    emotion_scores['focused'] = 55
                    emotion_scores['calm'] = 50
                    emotion_scores['neutral'] = 45
                    emotion_scores['contemplative'] = 35
            
            # SCENARIO 6: MODERATE MOVEMENT + NO STRONG SIGNALS
            else:
                # Normal activity, no strong signals
                emotion_scores['neutral'] = 55
                emotion_scores['focused'] = 40
                emotion_scores['calm'] = 30
                emotion_scores['contemplative'] = 25
                
                # Slight bias based on movement intensity
                if movement > 15:
                    emotion_scores['anxious'] = 35
                    emotion_scores['stressed'] = 30
                    emotion_scores['focused'] = 50
            
            # ADDITIONAL REFINEMENTS
            # Detect disgust (wrinkled nose area - high variation in middle-upper face)
            if upper_std > 40 and not is_smiling:
                emotion_scores['disgusted'] = 40
                emotion_scores['angry'] = (emotion_scores.get('angry', 0) + 20)
            
            # Normalize scores to sum to 100 (percentage distribution)
            total_score = sum(emotion_scores.values())
            if total_score > 0:
                emotion_scores = {k: (v / total_score) * 100 for k, v in emotion_scores.items()}
            
            # Filter out very low scores (< 5%) for cleaner breakdown
            emotion_scores = {k: round(v, 2) for k, v in emotion_scores.items() if v >= 5.0}
            
            # Determine dominant emotion
            detected_emotion = max(emotion_scores.items(), key=lambda x: x[1])[0]
            confidence = emotion_scores[detected_emotion]

            result = {
                'emotion': detected_emotion,
                'confidence': round(confidence, 2),
                'emotion_scores': emotion_scores,  # Full breakdown
                'landmarks': {
                    'face_box': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                    'smile_detected': bool(is_smiling),
                    'mouth_downturned': bool(mouth_downturned),
                    'brow_tension': bool(brow_tension),
                    'feature_movement': round(movement, 2),
                    'eyes_detected': len(eyes)
                },
                'faces_detected': len(faces),
                'model_used': 'OpenCV_AdvancedHeuristics_v5'
            }
            
            logger.info(f"Analysis: {detected_emotion} (Smile={is_smiling}, Frown={mouth_downturned}, Brows={brow_tension}, Move={movement:.1f})")
            return result
        except Exception as e:
            logger.error(f"Error in facial analysis: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'emotion': 'neutral',
                'confidence': 30,
                'error': str(e)
            }
            
        except Exception as e:
            logger.error(f"Error in facial analysis: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'emotion': 'neutral',
                'confidence': 30,
                'error': str(e)
            }

    def get_supported_emotions(self):
        return self.emotion_labels

