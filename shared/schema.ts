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
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationCode: text("verification_code"),
  verificationCodeExpires: timestamp("verification_code_expires"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
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
    features: [
      "overallTone",          // Overall Emotional Tone Summary
      "participantTones",     // Participant Analysis
      "healthScore",          // Conversation Health Meter
      "keyQuotes",            // Brief highlight quotes
      "communicationInsights", // Basic Communication Insights
      "pdfExport"             // PDF Export function
    ],
  },
  personal: {
    monthlyLimit: 10,
    features: [
      // Free tier features
      "overallTone",            // Overall Emotional Tone Summary
      "participantTones",       // Participant Analysis 
      "healthScore",            // Conversation Health Meter
      "keyQuotes",              // Key Summary Quotes
      "communicationInsights",  // Basic Communication Insights
      "pdfExport",              // PDF Export function
      
      // Personal tier specific features
      "advancedToneAnalysis",   // Advanced Emotional Tone Analysis
      "tensionContributions",   // Individual Contributions to Tension
      "manipulationScore",      // Manipulation scoring in quotes
      "redFlags",               // Red flag detection with meters
      "communicationStyles",    // Communication Styles Breakdown
      "accountabilityMeters",   // Accountability Indicators
      "emotionTracking",        // Emotion Tracking Per Participant
      "moodTrends"              // Mood Trends Over Time
    ],
  },
  pro: {
    monthlyLimit: Infinity,
    features: [
      // Include all Personal tier features
      "overallTone",              // Overall Emotional Tone Summary
      "participantTones",         // Participant Analysis 
      "healthScore",              // Conversation Health Meter
      "keyQuotes",                // Key Summary Quotes
      "communicationInsights",    // Basic Communication Insights
      "pdfExport",                // PDF Export function
      "advancedToneAnalysis",     // Advanced Emotional Tone Analysis
      "tensionContributions",     // Individual Contributions to Tension
      "manipulationScore",        // Manipulation scoring in quotes
      "redFlags",                 // Red flag detection with meters
      "communicationStyles",      // Communication Styles Breakdown
      "accountabilityMeters",     // Accountability Indicators
      "emotionTracking",          // Emotion Tracking Per Participant
      "moodTrends",               // Mood Trends Over Time
      
      // Pro tier specific features
      "unlimitedUploads",         // Unlimited chat uploads
      "conversationDynamics",     // Conversation Dynamics 
      "behaviouralPatterns",      // Behavioural Patterns Detection
      "advancedTrendLines",       // Advanced Communication Trend Lines
      "evasionIdentification",    // Evasion Identification – Avoidance Detection
      "messageDominance",         // Message Dominance Analysis
      "emotionalShiftsTimeline",  // Emotional Shifts Timeline (interactive)
      "powerDynamics",            // Power Dynamics Analysis
      "redFlagsTimeline",         // Red Flags Timeline – Progressive Tracking
      "historicalPatterns",       // Historical Pattern Recognition
      "peerComparison",           // Anonymized Peer Comparison Benchmarks
      "gaslightingDetection"      // Gaslighting Detection (part of trend lines)
    ],
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
    dynamics: z.array(z.string()).optional(),
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
  tensionContributions: z.record(z.array(z.string())).optional(),
  tensionMeaning: z.string().optional(),
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
