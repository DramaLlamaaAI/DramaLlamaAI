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
  isAdmin: boolean("is_admin").notNull().default(false),
  discountPercentage: integer("discount_percentage").default(0),
  discountExpiryDate: timestamp("discount_expiry_date"),
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
  type: text("type").notNull(), // chat, message, de-escalate
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

// User events tracking for analytics
export const userEvents = pgTable("user_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  eventType: text("event_type").notNull(), // 'registration', 'tier_change', 'subscription', etc.
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertUserEventSchema = createInsertSchema(userEvents).pick({
  userId: true,
  eventType: true,
  oldValue: true,
  newValue: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type UsageLimit = typeof usageLimits.$inferSelect;
export type InsertUsageLimit = z.infer<typeof insertUsageLimitSchema>;

export type UserEvent = typeof userEvents.$inferSelect;
export type InsertUserEvent = z.infer<typeof insertUserEventSchema>;

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
  instant: {
    monthlyLimit: 0, // One-time use
    features: [
      // Pro tier features for one-time use
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
      "evasionIdentification",    // Evasion Identification
      "messageDominance",         // Message Dominance Analysis
      "emotionalShiftsTimeline",  // Emotional Shifts Timeline
      "powerDynamics",            // Power Dynamics Analysis
      "redFlagsTimeline",         // Red Flags Timeline
      "historicalPatterns",       // Historical Pattern Recognition
      "peerComparison"            // Anonymized Peer Benchmarks
    ],
    oneTime: true                 // Indicates this is a one-time payment, not a subscription
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
  // Psychological Profile (Pro and Instant Deep Dive tiers)
  psychologicalProfile: z.record(z.object({
    behavior: z.string(),
    emotionalState: z.string(),
    riskIndicators: z.string()
  })).optional(),
  toneAnalysis: z.object({
    overallTone: z.string(),
    emotionalState: z.array(z.object({
      emotion: z.string(),
      intensity: z.number(),
    })),
    participantTones: z.record(z.string()).optional(),
  }),
  redFlags: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.number(),
  })).optional(),
  // For free tier, only the count is provided, not the details
  redFlagsCount: z.number().optional(),
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
  potentialResponse: z.string().optional(),
  possibleReword: z.string().optional(),
  manipulationScore: z.string().optional(),
  powerDynamics: z.string().optional(),
  communicationStyle: z.string().optional(),
});

export const deEscalateResultSchema = z.object({
  original: z.string(),
  rewritten: z.string(),
  explanation: z.string(),
  alternativeOptions: z.string().optional(),
  additionalContextInsights: z.string().optional(),
  longTermStrategy: z.string().optional(),
});

export type ChatAnalysisResult = z.infer<typeof chatAnalysisResultSchema>;
export type MessageAnalysisResult = z.infer<typeof messageAnalysisResultSchema>;
export type DeEscalateResult = z.infer<typeof deEscalateResultSchema>;
