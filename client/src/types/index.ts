// User types
export interface User {
  id: number;
  username: string;
  email: string;
  tier: UserTier;
}

export type UserTier = 'free' | 'personal' | 'pro';

// Analysis types
export interface Analysis {
  id: number;
  userId: number;
  type: AnalysisType;
  content: string;
  result: AnalysisResult;
  createdAt: string;
}

export type AnalysisType = 'chat' | 'message' | 'vent';
export type AnalysisResult = ChatAnalysisResult | MessageAnalysisResult | VentModeResult;

// Chat analysis types
export interface ChatAnalysisResult {
  toneAnalysis: {
    overallTone: string;
    emotionalState: Array<{
      emotion: string;
      intensity: number;
    }>;
  };
  redFlags?: Array<{
    type: string;
    description: string;
    severity: number;
  }>;
  communication: {
    patterns?: string[];
    suggestions?: string[];
  };
  dramaScore?: number;
}

// Message analysis types
export interface MessageAnalysisResult {
  tone: string;
  intent: string[];
  suggestedReply?: string;
}

// Vent mode types
export interface VentModeResult {
  original: string;
  rewritten: string;
  explanation: string;
}

// Tier specific
export interface TierLimit {
  monthlyLimit: number;
  features: string[];
}

export interface TierLimits {
  free: TierLimit;
  personal: TierLimit;
  pro: TierLimit;
}
