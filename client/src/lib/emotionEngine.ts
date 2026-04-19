import type { EmotionData } from "@shared/schema";

// Emotion mapping for consistent naming
export const EMOTION_MAPPING = {
  // Facial emotions (from facial detection)
  angry: 'angry',
  disgust: 'disgusted', // Original 'disgust'
  fear: 'fearful', // Original 'fear'
  happy: 'happy',
  sad: 'sad',
  surprise: 'surprised', // Original 'surprise'
  neutral: 'neutral',
  cry: 'cry', // Original 'cry'

  // Voice emotions (from voice analysis)
  calm: 'calm',
  excited: 'excited',
  stressed: 'stressed', // Original 'stressed'
  confident: 'confident',
  tired: 'tired',
  energetic: 'energetic',

  // Text sentiments (from text analysis)
  positive: 'positive',
  negative: 'negative',

  // Expanded emotions (likely from text or facial)
  depressed: 'sad',
  lonely: 'sad',
  anxious: 'fearful',
  overwhelmed: 'stressed',
  hurt: 'sad',
  contemplative: 'calm',
  frustrated: 'angry',
  // The duplicate 'stressed: 'stressed'' is removed here.
  // neutral already mapped above
} as const;

// Emotion weights for fusion algorithm
const EMOTION_WEIGHTS = {
  facial: 0.3,    // 30% weight for facial expressions
  voice: 0.2,     // 20% weight for voice analysis (can be noisy)
  text: 0.6,      // 60% weight for text (User explicit input should be dominant)
};

// Emotion intensity mapping
const EMOTION_INTENSITY: Record<string, number> = {
  // High intensity emotions
  angry: 0.9,
  excited: 0.9,
  happy: 0.8,
  surprised: 0.8,

  // Medium intensity emotions
  confident: 0.7,
  energetic: 0.7,
  fearful: 0.6,
  stressed: 0.6,

  // Low intensity emotions
  calm: 0.4,
  sad: 0.5,
  tired: 0.3,
  disgusted: 0.5,
  neutral: 0.2,
  cry: 0.95,

  // Sentiment-based
  positive: 0.7,
  negative: 0.6,
};

// Emotion compatibility matrix for adolescent-specific patterns
const EMOTION_COMPATIBILITY: Record<string, Record<string, number>> = {
  happy: { excited: 0.9, confident: 0.8, energetic: 0.8, positive: 0.9 },
  sad: { tired: 0.7, negative: 0.8, calm: 0.4, cry: 0.8 },
  cry: { sad: 0.9, negative: 0.9, stressed: 0.8 },
  angry: { stressed: 0.8, negative: 0.7 },
  calm: { confident: 0.6, tired: 0.5, neutral: 0.7 },
  excited: { energetic: 0.9, happy: 0.8, confident: 0.7 },
  stressed: { tired: 0.6, angry: 0.7, negative: 0.6 },
  confident: { calm: 0.6, happy: 0.7, positive: 0.8 },
  energetic: { excited: 0.9, happy: 0.8 },
  neutral: { calm: 0.8 },
  positive: { happy: 0.9, confident: 0.8, excited: 0.7 },
  negative: { sad: 0.8, angry: 0.7, stressed: 0.6, fear: 0.7 },
  fewarful: { anxious: 0.9, stressed: 0.8 },
};

interface EmotionInput {
  emotion: string;
  confidence: number;
  weight: number;
}

interface FusedEmotionResult {
  emotion: string;
  confidence: number;
  breakdown: Record<string, number>;
  sources: {
    facial?: string;
    voice?: string;
    text?: string;
  };
}

/**
 * Normalize emotion names to consistent format
 */
function normalizeEmotion(emotion: string): string {
  const normalized = emotion.toLowerCase().trim();
  return EMOTION_MAPPING[normalized as keyof typeof EMOTION_MAPPING] || normalized;
}

/**
 * Calculate emotion compatibility score between two emotions
 */
function getCompatibilityScore(emotion1: string, emotion2: string): number {
  const comp1 = EMOTION_COMPATIBILITY[emotion1]?.[emotion2] || 0;
  const comp2 = EMOTION_COMPATIBILITY[emotion2]?.[emotion1] || 0;
  return Math.max(comp1, comp2);
}

