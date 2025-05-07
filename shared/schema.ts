import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  tier: text("tier").notNull().default("free"),
  email: text("email").notNull().unique(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  tier: true,
});

// Analysis schema
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // chat, message, vent
  content: text("content").notNull(),
  result: json("result").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  userId: true,
  type: true,
  content: true,
  result: true,
});

// Usage tracking schema
export const usageLimits = pgTable("usage_limits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  monthlyTotal: integer("monthly_total").notNull().default(0),
  lastResetDate: timestamp("last_reset_date").notNull().defaultNow(),
});

export const insertUsageLimitSchema = createInsertSchema(usageLimits).pick({
  userId: true,
  monthlyTotal: true,
  lastResetDate: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type UsageLimit = typeof usageLimits.$inferSelect;
export type InsertUsageLimit = z.infer<typeof insertUsageLimitSchema>;

// Tier information
export const TIER_LIMITS = {
  free: {
    monthlyLimit: 1,
    features: ["basicTone"],
  },
  personal: {
    monthlyLimit: 10,
    features: ["basicTone", "redFlags", "advice", "patterns"],
  },
  pro: {
    monthlyLimit: Infinity,
    features: ["basicTone", "redFlags", "advice", "patterns", "conflictPatterns", "historical"],
  },
};

// Feature schemas
export const chatAnalysisResultSchema = z.object({
  toneAnalysis: z.object({
    overallTone: z.string(),
    emotionalState: z.array(z.object({
      emotion: z.string(),
      intensity: z.number(),
    })),
  }),
  redFlags: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.number(),
  })).optional(),
  communication: z.object({
    patterns: z.array(z.string()).optional(),
    suggestions: z.array(z.string()).optional(),
  }),
  healthScore: z.object({
    score: z.number(),
    label: z.string(),
    color: z.enum(['red', 'yellow', 'light-green', 'green'])
  }).optional(),
  keyQuotes: z.array(z.object({
    speaker: z.string(),
    quote: z.string(),
    analysis: z.string(),
    improvement: z.string().optional()
  })).optional(),
  highTensionFactors: z.array(z.string()).optional(),
  participantConflictScores: z.record(z.object({
    score: z.number(),
    label: z.string(),
    isEscalating: z.boolean()
  })).optional(),
});

export const messageAnalysisResultSchema = z.object({
  tone: z.string(),
  intent: z.array(z.string()),
  suggestedReply: z.string().optional(),
});

export const ventModeResultSchema = z.object({
  original: z.string(),
  rewritten: z.string(),
  explanation: z.string(),
});

export type ChatAnalysisResult = z.infer<typeof chatAnalysisResultSchema>;
export type MessageAnalysisResult = z.infer<typeof messageAnalysisResultSchema>;
export type VentModeResult = z.infer<typeof ventModeResultSchema>;
