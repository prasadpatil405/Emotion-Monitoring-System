import numpy as np
from datetime import datetime
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class EmotionFusionEngine:
    """
    Advanced emotion fusion engine for multi-modal emotion analysis
    specifically designed for adolescent emotion patterns
    """
    
    def __init__(self):
        # Emotion mapping for consistency
        self.emotion_mapping = {
            # Facial emotions
            'angry': 'angry',
            'disgust': 'disgusted', 
            'fear': 'fearful',
            'happy': 'happy',
            'sad': 'sad',
            'surprise': 'surprised',
            'neutral': 'neutral',
            'cry': 'cry',
            
            # Voice emotions
            'calm': 'calm',
            'excited': 'excited',
            'stressed': 'stressed',
            'confident': 'confident',
            'tired': 'tired',
            'energetic': 'energetic',
            
            # Text sentiments
            'positive': 'positive',
            'negative': 'negative',
        }
        
        # Weights for different modalities
        self.modality_weights = {
            'facial': 0.4,   # 40% weight for facial expressions
            'voice': 0.35,   # 35% weight for voice analysis
            'text': 0.25,    # 25% weight for text sentiment
        }
        
        # Emotion intensity mapping
        self.emotion_intensity = {
            'angry': 0.9, 'excited': 0.9, 'happy': 0.8, 'surprised': 0.8,
            'confident': 0.7, 'energetic': 0.7, 'fearful': 0.6, 'stressed': 0.6,
            'calm': 0.4, 'sad': 0.5, 'tired': 0.3, 'disgusted': 0.5,
            'neutral': 0.2, 'positive': 0.7, 'negative': 0.6,
            'cry': 0.95,
        }
        
        # Emotion compatibility matrix for adolescent patterns
        self.emotion_compatibility = {
            'happy': {'excited': 0.9, 'confident': 0.8, 'energetic': 0.8, 'positive': 0.9},
            'sad': {'tired': 0.7, 'negative': 0.8, 'calm': 0.4, 'cry': 0.8},
            'cry': {'sad': 0.9, 'negative': 0.9, 'stressed': 0.8},
            'angry': {'stressed': 0.8, 'negative': 0.7},
            'calm': {'confident': 0.6, 'tired': 0.5, 'neutral': 0.7},
            'excited': {'energetic': 0.9, 'happy': 0.8, 'confident': 0.7},
            'stressed': {'tired': 0.6, 'angry': 0.7, 'negative': 0.6},
            'confident': {'calm': 0.6, 'happy': 0.7, 'positive': 0.8},
            'energetic': {'excited': 0.9, 'happy': 0.8},
            'neutral': {'calm': 0.8},
            'positive': {'happy': 0.9, 'confident': 0.8, 'excited': 0.7},
            'negative': {'sad': 0.8, 'angry': 0.7, 'stressed': 0.6},
        }
        
        logger.info("EmotionFusionEngine initialized successfully")
    
    def normalize_emotion(self, emotion: str) -> str:
        """Normalize emotion names to consistent format"""
        if not emotion:
            return 'neutral'
        
        normalized = emotion.lower().strip()
        return self.emotion_mapping.get(normalized, normalized)
    
    def get_compatibility_score(self, emotion1: str, emotion2: str) -> float:
        """Calculate compatibility score between two emotions"""
        if not emotion1 or not emotion2:
            return 0.0
        
        comp1 = self.emotion_compatibility.get(emotion1, {}).get(emotion2, 0)
        comp2 = self.emotion_compatibility.get(emotion2, {}).get(emotion1, 0)
        return max(comp1, comp2)
    
    def apply_adolescent_adjustments(self, emotion_scores: Dict[str, float]) -> Dict[str, float]:
        """Apply adolescent-specific emotion adjustments"""
        adjusted = emotion_scores.copy()
        
        # Adolescents tend to have more intense emotions
        intensity_multiplier = 1.2
        
        # Boost emotions common in adolescents
        adolescent_emotions = ['excited', 'stressed', 'confident', 'energetic']
        
        for emotion in adolescent_emotions:
            if emotion in adjusted:
                adjusted[emotion] *= intensity_multiplier
        
        # Normalize to ensure values don't exceed 100
        max_value = max(adjusted.values()) if adjusted else 1
        if max_value > 100:
            normalization_factor = 100 / max_value
            for emotion in adjusted:
                adjusted[emotion] *= normalization_factor
        
        return adjusted
    
    def fuse_emotions(self, 
                     facial_emotion: Optional[Dict[str, Any]] = None,
                     voice_emotion: Optional[Dict[str, Any]] = None, 
                     text_emotion: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Main emotion fusion algorithm
        """
        try:
            emotion_inputs = []
            sources = {}
            
            # Collect emotion inputs from different modalities
            if facial_emotion:
                normalized_emotion = self.normalize_emotion(facial_emotion.get('emotion', ''))
                confidence = facial_emotion.get('confidence', 0)
                emotion_inputs.append({
                    'emotion': normalized_emotion,
                    'confidence': confidence,
                    'weight': self.modality_weights['facial']
                })
                sources['facial'] = normalized_emotion
            
            if voice_emotion:
                normalized_emotion = self.normalize_emotion(voice_emotion.get('emotion', ''))
                confidence = voice_emotion.get('confidence', 0)
                emotion_inputs.append({
                    'emotion': normalized_emotion,
                    'confidence': confidence,
                    'weight': self.modality_weights['voice']
                })
                sources['voice'] = normalized_emotion
            
            if text_emotion:
                normalized_emotion = self.normalize_emotion(text_emotion.get('sentiment', ''))
                confidence = text_emotion.get('confidence', 0)
                emotion_inputs.append({
                    'emotion': normalized_emotion,
                    'confidence': confidence,
                    'weight': self.modality_weights['text']
                })
                sources['text'] = normalized_emotion
            
            # Default fallback if no inputs
            if not emotion_inputs:
                return {
                    'emotion': 'neutral',
                    'confidence': 50,
                    'breakdown': {'neutral': 50},
                    'sources': {},
                    'timestamp': self.get_timestamp()
                }
            
            # Calculate weighted emotion scores
            emotion_scores = {}
            total_weight = 0
            
            for input_data in emotion_inputs:
                score = (input_data['confidence'] * input_data['weight']) / 100
                emotion = input_data['emotion']
                emotion_scores[emotion] = emotion_scores.get(emotion, 0) + score
                total_weight += input_data['weight']
            
            # Apply compatibility bonuses for consistent emotions across modalities
            if len(emotion_inputs) > 1:
                for i in range(len(emotion_inputs)):
                    for j in range(i + 1, len(emotion_inputs)):
                        emotion1 = emotion_inputs[i]['emotion']
                        emotion2 = emotion_inputs[j]['emotion']
                        compatibility = self.get_compatibility_score(emotion1, emotion2)
                        
                        if compatibility > 0.5:
                            bonus = compatibility * 0.1  # 10% max bonus
                            emotion_scores[emotion1] += bonus * emotion_inputs[i]['confidence'] / 100
                            emotion_scores[emotion2] += bonus * emotion_inputs[j]['confidence'] / 100
            
            # Normalize scores to percentages
            if not emotion_scores:
                return None
            
            max_score = max(emotion_scores.values())
            normalized_scores = {}
            
            for emotion, score in emotion_scores.items():
                normalized_scores[emotion] = round((score / max_score) * 100)
            
            # Apply adolescent-specific adjustments
            adjusted_scores = self.apply_adolescent_adjustments(normalized_scores)
            
            # Find dominant emotion
            dominant_emotion = max(adjusted_scores.keys(), key=lambda k: adjusted_scores[k])
            dominant_confidence = min(round(adjusted_scores[dominant_emotion]), 100)
            
            return {
                'emotion': dominant_emotion,
                'confidence': dominant_confidence,
                'breakdown': adjusted_scores,
                'sources': sources,
                'timestamp': self.get_timestamp(),
                'modalities_used': len(emotion_inputs)
            }
            
        except Exception as e:
            logger.error(f"Error in emotion fusion: {str(e)}")
            return None
    
    def analyze_autism_patterns(self, sessions: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Analyze autism-specific emotion patterns from session data
        """
        try:
            if not sessions:
                return {
                    'patterns': [],
                    'recommendations': [],
                    'analysis_summary': 'Insufficient data for pattern analysis'
                }
            
            patterns = []
            recommendations = []
            
            # Extract emotions from sessions
            emotions = [session.get('fusedEmotion', '').lower() for session in sessions if session.get('fusedEmotion')]
            
            if not emotions:
                return {
                    'patterns': ['No emotion data available'],
                    'recommendations': ['Start regular emotion monitoring'],
                    'analysis_summary': 'No analyzable emotion data found'
                }
            
            # Analyze emotion variability
            unique_emotions = set(emotions)
            
            if len(unique_emotions) == 1 and len(sessions) > 5:
                patterns.append('Limited emotional range detected')
                recommendations.append('Consider activities that promote emotional variety')
            
            # Check for high stress frequency
            stress_emotions = ['stressed', 'overwhelmed', 'anxious', 'angry']
            stressed_count = sum(1 for emotion in emotions if emotion in stress_emotions)
            stress_ratio = stressed_count / len(emotions)
            
            if stress_ratio > 0.4:
                patterns.append(f'High stress frequency detected ({stress_ratio:.1%})')
                recommendations.append('Consider sensory regulation strategies and stress management techniques')
            
            # Look for potential masking behaviors
            mismatch_count = 0
            for session in sessions:
                raw_data = session.get('rawData')
                if raw_data:
                    facial = raw_data.get('facial', {})
                    voice = raw_data.get('voice', {})
                    
                    if facial and voice:
                        facial_emotion = facial.get('emotion', '').lower()
                        voice_emotion = voice.get('emotion', '').lower()
                        
                        facial_positive = facial_emotion in ['happy', 'excited']
                        voice_negative = voice_emotion in ['sad', 'stressed', 'tired']
                        
                        if facial_positive and voice_negative:
                            mismatch_count += 1
            
            mismatch_ratio = mismatch_count / len(sessions)
            if mismatch_ratio > 0.3:
                patterns.append(f'Potential emotion masking detected ({mismatch_ratio:.1%})')
                recommendations.append('Focus on authentic emotional expression and self-awareness')
            
            # Analyze emotion transition patterns
            if len(emotions) > 3:
                rapid_changes = 0
                for i in range(len(emotions) - 1):
                    curr_emotion = emotions[i]
                    next_emotion = emotions[i + 1]
                    
                    # Check for incompatible emotion transitions
                    compatibility = self.get_compatibility_score(curr_emotion, next_emotion)
                    if compatibility < 0.3:
                        rapid_changes += 1
                
                rapid_change_ratio = rapid_changes / (len(emotions) - 1)
                if rapid_change_ratio > 0.5:
                    patterns.append(f'Frequent rapid emotion changes detected ({rapid_change_ratio:.1%})')
                    recommendations.append('Consider emotional regulation techniques and mindfulness practices')
            
            # Analyze confidence patterns
            confidences = [session.get('fusedConfidence', 0) for session in sessions]
            if confidences:
                avg_confidence = sum(confidences) / len(confidences)
                if avg_confidence < 60:
                    patterns.append(f'Low emotion detection confidence ({avg_confidence:.1f}%)')
                    recommendations.append('Ensure good lighting and clear audio for better emotion detection')
            
            # Generate analysis summary
            summary = f"Analyzed {len(sessions)} emotion sessions. "
            if patterns:
                summary += f"Found {len(patterns)} noteworthy patterns."
            else:
                summary += "No concerning patterns detected."
            
            return {
                'patterns': patterns,
                'recommendations': recommendations,
                'analysis_summary': summary,
                'session_count': len(sessions),
                'unique_emotions': len(unique_emotions),
                'stress_ratio': stress_ratio,
                'average_confidence': avg_confidence if confidences else 0
            }
            
        except Exception as e:
            logger.error(f"Error in autism pattern analysis: {str(e)}")
            return None
    
    def calculate_emotional_trend(self, sessions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate emotional trend from historical session data
        """
        try:
            if not sessions:
                return {'trend': 'stable', 'score': 50, 'dominant': 'neutral'}
            
            # Sort sessions by timestamp
            sorted_sessions = sorted(sessions, key=lambda x: x.get('timestamp', ''))
            
            # Define positive and negative emotions
            positive_emotions = ['happy', 'excited', 'confident', 'calm', 'positive', 'energetic']
            negative_emotions = ['sad', 'angry', 'stressed', 'fearful', 'negative', 'tired']
            
            positive_sum = 0
            negative_sum = 0
            emotion_counts = {}
            
            for session in sorted_sessions:
                emotion = session.get('fusedEmotion', '').lower()
                confidence = session.get('fusedConfidence', 0)
                
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
                
                if emotion in positive_emotions:
                    positive_sum += confidence
                elif emotion in negative_emotions:
                    negative_sum += confidence
            
            # Find dominant emotion
            dominant_emotion = max(emotion_counts.keys(), key=lambda k: emotion_counts[k]) if emotion_counts else 'neutral'
            
            # Calculate overall mood score
            total_emotional_score = positive_sum + negative_sum
            mood_score = round((positive_sum / total_emotional_score) * 100) if total_emotional_score > 0 else 50
            
            # Determine trend
            trend = 'stable'
            
            if len(sorted_sessions) >= 3:
                recent_sessions = sorted_sessions[-3:]
                older_sessions = sorted_sessions[:-3]
                
                if older_sessions:
                    recent_positive = sum(1 for s in recent_sessions if s.get('fusedEmotion', '').lower() in positive_emotions)
                    recent_positive_ratio = recent_positive / len(recent_sessions)
                    
                    older_positive = sum(1 for s in older_sessions if s.get('fusedEmotion', '').lower() in positive_emotions)
                    older_positive_ratio = older_positive / len(older_sessions)
                    
                    if recent_positive_ratio > older_positive_ratio + 0.2:
                        trend = 'improving'
                    elif recent_positive_ratio < older_positive_ratio - 0.2:
                        trend = 'declining'
            
            return {
                'trend': trend,
                'score': mood_score,
                'dominant': dominant_emotion
            }
            
        except Exception as e:
            logger.error(f"Error calculating emotional trend: {str(e)}")
            return {'trend': 'stable', 'score': 50, 'dominant': 'neutral'}
    
    def get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        return datetime.now().isoformat()
    
    def get_emotion_suggestions(self, emotion: str, confidence: float) -> Dict[str, List[str]]:
        """
        Generate emotion-based suggestions for music, activities, and quotes
        """
        suggestions = {
            'music': [],
            'activities': [],
            'quotes': []
        }
        
        emotion_lower = emotion.lower()
        
        if emotion_lower in ['happy', 'excited', 'positive']:
            suggestions['music'] = ['Upbeat Pop', 'Feel-Good Indie', 'Dance Hits']
            suggestions['activities'] = ['Share with friends', 'Creative projects', 'Outdoor activities']
            suggestions['quotes'] = ['happiness', 'success', 'positivity']
        elif emotion_lower in ['sad', 'negative']:
            suggestions['music'] = ['Calming Instrumentals', 'Peaceful Acoustic', 'Healing Sounds']
            suggestions['activities'] = ['Journaling', 'Meditation', 'Talk to someone']
            suggestions['quotes'] = ['resilience', 'growth', 'hope']
        elif emotion_lower in ['stressed', 'angry']:
            suggestions['music'] = ['Relaxing Nature Sounds', 'Breathing Exercises', 'Calm Classical']
            suggestions['activities'] = ['Deep breathing', 'Physical exercise', 'Progressive relaxation']
            suggestions['quotes'] = ['peace', 'strength', 'patience']
        elif emotion_lower in ['calm', 'neutral']:
            suggestions['music'] = ['Ambient Soundscapes', 'Lo-fi Hip Hop', 'Mindful Music']
            suggestions['activities'] = ['Reading', 'Gentle yoga', 'Nature walks']
            suggestions['quotes'] = ['mindfulness', 'balance', 'tranquility']
        elif emotion_lower in ['energetic', 'confident']:
            suggestions['music'] = ['Motivational Rock', 'Workout Beats', 'Power Pop']
            suggestions['activities'] = ['Exercise', 'Learn something new', 'Set goals']
            suggestions['quotes'] = ['motivation', 'achievement', 'confidence']
        else:
            suggestions['music'] = ['Discover New Music', 'Mood-based Playlists']
            suggestions['activities'] = ['Self-reflection', 'Creative expression']
            suggestions['quotes'] = ['self-discovery', 'growth']
        
        return suggestions
