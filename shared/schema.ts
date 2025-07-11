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
  country: text("country"),
  referralCode: text("referral_code"), // The referral code this user used when signing up
  referredBy: integer("referred_by"), // ID of the user who referred this user
  deepDiveCredits: integer("deep_dive_credits").default(0), // Credits for one-time Deep Dive analyses
});

// Promotional codes schema
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountPercentage: integer("discount_percentage").notNull(),
  maxUses: integer("max_uses").default(100),
  usedCount: integer("used_count").default(0),
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date").notNull().defaultNow(),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdById: integer("created_by_id").notNull(),
  targetTier: text("target_tier"), // Which tier this promo applies to (null for all)
  applyToFirstMonth: boolean("apply_to_first_month").default(true),
});

// Promo code usage tracking
export const promoUsage = pgTable("promo_usage", {
  id: serial("id").primaryKey(),
  promoCodeId: integer("promo_code_id").notNull(),
  userId: integer("user_id").notNull(),
  usedAt: timestamp("used_at").notNull().defaultNow(),
  appliedDiscount: integer("applied_discount").notNull(),
  targetTier: text("target_tier").notNull(),
});

// Referral codes for marketer tracking
export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g., "SARAH2025", "MIKE_PROMO"
  marketerName: text("marketer_name").notNull(), // Name of the marketer
  marketerEmail: text("marketer_email"), // Optional email for contact
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdById: integer("created_by_id").notNull(), // Admin who created this code
  totalSignups: integer("total_signups").default(0), // Track total signups
  totalConversions: integer("total_conversions").default(0), // Track paid conversions
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  tier: true,
  isAdmin: true,
  emailVerified: true,
  country: true,
  referralCode: true,
  referredBy: true,
});

export const insertReferralCodeSchema = createInsertSchema(referralCodes).pick({
  code: true,
  marketerName: true,
  marketerEmail: true,
  isActive: true,
  createdById: true,
});

export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;

export const insertPromoCodeSchema = createInsertSchema(promoCodes).pick({
  code: true,
  description: true,
  discountPercentage: true,
  maxUses: true,
  isActive: true,
  startDate: true,
  expiryDate: true,
  createdById: true,
  targetTier: true,
  applyToFirstMonth: true,
});

export const insertPromoUsageSchema = createInsertSchema(promoUsage).pick({
  promoCodeId: true,
  userId: true,
  appliedDiscount: true,
  targetTier: true,
});

// Analysis schema
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // chat, message, de-escalate, boundary-builder
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

// System settings for beta mode and other global configurations
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedById: integer("updated_by_id")
});

