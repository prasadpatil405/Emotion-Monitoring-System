import logging
import re
import string
from typing import Dict, List, Optional, Any
import numpy as np

try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logging.warning("Transformers library not available. Using fallback sentiment analysis.")

logger = logging.getLogger(__name__)

class TextSentimentAnalyzer:
    """
    Text sentiment analysis using BERT/transformers with adolescent-specific patterns
    Includes slang detection and adolescent communication patterns
    """
    
    def __init__(self):
        self.sentiment_labels = ['positive', 'negative', 'neutral']
        self.sentiment_pipeline = None
        self.model_loaded = False
        
        # Adolescent-specific slang and expressions
        self.adolescent_positive_slang = {
            'lit': 2.0, 'fire': 2.0, 'vibes': 1.5, 'slaps': 2.0, 'periodt': 1.8,
            'bestie': 1.5, 'slay': 2.0, 'iconic': 1.8, 'stan': 1.5, 'queen': 1.7,
            'king': 1.7, 'mood': 1.0, 'bet': 1.2, 'facts': 1.3, 'no cap': 1.5,
            'fr': 1.2, 'frfr': 1.3, 'lowkey': 0.8, 'highkey': 1.5, 'valid': 1.4,
            'sending me': 1.8, 'im dead': 1.5, 'crying': 1.2, 'screaming': 1.3,
            'obsessed': 1.6, 'living for': 1.7, 'here for it': 1.5
        }
        
        self.adolescent_negative_slang = {
            'mid': -1.5, 'cap': -1.0, 'sus': -1.2, 'cringe': -1.8, 'ick': -1.5,
            'toxic': -2.0, 'pressed': -1.3, 'salty': -1.2, 'basic': -1.0,
            'fake': -1.5, 'trash': -1.8, 'wack': -1.5, 'dead': -1.0,
            'cancelled': -2.0, 'problematic': -1.8, 'annoying': -1.3,
            'boring': -1.2, 'lame': -1.3, 'cringe': -1.8
        }
        
        self.emotion_keywords = {
            'positive': [
                'happy', 'joy', 'excited', 'amazing', 'awesome', 'great', 'wonderful',
                'fantastic', 'brilliant', 'excellent', 'perfect', 'beautiful', 'love',
                'adore', 'thrilled', 'delighted', 'cheerful', 'optimistic', 'confident'
            ],
            'negative': [
                'sad', 'angry', 'frustrated', 'upset', 'disappointed', 'worried',
                'anxious', 'depressed', 'annoyed', 'irritated', 'furious', 'miserable',
                'devastated', 'heartbroken', 'stressed', 'overwhelmed', 'tired', 'exhausted'
            ],
            'neutral': [
                'okay', 'fine', 'alright', 'normal', 'regular', 'usual', 'average',
                'standard', 'typical', 'ordinary', 'calm', 'peaceful', 'quiet'
            ]
        }
        
        # Initialize sentiment model
        self._load_sentiment_model()
        
        logger.info(f"TextSentimentAnalyzer initialized. Model loaded: {self.model_loaded}")
    
    def _load_sentiment_model(self):
        """Load sentiment analysis model"""
        try:
            if TRANSFORMERS_AVAILABLE:
                # Try to load a lightweight sentiment model
                model_name = "cardiffnlp/twitter-roberta-base-sentiment-latest"
                try:
                    self.sentiment_pipeline = pipeline(
                        "sentiment-analysis",
                        model=model_name,
                        tokenizer=model_name,
                        return_all_scores=True
                    )
                    self.model_loaded = True
                    logger.info(f"Loaded sentiment model: {model_name}")
                except Exception as e:
                    logger.warning(f"Failed to load {model_name}, trying fallback model")
                    # Fallback to default model
                    self.sentiment_pipeline = pipeline(
                        "sentiment-analysis",
                        return_all_scores=True
                    )
                    self.model_loaded = True
                    logger.info("Loaded default sentiment model")
            else:
                logger.warning("Transformers not available, using rule-based sentiment analysis")
                self.model_loaded = False
                
        except Exception as e:
            logger.error(f"Error loading sentiment model: {str(e)}")
            self.sentiment_pipeline = None
            self.model_loaded = False
    
    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for sentiment analysis"""
        try:
            # Convert to lowercase
            text = text.lower()
            
            # Handle common adolescent text patterns
            text = re.sub(r'(.)\1{2,}', r'\1\1', text)  # Reduce repeated characters (e.g., "sooooo" -> "soo")
            text = re.sub(r'[^\w\s]', ' ', text)  # Remove punctuation except spaces
            text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
            text = text.strip()
            
            return text
            
        except Exception as e:
            logger.error(f"Error preprocessing text: {str(e)}")
            return text
    
    def _analyze_slang_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze sentiment based on adolescent slang"""
        try:
            text_lower = text.lower()
            positive_score = 0.0
            negative_score = 0.0
            matches = 0
            
            # Check positive slang
            for slang, weight in self.adolescent_positive_slang.items():
                if slang in text_lower:
                    positive_score += weight
                    matches += 1
            
            # Check negative slang
            for slang, weight in self.adolescent_negative_slang.items():
                if slang in text_lower:
                    negative_score += abs(weight)
                    matches += 1
            
            # Normalize scores
            if matches > 0:
                positive_score /= matches
                negative_score /= matches
            
            total_score = positive_score + negative_score
            if total_score > 0:
                positive_ratio = positive_score / total_score
                negative_ratio = negative_score / total_score
                neutral_ratio = max(0, 1 - positive_ratio - negative_ratio)
            else:
                positive_ratio = negative_ratio = neutral_ratio = 0.33
            
            return {
                'positive': positive_ratio,
                'negative': negative_ratio,
                'neutral': neutral_ratio,
                'slang_matches': matches
            }
            
        except Exception as e:
            logger.error(f"Error analyzing slang sentiment: {str(e)}")
            return {'positive': 0.33, 'negative': 0.33, 'neutral': 0.33, 'slang_matches': 0}
    
    def _analyze_keyword_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze sentiment based on emotion keywords"""
        try:
            text_lower = text.lower()
            scores = {'positive': 0, 'negative': 0, 'neutral': 0}
            
            for sentiment, keywords in self.emotion_keywords.items():
                for keyword in keywords:
                    if keyword in text_lower:
                        scores[sentiment] += 1
            
            total_matches = sum(scores.values())
            if total_matches > 0:
                for sentiment in scores:
                    scores[sentiment] /= total_matches
            else:
                scores = {'positive': 0.33, 'negative': 0.33, 'neutral': 0.33}
            
            return scores
            
        except Exception as e:
            logger.error(f"Error analyzing keyword sentiment: {str(e)}")
            return {'positive': 0.33, 'negative': 0.33, 'neutral': 0.33}
    
    def _rule_based_sentiment(self, text: str) -> Dict[str, Any]:
        """Fallback rule-based sentiment analysis"""
        try:
            # Combine slang and keyword analysis
            slang_scores = self._analyze_slang_sentiment(text)
            keyword_scores = self._analyze_keyword_sentiment(text)
            
            # Weight the scores (slang gets higher weight for adolescents)
            slang_weight = 0.7 if slang_scores['slang_matches'] > 0 else 0.3
            keyword_weight = 1.0 - slang_weight
            
            combined_scores = {}
            for sentiment in ['positive', 'negative', 'neutral']:
                combined_scores[sentiment] = (
                    slang_scores[sentiment] * slang_weight +
                    keyword_scores[sentiment] * keyword_weight
                )
            
            # Find dominant sentiment
            dominant_sentiment = max(combined_scores.keys(), key=lambda k: combined_scores[k])
            confidence = combined_scores[dominant_sentiment] * 100
            
            return {
                'sentiment': dominant_sentiment,
                'confidence': confidence,
                'scores': combined_scores,
                'method': 'rule_based'
            }
            
        except Exception as e:
            logger.error(f"Error in rule-based sentiment analysis: {str(e)}")
            return {
                'sentiment': 'neutral',
                'confidence': 50.0,
                'scores': {'positive': 0.33, 'negative': 0.33, 'neutral': 0.33},
                'method': 'fallback'
            }
    
    def _transformer_sentiment(self, text: str) -> Dict[str, Any]:
        """Transformer-based sentiment analysis"""
        try:
            if not self.sentiment_pipeline:
                return self._rule_based_sentiment(text)
            
            # Get predictions from transformer model
            results = self.sentiment_pipeline(text)
            
            # Convert to our format
            scores = {}
            for result in results:
                label = result['label'].lower()
                score = result['score']
                
                # Map model labels to our labels
                if label in ['positive', 'pos']:
                    scores['positive'] = score
                elif label in ['negative', 'neg']:
                    scores['negative'] = score
                elif label in ['neutral']:
                    scores['neutral'] = score
            
            # Ensure all sentiments have scores
            if 'positive' not in scores:
                scores['positive'] = 0.0
            if 'negative' not in scores:
                scores['negative'] = 0.0
            if 'neutral' not in scores:
                scores['neutral'] = 1.0 - scores['positive'] - scores['negative']
            
            # Find dominant sentiment
            dominant_sentiment = max(scores.keys(), key=lambda k: scores[k])
            confidence = scores[dominant_sentiment] * 100
            
            return {
                'sentiment': dominant_sentiment,
                'confidence': confidence,
                'scores': scores,
                'method': 'transformer'
            }
            
        except Exception as e:
            logger.error(f"Error in transformer sentiment analysis: {str(e)}")
            return self._rule_based_sentiment(text)
    
    def _apply_adolescent_adjustments(self, sentiment: str, confidence: float, text: str) -> tuple:
        """Apply adolescent-specific sentiment adjustments"""
        try:
            text_lower = text.lower()
            
            # Adolescents often use hyperbolic language
            hyperbolic_indicators = ['literally', 'actually', 'honestly', 'seriously', 'like']
            hyperbolic_count = sum(1 for indicator in hyperbolic_indicators if indicator in text_lower)
            
            if hyperbolic_count > 0:
                # Increase confidence for hyperbolic language
                confidence *= (1 + hyperbolic_count * 0.05)
            
            # Check for sarcasm indicators (common in adolescent communication)
            sarcasm_indicators = ['sure', 'right', 'totally', 'obviously', 'clearly']
            sarcasm_count = sum(1 for indicator in sarcasm_indicators if indicator in text_lower)
            
            if sarcasm_count > 0 and sentiment == 'positive':
                # Potential sarcasm - reduce confidence
                confidence *= 0.8
                if confidence < 60 and sarcasm_count > 1:
                    # High chance of sarcasm - flip sentiment
                    sentiment = 'negative'
                    confidence = 70.0
            
            # Adolescents often express extreme emotions
            extreme_indicators = ['so', 'very', 'really', 'super', 'totally', 'completely']
            extreme_count = sum(1 for indicator in extreme_indicators if indicator in text_lower)
            
            if extreme_count > 1:
                # Boost confidence for extreme language
                confidence *= 1.1
            
            # Ensure confidence bounds
            confidence = min(confidence, 100.0)
            confidence = max(confidence, 20.0)
            
            return sentiment, confidence
            
        except Exception as e:
            logger.error(f"Error applying adolescent adjustments: {str(e)}")
            return sentiment, confidence
    
    def analyze_sentiment(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Main method to analyze text sentiment
        
        Args:
            text: Input text to analyze
            
        Returns:
            dict: Sentiment analysis result
        """
        try:
            if not text or not text.strip():
                return {
                    'sentiment': 'neutral',
                    'confidence': 30,
                    'analysis': {},
                    'text_length': 0,
                    'error': 'Empty text provided'
                }
            
            # Preprocess text
            processed_text = self._preprocess_text(text)
            
            if len(processed_text) < 2:
                return {
                    'sentiment': 'neutral',
                    'confidence': 30,
                    'analysis': {},
                    'text_length': len(text),
                    'error': 'Text too short after preprocessing'
                }
            
            # Perform sentiment analysis
            if self.model_loaded and self.sentiment_pipeline:
                result = self._transformer_sentiment(processed_text)
            else:
                result = self._rule_based_sentiment(processed_text)
            
            sentiment = result['sentiment']
            confidence = result['confidence']
            
            # Apply adolescent-specific adjustments
            sentiment, confidence = self._apply_adolescent_adjustments(sentiment, confidence, text)
            
            # Additional analysis
            slang_analysis = self._analyze_slang_sentiment(text)
            
            analysis_details = {
                'method': result['method'],
                'scores': result['scores'],
                'slang_matches': slang_analysis.get('slang_matches', 0),
                'text_features': {
                    'length': len(text),
                    'word_count': len(text.split()),
                    'processed_length': len(processed_text),
                    'has_slang': slang_analysis.get('slang_matches', 0) > 0
                }
            }
            
            final_result = {
                'sentiment': sentiment,
                'confidence': round(confidence, 2),
                'analysis': analysis_details,
                'text_length': len(text),
                'processed_text': processed_text if len(processed_text) < 100 else processed_text[:97] + '...'
            }
            
            logger.info(f"Text sentiment analysis: {sentiment} ({confidence:.1f}%) - Length: {len(text)} chars")
            return final_result
            
        except Exception as e:
            logger.error(f"Error in text sentiment analysis: {str(e)}")
            return {
                'sentiment': 'neutral',
                'confidence': 30,
                'analysis': {},
                'text_length': len(text) if text else 0,
                'error': f'Analysis failed: {str(e)}'
            }
    
    def get_supported_sentiments(self):
        """Get list of supported sentiments"""
        return self.sentiment_labels.copy()
    
    def analyze_text_complexity(self, text: str) -> Dict[str, Any]:
        """Analyze text complexity and characteristics"""
        try:
            if not text:
                return {'complexity': 'low', 'features': {}}
            
            words = text.split()
            sentences = text.split('.')
            
            # Calculate basic metrics
            features = {
                'word_count': len(words),
                'sentence_count': len([s for s in sentences if s.strip()]),
                'avg_word_length': np.mean([len(word.strip(string.punctuation)) for word in words]) if words else 0,
                'avg_sentence_length': len(words) / len(sentences) if sentences and sentences[0].strip() else len(words),
            }
            
            # Check for adolescent communication patterns
            patterns = {
                'uses_slang': any(slang in text.lower() for slang in self.adolescent_positive_slang.keys() | self.adolescent_negative_slang.keys()),
                'has_repetition': bool(re.search(r'(.)\1{2,}', text)),
                'has_caps': bool(re.search(r'[A-Z]{2,}', text)),
                'has_punctuation_emphasis': bool(re.search(r'[!?]{2,}', text)),
            }
            
            # Determine complexity
            if features['word_count'] < 5:
                complexity = 'low'
            elif features['word_count'] < 20 and features['avg_word_length'] < 5:
                complexity = 'medium'
            else:
                complexity = 'high'
            
            return {
                'complexity': complexity,
                'features': features,
                'patterns': patterns
            }
            
        except Exception as e:
            logger.error(f"Error analyzing text complexity: {str(e)}")
            return {'complexity': 'low', 'features': {}, 'error': str(e)}