/**
 * Apply adolescent-specific emotion adjustments
 */
function applyAdolescentAdjustments(emotions: Record<string, number>): Record<string, number> {
  const adjusted = { ...emotions };

  // Adolescents tend to have more intense emotions
  const intensityMultiplier = 1.2;

  // Boost emotions that are common in adolescents
  const adolescentEmotions = ['excited', 'stressed', 'confident', 'energetic'];

  for (const emotion of adolescentEmotions) {
    if (adjusted[emotion]) {
      adjusted[emotion] *= intensityMultiplier;
    }
  }

  // Normalize to ensure values don't exceed 100
  const maxValue = Math.max(...Object.values(adjusted));
  if (maxValue > 100) {
    const normalizationFactor = 100 / maxValue;
    for (const emotion in adjusted) {
      adjusted[emotion] *= normalizationFactor;
    }
  }

  return adjusted;
}

/**
 * Main emotion fusion algorithm
 */
export function fuseEmotions(data: {
  facial?: { emotion: string; confidence: number; landmarks?: any; emotion_scores?: Record<string, number> } | null;
  voice?: { emotion: string; confidence: number; features?: any } | null;
  text?: { sentiment: string; confidence: number; analysis?: any } | null;
}): FusedEmotionResult {
  const emotionInputs: EmotionInput[] = [];
  const sources: FusedEmotionResult['sources'] = {};
  // Calculate weighted emotion scores
  const emotionScores: Record<string, number> = {};
  let totalWeight = 0;

  // Collect emotion inputs from different modalities
  // Process facial emotion
  if (data.facial) {
    const normalizedEmotion = normalizeEmotion(data.facial.emotion);
    emotionInputs.push({
      emotion: normalizedEmotion,
      confidence: data.facial.confidence,
      weight: EMOTION_WEIGHTS.facial,
    });
    sources.facial = normalizedEmotion;

    // NEW: If facial data includes emotion_scores, add them to the breakdown
    if (data.facial.emotion_scores) {
      for (const [emotion, score] of Object.entries(data.facial.emotion_scores)) {
        const normalized = normalizeEmotion(emotion);
        const weightedScore = (score as number) * EMOTION_WEIGHTS.facial / 100;
        emotionScores[normalized] = (emotionScores[normalized] || 0) + weightedScore;
      }
    }
  }

  if (data.voice) {
    const normalizedEmotion = normalizeEmotion(data.voice.emotion);
    emotionInputs.push({
      emotion: normalizedEmotion,
      confidence: data.voice.confidence,
      weight: EMOTION_WEIGHTS.voice,
    });
    sources.voice = normalizedEmotion;
  }

  if (data.text) {
    const normalizedEmotion = normalizeEmotion(data.text.sentiment);
    emotionInputs.push({
      emotion: normalizedEmotion,
      confidence: data.text.confidence,
      weight: EMOTION_WEIGHTS.text,
    });
    sources.text = normalizedEmotion;
  }

  // Default fallback if no inputs
  if (emotionInputs.length === 0) {
    return {
      emotion: 'neutral',
      confidence: 50,
      breakdown: { neutral: 50 },
      sources: {},
    };
  }

  // Add emotion scores from simple inputs (voice/text that don't have multi-emotion breakdown)
  for (const input of emotionInputs) {
    const score = (input.confidence * input.weight) / 100;
    emotionScores[input.emotion] = (emotionScores[input.emotion] || 0) + score;
    totalWeight += input.weight;
  }

  // Calculate weighted average confidence (System Reliability)
  let weightedConfidenceSum = 0;
  for (const input of emotionInputs) {
    weightedConfidenceSum += input.confidence * input.weight;
  }
  const systemConfidence = totalWeight > 0 ? Math.round(weightedConfidenceSum / totalWeight) : 0;

  // Apply compatibility bonuses for consistent emotions across modalities
  if (emotionInputs.length > 1) {
    for (let i = 0; i < emotionInputs.length; i++) {
      for (let j = i + 1; j < emotionInputs.length; j++) {
        const emotion1 = emotionInputs[i].emotion;
        const emotion2 = emotionInputs[j].emotion;
        const compatibility = getCompatibilityScore(emotion1, emotion2);

        if (compatibility > 0.5) {
          const bonus = compatibility * 0.1; // 10% max bonus
          emotionScores[emotion1] += bonus * emotionInputs[i].confidence / 100;
          emotionScores[emotion2] += bonus * emotionInputs[j].confidence / 100;
        }
      }
    }
  }

  // Normalize scores to percentages
  // Normalize scores to percentages (Sum to 100)
  const totalScore = Object.values(emotionScores).reduce((a, b) => a + b, 0);
  const normalizedScores: Record<string, number> = {};

  if (totalScore > 0) {
    for (const emotion in emotionScores) {
      normalizedScores[emotion] = Math.round((emotionScores[emotion] / totalScore) * 100);
    }
  } else {
    normalizedScores['neutral'] = 100;
  }

  // Apply adolescent-specific adjustments
  const adjustedScores = applyAdolescentAdjustments(normalizedScores);

  // Find dominant emotion
  const dominantEmotion = Object.keys(adjustedScores).reduce((a, b) =>
    adjustedScores[a] > adjustedScores[b] ? a : b
  );

  const dominantConfidence = Math.min(Math.round(adjustedScores[dominantEmotion]), 100);

  return {
    emotion: dominantEmotion,
    confidence: systemConfidence, // Use calculated system reliability, not distribution share
    breakdown: adjustedScores,
    sources,
  };
}