// Saved scripts for users to store and track their conversation scripts
export const savedScripts = pgTable("saved_scripts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  situation: text("situation").notNull(),
  originalMessage: text("original_message").notNull(),
  firmScript: text("firm_script").notNull(),
  neutralScript: text("neutral_script").notNull(),
  empathicScript: text("empathic_script").notNull(),
  situationAnalysis: text("situation_analysis").notNull(),
  chosenTone: text("chosen_tone"), // Which tone the user chose to use
  sentScript: text("sent_script"), // The actual script they sent (might be modified)
  receivedReply: text("received_reply"), // Reply they received back
  followUpSuggestions: json("follow_up_suggestions"), // AI suggestions for follow-up
  status: text("status").notNull().default("saved"), // saved, sent, replied, resolved
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Conversation messages for tracking ongoing conversation flow
export const conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  scriptId: integer("script_id").notNull().references(() => savedScripts.id, { onDelete: 'cascade' }),
  messageIndex: integer("message_index").notNull(), // Order in conversation (0 = original, 1 = first follow-up, etc.)
  yourMessage: text("your_message").notNull(), // The message you sent
  chosenTone: text("chosen_tone", { enum: ['firm', 'neutral', 'empathic'] }).notNull(), // Which tone was used
  partnerReply: text("partner_reply"), // Their response (if received)
  followUpSuggestions: json("follow_up_suggestions"), // AI suggestions for next response
  followUpChosenTone: text("follow_up_chosen_tone", { enum: ['firm', 'neutral', 'empathic'] }), // Which follow-up tone was chosen
  isActive: boolean("is_active").notNull().default(true), // Whether this is the current active message in conversation
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserEventSchema = createInsertSchema(userEvents).pick({
  userId: true,
  eventType: true,
  oldValue: true,
  newValue: true
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).pick({
  settingKey: true,
  settingValue: true,
  description: true,
  updatedById: true
});

export const insertSavedScriptSchema = createInsertSchema(savedScripts).pick({
  userId: true,
  title: true,
  situation: true,
  originalMessage: true,
  firmScript: true,
  neutralScript: true,
  empathicScript: true,
  situationAnalysis: true,
  chosenTone: true,
  sentScript: true,
  receivedReply: true,
  followUpSuggestions: true,
  status: true,
});

export const insertConversationMessageSchema = createInsertSchema(conversationMessages).pick({
  scriptId: true,
  messageIndex: true,
  yourMessage: true,
  chosenTone: true,
  partnerReply: true,
  followUpSuggestions: true,
  followUpChosenTone: true,
  isActive: true,
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

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

export type SavedScript = typeof savedScripts.$inferSelect;
export type InsertSavedScript = z.infer<typeof insertSavedScriptSchema>;

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;

// Tier information
export const TIER_LIMITS = {
  free: {
    monthlyLimit: 5, // 5 chat analysis per month
    features: [
      "overallTone",          // Overall Emotional Tone Summary
      "healthScore",          // Conversation Health Meter
      "pdfExport"             // Simple PDF Export
    ],
  },
  beta: {
    monthlyLimit: null, // Unlimited during beta period
    features: [
      // Full Pro tier features during beta
      "overallTone",              // Overall Emotional Tone Summary
      "healthScore",              // Conversation Health Meter
      "pdfExport",                // PDF Export function
      "participantTones",         // Participants named
      "communicationInsights",    // Basic Communication Insights - participants named
      "advancedToneAnalysis",     // Advanced Emotional Tone Analysis - participants named
      "tensionContributions",     // Individual Contributions to Tension - participants named
      "keyQuotes",                // Key Conversation Quotes - participants named 
      "manipulationScore",        // Manipulation Score - participants named
      "redFlags",                 // Red Flags Detection & Meters - participants named
      "communicationStyles",      // Communication Styles Breakdown
      "accountabilityMeters",     // Accountability Indicators - participants named
      "conversationDynamics",     // Conversation Dynamics
      "behaviouralPatterns",      // Behavioural Patterns Detection - participants named
      "advancedTrendLines",       // Advanced Communication Trend Lines (Red Flags, Gaslighting) - participants named
      "evasionIdentification",    // Evasion Identification – Avoidance Detection - participants named
      "messageDominance",         // Message Dominance Analysis – Conversational Control Insights - participants named
      "emotionalShiftsTimeline",  // Emotional Shifts Timeline (interactive view)
      "powerDynamics",            // Power Dynamics Analysis
      "relationshipHealthIndicators", // Relationship Health Assessment with future projection
      "communicationPatternComparison", // Communication Patterns Comparison
      "personalizedGrowthRecommendations", // Personalized Growth Recommendations for each participant
      "redFlagsTimeline",         // Red Flags Timeline and Progression Analysis
      "empatheticSummary"         // Empathetic Summary for each participant
    ],
  },
  instant: {
    monthlyLimit: 1, // One-time use (1 Chat Upload)
    features: [
      // Pro tier features for one-time use
      "overallTone",              // Overall Emotional Tone Summary
      "healthScore",              // Conversation Health Meter
      "pdfExport",                // PDF Export function
      "participantTones",         // Participants named
      "communicationInsights",    // Basic Communication Insights - participants named
      "advancedToneAnalysis",     // Advanced Emotional Tone Analysis - participants named
      "tensionContributions",     // Individual Contributions to Tension - participants named
      "keyQuotes",                // Key Conversation Quotes - participants named 
      "manipulationScore",        // Manipulation Score - participants named
      "redFlags",                 // Red Flags Detection & Meters - participants named
      "communicationStyles",      // Communication Styles Breakdown
      "accountabilityMeters",     // Accountability Indicators - participants named
      "conversationDynamics",     // Conversation Dynamics
      "behaviouralPatterns",      // Behavioural Patterns Detection - participants named
      "advancedTrendLines",       // Advanced Communication Trend Lines (Red Flags, Gaslighting) - participants named
      "evasionIdentification",    // Evasion Identification – Avoidance Detection - participants named
      "messageDominance",         // Message Dominance Analysis – Conversational Control Insights - participants named
      "emotionalShiftsTimeline",  // Emotional Shifts Timeline (interactive view)
      "powerDynamics",            // Power Dynamics Analysis
      "redFlagsTimeline",         // Red Flags Timeline – Progressive Tracking
    ],
    oneTime: true                 // Indicates this is a one-time payment, not a subscription
  },
  personal: {
    monthlyLimit: 5, // 5 uploads a month
    features: [
      // Free tier features
      "overallTone",            // Overall Emotional Tone Summary
      "healthScore",            // Conversation Health Meter
      "pdfExport",              // PDF Export function
      
      // Personal tier specific features
      "participantTones",       // Participants named
      "communicationInsights",  // Basic Communication Insights - participants named
      "advancedToneAnalysis",   // Advanced Emotional Tone Analysis - participants named
      "tensionContributions",   // Individual Contributions to Tension - participants named
      "keyQuotes",              // Key Conversation Quotes - participants named 
      "manipulationScore",      // Manipulation Score - participants named
      "redFlags",               // Red Flags Detection & Red Flag Meters - participants named
      "communicationStyles",    // Communication Styles Breakdown - Your Style vs Their Style
      "accountabilityMeters",   // Accountability Indicators - participants named
      "empatheticSummary"       // Empathetic Summary for each participant
    ],
  },
  pro: {
    monthlyLimit: Infinity, // Unlimited chat uploads
    features: [
      // Personal tier features
      "overallTone",              // Overall Emotional Tone Summary
      "healthScore",              // Conversation Health Meter
      "pdfExport",                // PDF Export function
      "participantTones",         // Participants named
      "communicationInsights",    // Basic Communication Insights - participants named
      "advancedToneAnalysis",     // Advanced Emotional Tone Analysis - participants named
      "tensionContributions",     // Individual Contributions to Tension - participants named
      "keyQuotes",                // Key Conversation Quotes - participants named 
      "manipulationScore",        // Manipulation Score - participants named
      "redFlags",                 // Red Flags Detection & Meters - participants named
      "communicationStyles",      // Communication Styles Breakdown
      "accountabilityMeters",     // Accountability Indicators - participants named
      
      // Pro tier specific features
      "unlimitedUploads",         // Unlimited chat uploads
      "conversationDynamics",     // Conversation Dynamics
      "behaviouralPatterns",      // Behavioural Patterns Detection - participants named
      "advancedTrendLines",       // Advanced Communication Trend Lines (Red Flags, Gaslighting) - participants named
      "evasionIdentification",    // Evasion Identification – Avoidance Detection - participants named
      "messageDominance",         // Message Dominance Analysis – Conversational Control Insights - participants named
      "emotionalShiftsTimeline",  // Emotional Shifts Timeline (interactive view)
      "powerDynamics",            // Power Dynamics Analysis
      "redFlagsTimeline",         // Red Flags Timeline – Progressive Tracking
      "empatheticSummary"         // Empathetic Summary for each participant
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
    participant: z.string().optional(),
    quote: z.string().optional(),
    context: z.string().optional(),
    examples: z.array(z.object({
      text: z.string(),
      from: z.string()
    })).optional(),
    // Enhanced Pro tier fields
    impact: z.string().optional(),
    recommendedAction: z.string().optional(),
    behavioralPattern: z.string().optional(),
    progression: z.string().optional(),
  })).optional(),
  // For free tier, limited info is provided
  redFlagsCount: z.number().optional(),
  redFlagTypes: z.array(z.string()).optional(),
  redFlagsDetected: z.boolean().optional(),
  sampleQuotes: z.array(z.object({
    type: z.string(),
    quote: z.string(),
    participant: z.string()
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
  
  // Pro-tier communication pattern comparison
  communicationPatternComparison: z.record(z.array(z.object({
    pattern: z.string(),
    example: z.string()
  }))).optional(),
  
  // Pro-tier relationship health indicators
  relationshipHealthIndicators: z.object({
    currentScore: z.number(),
    currentLabel: z.string(),
    primaryConcerns: z.array(z.object({
      issue: z.string(),
      severity: z.number(),
      participant: z.string()
    })),
    patterns: z.object({
      recurring: z.array(z.string()),
      escalating: z.array(z.string()),
      improving: z.array(z.string())
    }),
    projectedOutcome: z.string(),
    recommendedFocus: z.array(z.string())
  }).optional(),
  
  // Pro-tier personalized growth recommendations
  personalizedGrowthRecommendations: z.record(z.array(z.object({
    area: z.string(),
    recommendation: z.string(),
    example: z.string().optional()
  }))).optional(),
  
  // Pro-tier red flags timeline
  redFlagsTimeline: z.object({
    overview: z.string(),
    progression: z.array(z.object({
      position: z.string(),
      positionIndex: z.number(),
      quoteIndex: z.number(),
      type: z.string(),
      description: z.string(),
      severity: z.number(),
      participant: z.string()
    })),
    escalationPoints: z.array(z.object({
      position: z.string(),
      description: z.string(),
      severityJump: z.number(),
      participant: z.string()
    }))
  }).optional(),
  
  // Empathetic Summary for Beta, Personal, and Pro tiers
  empatheticSummary: z.record(z.object({
    summary: z.string(),
    insights: z.string(),
    growthAreas: z.array(z.string()),
    strengths: z.array(z.string())
  })).optional(),
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

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoUsage = typeof promoUsage.$inferSelect;
export type InsertPromoUsage = z.infer<typeof insertPromoUsageSchema>;
