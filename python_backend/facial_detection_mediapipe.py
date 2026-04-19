import cv2
import numpy as np
import logging
import io
from PIL import Image
import mediapipe as mp

logger = logging.getLogger(__name__)

class MediaPipeFacialEmotionDetector:
    """
    Advanced facial emotion detection using MediaPipe Face Mesh
    Provides 468 facial landmarks for precise geometric analysis
    """
    
    def __init__(self):
        self.emotion_labels = [
            'angry', 'disgusted', 'fearful', 'happy', 'sad', 
            'surprised', 'neutral', 'calm', 'excited', 'focused',
            'anxious', 'stressed', 'contemplative', 'energetic', 'cry'
        ]
        
        # Initialize MediaPipe Face Mesh
        from mediapipe.python.solutions import face_mesh as mp_face_mesh
        self.face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Key landmark indices for emotion detection
        # Mouth landmarks
        self.MOUTH_LEFT = 61
        self.MOUTH_RIGHT = 291
        self.MOUTH_TOP = 13
        self.MOUTH_BOTTOM = 14
        self.UPPER_LIP = 0
        self.LOWER_LIP = 17
        
        # Eye landmarks
        self.LEFT_EYE_TOP = 159
        self.LEFT_EYE_BOTTOM = 145
        self.RIGHT_EYE_TOP = 386
        self.RIGHT_EYE_BOTTOM = 374
        
        # Eyebrow landmarks
        self.LEFT_EYEBROW_INNER = 55
        self.LEFT_EYEBROW_OUTER = 46
        self.RIGHT_EYEBROW_INNER = 285
        self.RIGHT_EYEBROW_OUTER = 276
        
        logger.info("MediaPipe FacialEmotionDetector initialized with 468 landmarks")
    
    def _calculate_distance(self, p1, p2):
        """Calculate Euclidean distance between two points"""
        return np.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)
    
    def _calculate_mouth_aspect_ratio(self, landmarks):
        """
        Calculate mouth aspect ratio (MAR)
        MAR > 0.5 = open mouth (surprise/fear/excited)
        MAR < 0.3 = closed mouth
        """
        mouth_width = self._calculate_distance(
            landmarks[self.MOUTH_LEFT],
            landmarks[self.MOUTH_RIGHT]
        )
        mouth_height = self._calculate_distance(
            landmarks[self.MOUTH_TOP],
            landmarks[self.MOUTH_BOTTOM]
        )
        
        if mouth_width == 0:
            return 0
        return mouth_height / mouth_width
    
    def _calculate_mouth_curvature(self, landmarks):
        """
        Calculate mouth curvature to detect smile vs frown
        Positive = smile (happy)
        Negative = frown (sad)
        """
        # Get mouth corner points
        left_corner = landmarks[self.MOUTH_LEFT]
        right_corner = landmarks[self.MOUTH_RIGHT]
        mouth_center = landmarks[self.MOUTH_TOP]
        
        # Calculate average y-position of corners
        corners_y = (left_corner[1] + right_corner[1]) / 2
        
        # Compare to center y-position
        # If corners are higher than center = smile
        # If corners are lower than center = frown
        curvature = mouth_center[1] - corners_y
        
        return curvature
    
    def _calculate_eye_aspect_ratio(self, landmarks, is_left=True):
        """
        Calculate eye aspect ratio (EAR)
        EAR < 0.2 = closed eyes
        EAR > 0.25 = open eyes
        """
        if is_left:
            top = landmarks[self.LEFT_EYE_TOP]
            bottom = landmarks[self.LEFT_EYE_BOTTOM]
        else:
            top = landmarks[self.RIGHT_EYE_TOP]
            bottom = landmarks[self.RIGHT_EYE_BOTTOM]
        
        eye_height = self._calculate_distance(top, bottom)
        
        # Normalize by face size (approximate)
        return eye_height
    
    def _calculate_eyebrow_position(self, landmarks):
        """
        Calculate eyebrow position relative to eyes
        Low eyebrows = angry/sad
        High eyebrows = surprised/fearful
        """
        # Left eyebrow
        left_brow_inner = landmarks[self.LEFT_EYEBROW_INNER]
        left_eye_top = landmarks[self.LEFT_EYE_TOP]
        left_brow_distance = left_eye_top[1] - left_brow_inner[1]
        
        # Right eyebrow
        right_brow_inner = landmarks[self.RIGHT_EYEBROW_INNER]
        right_eye_top = landmarks[self.RIGHT_EYE_TOP]
        right_brow_distance = right_eye_top[1] - right_brow_inner[1]
        
        # Average distance (positive = raised brows, negative = lowered brows)
        avg_brow_distance = (left_brow_distance + right_brow_distance) / 2
        
        return avg_brow_distance
    
    def analyze_emotion(self, image_data):
        """
        Analyze facial emotion using MediaPipe landmarks
        """
        try:
            # Convert bytes to image
            image_pil = Image.open(io.BytesIO(image_data))
            image_np = np.array(image_pil)
            
            # Convert to RGB (MediaPipe requires RGB)
            if len(image_np.shape) == 3 and image_np.shape[2] == 3:
                image_rgb = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
            else:
                image_rgb = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
            
            # Process image with MediaPipe
            results = self.face_mesh.process(image_rgb)
            
            if not results.multi_face_landmarks:
                return {
                    'emotion': 'neutral',
                    'confidence': 30,
                    'landmarks': {},
                    'faces_detected': 0,
                    'error': 'No faces detected'
                }
            
            # Get first face landmarks
            face_landmarks = results.multi_face_landmarks[0]
            
            # Convert landmarks to numpy array
            h, w = image_rgb.shape[:2]
            landmarks = []
            for landmark in face_landmarks.landmark:
                landmarks.append([landmark.x * w, landmark.y * h])
            landmarks = np.array(landmarks)
            
            # Calculate facial features
            mouth_aspect_ratio = self._calculate_mouth_aspect_ratio(landmarks)
            mouth_curvature = self._calculate_mouth_curvature(landmarks)
            left_ear = self._calculate_eye_aspect_ratio(landmarks, is_left=True)
            right_ear = self._calculate_eye_aspect_ratio(landmarks, is_left=False)
            avg_ear = (left_ear + right_ear) / 2
            eyebrow_position = self._calculate_eyebrow_position(landmarks)
            
            # Initialize emotion scores
            emotion_scores = {
                'happy': 0.0,
                'sad': 0.0,
                'angry': 0.0,
                'fearful': 0.0,
                'surprised': 0.0,
                'disgusted': 0.0,
                'neutral': 10.0,
                'calm': 8.0,
                'excited': 0.0,
                'focused': 5.0,
                'anxious': 0.0,
                'stressed': 0.0,
                'contemplative': 5.0,
                'energetic': 0.0,
                'cry': 0.0
            }
            
            # EMOTION DETECTION LOGIC BASED ON PRECISE MEASUREMENTS
            
            # 1. HAPPY: Positive mouth curvature (smile)
            if mouth_curvature > 0.01:  # Smile detected
                smile_strength = min(mouth_curvature * 1000, 100)
                emotion_scores['happy'] = 60 + smile_strength * 0.3
                emotion_scores['excited'] = 40 + smile_strength * 0.2
                emotion_scores['neutral'] = 5
                
                if mouth_aspect_ratio > 0.3:  # Open mouth smile
                    emotion_scores['excited'] = 70
                    emotion_scores['energetic'] = 50
            
            # 2. SAD: Negative mouth curvature (frown)
            elif mouth_curvature < -0.01:  # Frown detected
                frown_strength = min(abs(mouth_curvature) * 1000, 100)
                emotion_scores['sad'] = 65 + frown_strength * 0.3
                emotion_scores['contemplative'] = 35
                emotion_scores['neutral'] = 5
                
                if eyebrow_position < 0.02:  # Lowered eyebrows
                    emotion_scores['sad'] = 80
                    emotion_scores['anxious'] = 40
                
                if avg_ear < 0.015:  # Closed/squinted eyes
                    emotion_scores['cry'] = 75
                    emotion_scores['sad'] = 70
            
            # 3. ANGRY: Lowered eyebrows + neutral/frown mouth
            elif eyebrow_position < 0.015 and mouth_curvature >= -0.01:
                emotion_scores['angry'] = 70
                emotion_scores['stressed'] = 50
                emotion_scores['focused'] = 35
                emotion_scores['neutral'] = 8
                
                if mouth_aspect_ratio > 0.25:  # Mouth open (shouting)
                    emotion_scores['angry'] = 85
                    emotion_scores['frustrated'] = 60
            
            # 4. SURPRISED/FEARFUL: Raised eyebrows + wide eyes + open mouth
            elif eyebrow_position > 0.03 and mouth_aspect_ratio > 0.4:
                emotion_scores['surprised'] = 75
                emotion_scores['fearful'] = 45
                emotion_scores['excited'] = 30
                emotion_scores['neutral'] = 5
            
            # 5. FEARFUL/ANXIOUS: Raised eyebrows + wide eyes + closed mouth
            elif eyebrow_position > 0.03 and mouth_aspect_ratio < 0.3:
                emotion_scores['fearful'] = 70
                emotion_scores['anxious'] = 60
                emotion_scores['stressed'] = 40
                emotion_scores['neutral'] = 5
            
            # 6. CALM/NEUTRAL: Minimal facial movement
            else:
                emotion_scores['neutral'] = 50
                emotion_scores['calm'] = 45
                emotion_scores['focused'] = 35
                emotion_scores['contemplative'] = 25
            
            # Normalize scores to sum to 100
            total_score = sum(emotion_scores.values())
            if total_score > 0:
                emotion_scores = {k: (v / total_score) * 100 for k, v in emotion_scores.items()}
            
            # Filter out very low scores (< 5%)
            emotion_scores = {k: round(v, 2) for k, v in emotion_scores.items() if v >= 5.0}
            
            # Determine dominant emotion
            detected_emotion = max(emotion_scores.items(), key=lambda x: x[1])[0]
            confidence = emotion_scores[detected_emotion]
            
            result = {
                'emotion': detected_emotion,
                'confidence': round(confidence, 2),
                'emotion_scores': emotion_scores,
                'landmarks': {
                    'mouth_aspect_ratio': round(mouth_aspect_ratio, 4),
                    'mouth_curvature': round(mouth_curvature, 4),
                    'eye_aspect_ratio': round(avg_ear, 4),
                    'eyebrow_position': round(eyebrow_position, 4),
                    'total_landmarks': len(landmarks)
                },
                'faces_detected': 1,
                'model_used': 'MediaPipe_FaceMesh_v1'
            }
            
            logger.info(f"MediaPipe Analysis: {detected_emotion} (Mouth={mouth_curvature:.4f}, Brows={eyebrow_position:.4f}, MAR={mouth_aspect_ratio:.4f})")
            return result
            
        except Exception as e:
            logger.error(f"Error in MediaPipe facial analysis: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'emotion': 'neutral',
                'confidence': 30,
                'error': str(e)
            }
    
    def get_supported_emotions(self):
        return self.emotion_labels