/**
 * Generate emotion suggestions based on current state
 */
export function generateEmotionSuggestions(emotion: string, confidence: number): {
  music: string[];
  activities: string[];
  quotes: string[];
} {
  const suggestions = {
    music: [] as string[],
    activities: [] as string[],
    quotes: [] as string[],
  };

  switch (emotion.toLowerCase()) {
    case 'happy':
    case 'excited':
    case 'positive':
      suggestions.music = ['Upbeat Pop', 'Feel-Good Indie', 'Dance Hits'];
      suggestions.activities = ['Share with friends', 'Creative projects', 'Outdoor activities'];
      suggestions.quotes = ['happiness', 'success', 'positivity'];
      break;

    case 'sad':
    case 'negative':
      suggestions.music = ['Calming Instrumentals', 'Peaceful Acoustic', 'Healing Sounds'];
      suggestions.activities = ['Journaling', 'Meditation', 'Talk to someone'];
      suggestions.quotes = ['resilience', 'growth', 'hope'];
      break;

    case 'cry':
    case 'crying':
      suggestions.music = ['Comforting Melodies', 'Gentle Piano', 'Rain Sounds'];
      suggestions.activities = ['Deep breathing', 'Drink water', 'Rest briefly'];
      suggestions.quotes = ['it is okay not to be okay', 'healing', 'breathe'];
      break;

    case 'stressed':
    case 'angry':
      suggestions.music = ['Relaxing Nature Sounds', 'Breathing Exercises', 'Calm Classical'];
      suggestions.activities = ['Deep breathing', 'Physical exercise', 'Progressive relaxation'];
      suggestions.quotes = ['peace', 'strength', 'patience'];
      break;

    case 'calm':
    case 'neutral':
      suggestions.music = ['Ambient Soundscapes', 'Lo-fi Hip Hop', 'Mindful Music'];
      suggestions.activities = ['Reading', 'Gentle yoga', 'Nature walks'];
      suggestions.quotes = ['mindfulness', 'balance', 'tranquility'];
      break;

    case 'energetic':
    case 'confident':
      suggestions.music = ['Motivational Rock', 'Workout Beats', 'Power Pop'];
      suggestions.activities = ['Exercise', 'Learn something new', 'Set goals'];
      suggestions.quotes = ['motivation', 'achievement', 'confidence'];
      break;

    default:
      suggestions.music = ['Discover New Music', 'Mood-based Playlists'];
      suggestions.activities = ['Self-reflection', 'Creative expression'];
      suggestions.quotes = ['self-discovery', 'growth'];
  }

  return suggestions;
}

/**
 * Calculate emotional trend from historical data
 */
