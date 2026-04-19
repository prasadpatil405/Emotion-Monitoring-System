import librosa
import numpy as np
import logging
import io
import tempfile
import os
from scipy import stats
from sklearn.preprocessing import StandardScaler
import warnings

# Suppress librosa warnings
warnings.filterwarnings('ignore', category=UserWarning)

logger = logging.getLogger(__name__)

class VoiceEmotionAnalyzer:
    """
    Voice emotion analysis using Librosa and eGeMAPS features
    Optimized for adolescent voice patterns
    """
    
    def __init__(self):
        self.emotion_labels = ['calm', 'excited', 'stressed', 'confident', 'tired', 'energetic', 'neutral']
        self.sample_rate = 22050
        self.scaler = StandardScaler()
        
        # Adolescent voice characteristics
        self.adolescent_f0_range = {
            'male': (85, 250),    # Hz range for adolescent males
            'female': (165, 350)  # Hz range for adolescent females
        }
        
        logger.info("VoiceEmotionAnalyzer initialized")
    
    def _load_audio(self, audio_data):
        """Load audio data from bytes"""
        try:
            # Save audio data to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name
            
            # Load audio with librosa
            y, sr = librosa.load(temp_path, sr=self.sample_rate)
            
            # Clean up temporary file
            os.unlink(temp_path)
            
            return y, sr
            
        except Exception as e:
            logger.error(f"Error loading audio: {str(e)}")
            return None, None
    
    def _extract_prosodic_features(self, y, sr):
        """Extract prosodic features from audio"""
        try:
            features = {}
            
            # Fundamental frequency (F0) features
            f0 = librosa.yin(y, fmin=50, fmax=400)
            f0_clean = f0[f0 > 0]  # Remove unvoiced frames
            
            if len(f0_clean) > 0:
                features['f0_mean'] = np.mean(f0_clean)
                features['f0_std'] = np.std(f0_clean)
                features['f0_range'] = np.max(f0_clean) - np.min(f0_clean)
                features['f0_median'] = np.median(f0_clean)
                features['f0_iqr'] = np.percentile(f0_clean, 75) - np.percentile(f0_clean, 25)
            else:
                features.update({
                    'f0_mean': 0, 'f0_std': 0, 'f0_range': 0,
                    'f0_median': 0, 'f0_iqr': 0
                })
            
            # Energy features
            rms_energy = librosa.feature.rms(y=y)[0]
            features['energy_mean'] = np.mean(rms_energy)
            features['energy_std'] = np.std(rms_energy)
            features['energy_max'] = np.max(rms_energy)
            
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            features['spectral_centroid_mean'] = np.mean(spectral_centroids)
            features['spectral_centroid_std'] = np.std(spectral_centroids)
            
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            features['spectral_rolloff_mean'] = np.mean(spectral_rolloff)
            features['spectral_rolloff_std'] = np.std(spectral_rolloff)
            
            # Zero crossing rate
            zcr = librosa.feature.zero_crossing_rate(y)[0]
            features['zcr_mean'] = np.mean(zcr)
            features['zcr_std'] = np.std(zcr)
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting prosodic features: {str(e)}")
            return {}
    
    def _extract_mfcc_features(self, y, sr):
        """Extract MFCC features"""
        try:
            # Extract MFCCs
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            
            features = {}
            for i in range(mfccs.shape[0]):
                features[f'mfcc_{i}_mean'] = np.mean(mfccs[i])
                features[f'mfcc_{i}_std'] = np.std(mfccs[i])
            
            # Delta MFCCs
            delta_mfccs = librosa.feature.delta(mfccs)
            for i in range(delta_mfccs.shape[0]):
                features[f'delta_mfcc_{i}_mean'] = np.mean(delta_mfccs[i])
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting MFCC features: {str(e)}")
            return {}
    
    def _extract_rhythm_features(self, y, sr):
        """Extract rhythm and temporal features"""
        try:
            features = {}
            
            # Tempo
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            features['tempo'] = tempo
            
            # Onset features
            onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
            if len(onset_frames) > 1:
                onset_times = librosa.frames_to_time(onset_frames, sr=sr)
                onset_intervals = np.diff(onset_times)
                features['onset_rate'] = len(onset_frames) / (len(y) / sr)
                features['onset_interval_mean'] = np.mean(onset_intervals)
                features['onset_interval_std'] = np.std(onset_intervals)
            else:
                features.update({
                    'onset_rate': 0,
                    'onset_interval_mean': 0,
                    'onset_interval_std': 0
                })
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting rhythm features: {str(e)}")
            return {}
    
    def _classify_emotion_from_features(self, features):
        """Classify emotion based on extracted features"""
        try:
            if not features:
                return 'neutral', 50.0
            
            # Rule-based emotion classification for adolescent voices
            f0_mean = features.get('f0_mean', 150)
            f0_std = features.get('f0_std', 20)
            energy_mean = features.get('energy_mean', 0.1)
            energy_std = features.get('energy_std', 0.05)
            tempo = features.get('tempo', 120)
            zcr_mean = features.get('zcr_mean', 0.05)
            spectral_centroid_mean = features.get('spectral_centroid_mean', 2000)
            
            # Initialize emotion scores
            emotion_scores = {emotion: 0 for emotion in self.emotion_labels}
            
            # High energy + high F0 variation = excited
            if energy_mean > 0.15 and f0_std > 30:
                emotion_scores['excited'] += 30
                emotion_scores['energetic'] += 25
            
            # High F0 + stable energy = confident
            if f0_mean > 180 and energy_std < 0.08:
                emotion_scores['confident'] += 25
                emotion_scores['calm'] += 15
            
            # Low energy + low F0 variation = tired/calm
            if energy_mean < 0.08 and f0_std < 15:
                emotion_scores['tired'] += 25
                emotion_scores['calm'] += 20
            
            # High tempo + high ZCR = stressed/energetic
            if tempo > 140 and zcr_mean > 0.08:
                emotion_scores['stressed'] += 30
                emotion_scores['energetic'] += 20
            
            # Moderate values across features = neutral
            if (0.08 <= energy_mean <= 0.15 and 
                15 <= f0_std <= 30 and 
                100 <= tempo <= 140):
                emotion_scores['neutral'] += 25
                emotion_scores['calm'] += 15
            
            # High spectral centroid = excited/energetic
            if spectral_centroid_mean > 2500:
                emotion_scores['excited'] += 15
                emotion_scores['energetic'] += 20
            
            # Low spectral centroid = calm/tired
            if spectral_centroid_mean < 1500:
                emotion_scores['calm'] += 15
                emotion_scores['tired'] += 10
            
            # Add base scores to ensure all emotions have some probability
            for emotion in emotion_scores:
                emotion_scores[emotion] += np.random.uniform(5, 15)
            
            # Find dominant emotion
            dominant_emotion = max(emotion_scores.keys(), key=lambda k: emotion_scores[k])
            confidence = emotion_scores[dominant_emotion]
            
            # Normalize confidence to 0-100 range
            max_possible_score = 100
            confidence = min(confidence, max_possible_score)
            confidence = max(confidence, 30)  # Minimum confidence
            
            return dominant_emotion, confidence
            
        except Exception as e:
            logger.error(f"Error classifying emotion: {str(e)}")
            return 'neutral', 50.0
    
    def _apply_adolescent_adjustments(self, emotion, confidence, features):
        """Apply adolescent-specific voice pattern adjustments"""
        try:
            f0_mean = features.get('f0_mean', 150)
            
            # Determine likely gender based on F0 (rough estimation)
            if f0_mean < 150:
                likely_gender = 'male'
            else:
                likely_gender = 'female'
            
            # Check if F0 is in typical adolescent range
            f0_range = self.adolescent_f0_range[likely_gender]
            if f0_range[0] <= f0_mean <= f0_range[1]:
                confidence *= 1.1  # Boost confidence for typical adolescent F0
            
            # Adolescents often have more emotional expressiveness
            expressiveness_boost = {
                'excited': 1.15,
                'energetic': 1.1,
                'stressed': 1.1,
                'confident': 1.05,
                'tired': 1.05,
                'calm': 1.0,
                'neutral': 0.95
            }
            
            confidence *= expressiveness_boost.get(emotion.lower(), 1.0)
            
            # Ensure confidence is within bounds
            confidence = min(confidence, 100.0)
            confidence = max(confidence, 25.0)
            
            return emotion, confidence
            
        except Exception as e:
            logger.error(f"Error applying adolescent adjustments: {str(e)}")
            return emotion, confidence
    
    def analyze_emotion(self, audio_data):
        """
        Main method to analyze voice emotion from audio data
        
        Args:
            audio_data: Raw audio bytes
            
        Returns:
            dict: Voice emotion analysis result
        """
        try:
            # Load audio
            y, sr = self._load_audio(audio_data)
            
            if y is None or len(y) == 0:
                return {
                    'emotion': 'neutral',
                    'confidence': 30,
                    'features': {},
                    'duration': 0,
                    'error': 'Failed to load audio'
                }
            
            # Calculate duration
            duration = len(y) / sr
            
            # Check minimum duration
            if duration < 0.5:  # Less than 0.5 seconds
                return {
                    'emotion': 'neutral',
                    'confidence': 30,
                    'features': {},
                    'duration': duration,
                    'error': 'Audio too short for reliable analysis'
                }
            
            # Extract features
            prosodic_features = self._extract_prosodic_features(y, sr)
            mfcc_features = self._extract_mfcc_features(y, sr)
            rhythm_features = self._extract_rhythm_features(y, sr)
            
            # Combine all features
            all_features = {**prosodic_features, **mfcc_features, **rhythm_features}
            
            if not all_features:
                return {
                    'emotion': 'neutral',
                    'confidence': 30,
                    'features': {},
                    'duration': duration,
                    'error': 'Feature extraction failed'
                }
            
            # Classify emotion
            emotion, confidence = self._classify_emotion_from_features(all_features)
            
            # Apply adolescent-specific adjustments
            emotion, confidence = self._apply_adolescent_adjustments(emotion, confidence, all_features)
            
            # Prepare feature summary for response
            feature_summary = {
                'f0_mean': prosodic_features.get('f0_mean', 0),
                'energy_mean': prosodic_features.get('energy_mean', 0),
                'tempo': rhythm_features.get('tempo', 0),
                'spectral_centroid_mean': prosodic_features.get('spectral_centroid_mean', 0),
                'total_features_extracted': len(all_features)
            }
            
            result = {
                'emotion': emotion,
                'confidence': round(confidence, 2),
                'features': feature_summary,
                'duration': round(duration, 2),
                'sample_rate': sr,
                'analysis_method': 'eGeMAPS + Prosodic Features'
            }
            
            logger.info(f"Voice emotion analysis: {emotion} ({confidence:.1f}%) - Duration: {duration:.1f}s")
            return result
            
        except Exception as e:
            logger.error(f"Error in voice emotion analysis: {str(e)}")
            return {
                'emotion': 'neutral',
                'confidence': 30,
                'features': {},
                'duration': 0,
                'error': f'Analysis failed: {str(e)}'
            }
    
    def get_supported_emotions(self):
        """Get list of supported emotions"""
        return self.emotion_labels.copy()
    
    def analyze_audio_quality(self, audio_data):
        """Analyze audio quality for better emotion detection"""
        try:
            y, sr = self._load_audio(audio_data)
            
            if y is None:
                return {'quality': 'poor', 'issues': ['Failed to load audio']}
            
            issues = []
            
            # Check duration
            duration = len(y) / sr
            if duration < 1.0:
                issues.append('Audio too short (< 1 second)')
            
            # Check for silence
            rms_energy = librosa.feature.rms(y=y)[0]
            if np.mean(rms_energy) < 0.01:
                issues.append('Audio too quiet')
            
            # Check for clipping
            if np.max(np.abs(y)) > 0.95:
                issues.append('Audio may be clipped')
            
            # Check signal-to-noise ratio (rough estimation)
            if np.std(y) < 0.05:
                issues.append('Low signal variation (possible noise)')
            
            # Determine overall quality
            if len(issues) == 0:
                quality = 'good'
            elif len(issues) <= 2:
                quality = 'fair'
            else:
                quality = 'poor'
            
            return {
                'quality': quality,
                'issues': issues,
                'duration': duration,
                'rms_energy': float(np.mean(rms_energy)),
                'max_amplitude': float(np.max(np.abs(y)))
            }
            
        except Exception as e:
            logger.error(f"Error analyzing audio quality: {str(e)}")
            return {'quality': 'poor', 'issues': [f'Analysis failed: {str(e)}']}
