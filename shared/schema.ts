import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emotionSessions = pgTable("emotion_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  facialEmotion: text("facial_emotion"),
  facialConfidence: integer("facial_confidence"),
  voiceEmotion: text("voice_emotion"),
  voiceConfidence: integer("voice_confidence"),
  textSentiment: text("text_sentiment"),
  textConfidence: integer("text_confidence"),
  fusedEmotion: text("fused_emotion").notNull(),
  fusedConfidence: integer("fused_confidence").notNull(),
  rawData: jsonb("raw_data"),
});

export const emotionHistory = pgTable("emotion_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").defaultNow(),
  dominantEmotion: text("dominant_emotion").notNull(),
  moodScore: integer("mood_score").notNull(),
  sessionsCount: integer("sessions_count").notNull(),
  emotionBreakdown: jsonb("emotion_breakdown").notNull(),
});

export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'music', 'activity', 'quote'
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  isUsed: boolean("is_used").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
});

export const insertEmotionSessionSchema = createInsertSchema(emotionSessions).omit({
  id: true,
  timestamp: true,
});

export const insertEmotionHistorySchema = createInsertSchema(emotionHistory).omit({
  id: true,
  date: true,
});

export const insertSuggestionSchema = createInsertSchema(suggestions).omit({
  id: true,
  createdAt: true,
  isUsed: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type EmotionSession = typeof emotionSessions.$inferSelect;
export type InsertEmotionSession = z.infer<typeof insertEmotionSessionSchema>;
export type EmotionHistory = typeof emotionHistory.$inferSelect;
export type InsertEmotionHistory = z.infer<typeof insertEmotionHistorySchema>;
export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;

// Additional types for emotion data
export interface EmotionData {
  facial?: {
    emotion: string;
    confidence: number;
    landmarks?: any;
  };
  voice?: {
    emotion: string;
    confidence: number;
    features?: any;
  };
  text?: {
    sentiment: string;
    confidence: number;
    analysis?: any;
  };
  fused: {
    emotion: string;
    confidence: number;
  };
}

export interface EmotionBreakdown {
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  surprised: number;
  disgusted: number;
  neutral: number;
  [key: string]: number;
}