export function calculateEmotionalTrend(
  sessions: Array<{ fusedEmotion: string; fusedConfidence: number; timestamp: Date }>
): {
  trend: 'improving' | 'declining' | 'stable';
  score: number;
  dominant: string;
} {
  if (sessions.length === 0) {
    return { trend: 'stable', score: 50, dominant: 'neutral' };
  }

  // Sort sessions by timestamp
  const sortedSessions = sessions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Calculate average scores for positive vs negative emotions
  const positiveEmotions = ['happy', 'excited', 'confident', 'calm', 'positive', 'energetic'];
  const negativeEmotions = ['sad', 'angry', 'stressed', 'fearful', 'negative', 'tired'];

  let positiveSum = 0;
  let negativeSum = 0;
  let totalSessions = 0;
  const emotionCounts: Record<string, number> = {};

  for (const session of sortedSessions) {
    const emotion = session.fusedEmotion.toLowerCase();
    const confidence = session.fusedConfidence;

    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;

    if (positiveEmotions.includes(emotion)) {
      positiveSum += confidence;
    } else if (negativeEmotions.includes(emotion)) {
      negativeSum += confidence;
    }

    totalSessions++;
  }

  // Find dominant emotion
  const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) =>
    emotionCounts[a] > emotionCounts[b] ? a : b
  );

  // Calculate overall mood score
  const totalEmotionalScore = positiveSum + negativeSum;
  const moodScore = totalEmotionalScore > 0 ? Math.round((positiveSum / totalEmotionalScore) * 100) : 50;

  // Determine trend
  let trend: 'improving' | 'declining' | 'stable' = 'stable';

  if (sortedSessions.length >= 3) {
    const recentSessions = sortedSessions.slice(-3);
    const olderSessions = sortedSessions.slice(0, -3);

    if (olderSessions.length > 0) {
      const recentPositive = recentSessions.filter(s =>
        positiveEmotions.includes(s.fusedEmotion.toLowerCase())
      ).length / recentSessions.length;

      const olderPositive = olderSessions.filter(s =>
        positiveEmotions.includes(s.fusedEmotion.toLowerCase())
      ).length / olderSessions.length;

      if (recentPositive > olderPositive + 0.2) {
        trend = 'improving';
      } else if (recentPositive < olderPositive - 0.2) {
        trend = 'declining';
      }
    }
  }

  return {
    trend,
    score: moodScore,
    dominant: dominantEmotion,
  };
}

/**
 * Detect autism-specific emotion patterns
 */
export function detectAutismPatterns(
  sessions: Array<{ fusedEmotion: string; rawData?: any }>
): {
  patterns: string[];
  recommendations: string[];
} {
  const patterns: string[] = [];
  const recommendations: string[] = [];

  // Analyze emotion variability
  const emotions = sessions.map(s => s.fusedEmotion);
  const uniqueEmotions = new Set(emotions);

  if (uniqueEmotions.size === 1 && sessions.length > 5) {
    patterns.push('Limited emotional range detected');
    recommendations.push('Consider activities that promote emotional variety');
  }

  // Check for sensory-related patterns
  const stressedSessions = sessions.filter(s =>
    ['stressed', 'overwhelmed', 'anxious'].includes(s.fusedEmotion.toLowerCase())
  );

  if (stressedSessions.length > sessions.length * 0.4) {
    patterns.push('High stress frequency detected');
    recommendations.push('Consider sensory regulation strategies');
  }

  // Look for masking behaviors (mismatch between modalities)
  const mismatchSessions = sessions.filter(s => {
    if (!s.rawData) return false;
    const facial = s.rawData.facial?.emotion;
    const voice = s.rawData.voice?.emotion;

    if (facial && voice) {
      const facialPositive = ['happy', 'excited'].includes(facial.toLowerCase());
      const voiceNegative = ['sad', 'stressed', 'tired'].includes(voice.toLowerCase());
      return facialPositive && voiceNegative;
    }
    return false;
  });

  if (mismatchSessions.length > sessions.length * 0.3) {
    patterns.push('Potential emotion masking detected');
    recommendations.push('Focus on authentic emotional expression');
  }

  return { patterns, recommendations };
}
