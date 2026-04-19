import {
  users,
  emotionSessions,
  emotionHistory,
  suggestions,
  type User,
  type InsertUser,
  type EmotionSession,
  type InsertEmotionSession,
  type EmotionHistory,
  type InsertEmotionHistory,
  type Suggestion,
  type InsertSuggestion
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, desc, sql as drizzleSql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Emotion session operations
  createEmotionSession(session: InsertEmotionSession): Promise<EmotionSession>;
  getEmotionSessionsByUser(userId: number, limit?: number): Promise<EmotionSession[]>;
  getEmotionSessionsForDate(userId: number, date: Date): Promise<EmotionSession[]>;

  // Emotion history operations
  getEmotionHistory(userId: number, days?: number): Promise<EmotionHistory[]>;
  createOrUpdateEmotionHistory(history: InsertEmotionHistory): Promise<EmotionHistory>;

  // Suggestion operations
  getSuggestionsForUser(userId: number, type?: string): Promise<Suggestion[]>;
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  markSuggestionAsUsed(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createEmotionSession(session: InsertEmotionSession): Promise<EmotionSession> {
    const [emotionSession] = await db.insert(emotionSessions).values(session).returning();
    return emotionSession;
  }

  async getEmotionSessionsByUser(userId: number, limit = 50): Promise<EmotionSession[]> {
    return await db.select()
      .from(emotionSessions)
      .where(eq(emotionSessions.userId, userId))
      .orderBy(desc(emotionSessions.timestamp))
      .limit(limit);
  }

  async getEmotionSessionsForDate(userId: number, date: Date): Promise<EmotionSession[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return await db.select()
      .from(emotionSessions)
      .where(
        and(
          eq(emotionSessions.userId, userId),
          gte(emotionSessions.timestamp, startOfDay),
          drizzleSql`${emotionSessions.timestamp} < ${endOfDay}`
        )
      )
      .orderBy(emotionSessions.timestamp);
  }

  async getEmotionHistory(userId: number, days = 7): Promise<EmotionHistory[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db.select()
      .from(emotionHistory)
      .where(
        and(
          eq(emotionHistory.userId, userId),
          gte(emotionHistory.date, cutoffDate)
        )
      )
      .orderBy(desc(emotionHistory.date));
  }

  async createOrUpdateEmotionHistory(history: InsertEmotionHistory): Promise<EmotionHistory> {
    const historyDate = history.date || new Date();
    const dateString = historyDate.toDateString();

    // In a real app with Postgres, we'd use a more precise date comparison or cast to date
    const existingHistory = await db.select()
      .from(emotionHistory)
      .where(
        and(
          eq(emotionHistory.userId, history.userId),
          drizzleSql`DATE(${emotionHistory.date}) = DATE(${historyDate})`
        )
      ).limit(1);

    if (existingHistory.length > 0) {
      const [updated] = await db.update(emotionHistory)
        .set(history)
        .where(eq(emotionHistory.id, existingHistory[0].id))
        .returning();
      return updated;
    } else {
      const [newHistory] = await db.insert(emotionHistory)
        .values({ ...history, date: historyDate })
        .returning();
      return newHistory;
    }
  }

  async getSuggestionsForUser(userId: number, type?: string): Promise<Suggestion[]> {
    const conditions = [
      eq(suggestions.userId, userId),
      eq(suggestions.isUsed, false)
    ];
    
    if (type) {
      conditions.push(eq(suggestions.type, type));
    }

    return await db.select()
      .from(suggestions)
      .where(and(...conditions))
      .orderBy(desc(suggestions.createdAt));
  }

  async createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion> {
    const [newSuggestion] = await db.insert(suggestions).values(suggestion).returning();
    return newSuggestion;
  }

  async markSuggestionAsUsed(id: number): Promise<void> {
    await db.update(suggestions)
      .set({ isUsed: true })
      .where(eq(suggestions.id, id));
  }
}

import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'database.json');

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private emotionSessions: Map<number, EmotionSession>;
  private emotionHistories: Map<number, EmotionHistory>;
  private suggestions: Map<number, Suggestion>;
  private currentUserId: number;
  private currentSessionId: number;
  private currentHistoryId: number;
  private currentSuggestionId: number;

  constructor() {
    this.users = new Map();
    this.emotionSessions = new Map();
    this.emotionHistories = new Map();
    this.suggestions = new Map();
    this.currentUserId = 1;
    this.currentSessionId = 1;
    this.currentHistoryId = 1;
    this.currentSuggestionId = 1;

    // Load data on startup
    this._loadData();
  }

  private _loadData() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

        if (data.users) {
          this.users = new Map(data.users.map((u: any) => [u.id, { ...u, createdAt: new Date(u.createdAt) }]));
          this.currentUserId = Math.max(...Array.from(this.users.keys()), 0) + 1;
        }

        if (data.emotionSessions) {
          this.emotionSessions = new Map(data.emotionSessions.map((s: any) => [s.id, { ...s, timestamp: new Date(s.timestamp) }]));
          this.currentSessionId = Math.max(...Array.from(this.emotionSessions.keys()), 0) + 1;
        }

        if (data.emotionHistories) {
          this.emotionHistories = new Map(data.emotionHistories.map((h: any) => [h.id, { ...h, date: new Date(h.date) }]));
          this.currentHistoryId = Math.max(...Array.from(this.emotionHistories.keys()), 0) + 1;
        }

        if (data.suggestions) {
          this.suggestions = new Map(data.suggestions.map((s: any) => [s.id, { ...s, createdAt: new Date(s.createdAt) }]));
          this.currentSuggestionId = Math.max(...Array.from(this.suggestions.keys()), 0) + 1;
        }

        console.log('Loaded database from disk');
      }
    } catch (err) {
      console.error('Failed to load database:', err);
    }
  }

  private _saveData() {
    try {
      const data = {
        users: Array.from(this.users.values()),
        emotionSessions: Array.from(this.emotionSessions.values()),
        emotionHistories: Array.from(this.emotionHistories.values()),
        suggestions: Array.from(this.suggestions.values())
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to save database:', err);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    this._saveData();
    return user;
  }

  async createEmotionSession(session: InsertEmotionSession): Promise<EmotionSession> {
    const id = this.currentSessionId++;
    const emotionSession: EmotionSession = {
      ...session,
      id,
      timestamp: new Date()
    };
    this.emotionSessions.set(id, emotionSession);
    this._saveData();
    return emotionSession;
  }

  async getEmotionSessionsByUser(userId: number, limit = 50): Promise<EmotionSession[]> {
    const sessions = Array.from(this.emotionSessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
    return sessions;
  }

  async getEmotionSessionsForDate(userId: number, date: Date): Promise<EmotionSession[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return Array.from(this.emotionSessions.values())
      .filter(session =>
        session.userId === userId &&
        session.timestamp &&
        session.timestamp >= startOfDay &&
        session.timestamp < endOfDay
      )
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
  }

  async getEmotionHistory(userId: number, days = 7): Promise<EmotionHistory[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return Array.from(this.emotionHistories.values())
      .filter(history =>
        history.userId === userId &&
        history.date &&
        history.date >= cutoffDate
      )
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }

  async createOrUpdateEmotionHistory(history: InsertEmotionHistory): Promise<EmotionHistory> {
    const existingHistory = Array.from(this.emotionHistories.values())
      .find(h =>
        h.userId === history.userId &&
        h.date &&
        h.date.toDateString() === (history.date || new Date()).toDateString()
      );

    if (existingHistory) {
      const updated = { ...existingHistory, ...history };
      this.emotionHistories.set(existingHistory.id, updated);
      this._saveData();
      return updated;
    } else {
      const id = this.currentHistoryId++;
      const newHistory: EmotionHistory = {
        ...history,
        id,
        date: history.date || new Date()
      };
      this.emotionHistories.set(id, newHistory);
      this._saveData();
      return newHistory;
    }
  }

  async getSuggestionsForUser(userId: number, type?: string): Promise<Suggestion[]> {
    return Array.from(this.suggestions.values())
      .filter(suggestion =>
        suggestion.userId === userId &&
        (!type || suggestion.type === type) &&
        !suggestion.isUsed
      )
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion> {
    const id = this.currentSuggestionId++;
    const newSuggestion: Suggestion = {
      ...suggestion,
      id,
      createdAt: new Date(),
      isUsed: false
    };
    this.suggestions.set(id, newSuggestion);
    this._saveData();
    return newSuggestion;
  }

  async markSuggestionAsUsed(id: number): Promise<void> {
    const suggestion = this.suggestions.get(id);
    if (suggestion) {
      suggestion.isUsed = true;
      this.suggestions.set(id, suggestion);
      this._saveData();
    }
  }
}

export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
