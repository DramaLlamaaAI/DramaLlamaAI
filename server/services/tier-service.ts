import { TIER_LIMITS, ChatAnalysisResult, MessageAnalysisResult } from '@shared/schema';

/**
 * Filter chat analysis results based on user's tier
 * This ensures users only see features available in their subscription tier
 */
export function filterChatAnalysisByTier(analysis: ChatAnalysisResult, tier: string): ChatAnalysisResult {
  // If tier doesn't exist, default to free
  const tierFeatures = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]?.features || TIER_LIMITS.free.features;
  
  // Create a filtered copy of the analysis with required fields
  const filteredAnalysis: ChatAnalysisResult = {
    toneAnalysis: {
      overallTone: analysis.toneAnalysis.overallTone,
      emotionalState: analysis.toneAnalysis.emotionalState,
      ...(analysis.toneAnalysis.participantTones && tierFeatures.includes('participantTones') ? 
        { participantTones: analysis.toneAnalysis.participantTones } : {})
    },
    communication: {
      // Basic patterns are available to all tiers
      patterns: analysis.communication.patterns || [],
    }
  };
  
  // Add health score if available for tier
  if (tierFeatures.includes('healthScore') && analysis.healthScore) {
    filteredAnalysis.healthScore = analysis.healthScore;
  }
  
  // Add key quotes if available for tier
  if (tierFeatures.includes('keyQuotes') && analysis.keyQuotes) {
    filteredAnalysis.keyQuotes = analysis.keyQuotes;
  }
  
  // Add red flags if available for tier
  if (tierFeatures.includes('redFlags') && analysis.redFlags) {
    filteredAnalysis.redFlags = analysis.redFlags;
  }
  
  // Add high tension factors if available for tier
  if ((tierFeatures.includes('advancedToneAnalysis') || tierFeatures.includes('emotionTracking')) && analysis.highTensionFactors) {
    filteredAnalysis.highTensionFactors = analysis.highTensionFactors;
  }
  
  // Add participant conflict scores if available for tier
  if ((tierFeatures.includes('emotionTracking') || tierFeatures.includes('communicationStyles')) && analysis.participantConflictScores) {
    filteredAnalysis.participantConflictScores = analysis.participantConflictScores;
  }
  
  // Add tension contributions if available for tier
  if (tierFeatures.includes('tensionContributions') && analysis.tensionContributions) {
    filteredAnalysis.tensionContributions = analysis.tensionContributions;
  }
  
  // Add tension meaning if available for tier
  if (tierFeatures.includes('tensionContributions') && analysis.tensionMeaning) {
    filteredAnalysis.tensionMeaning = analysis.tensionMeaning;
  }
  
  // Add communication dynamics if available
  if ((tierFeatures.includes('conversationDynamics') || tierFeatures.includes('communicationStyles')) && analysis.communication.dynamics) {
    filteredAnalysis.communication.dynamics = analysis.communication.dynamics;
  }
  
  // Add suggestions if available
  if (analysis.communication.suggestions) {
    filteredAnalysis.communication.suggestions = analysis.communication.suggestions;
  }
  
  return filteredAnalysis;
}

/**
 * Filter message analysis results based on user's tier
 */
export function filterMessageAnalysisByTier(analysis: MessageAnalysisResult, tier: string): MessageAnalysisResult {
  // If tier doesn't exist, default to free
  const tierFeatures = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]?.features || TIER_LIMITS.free.features;
  
  // Create a filtered copy of the analysis
  const filteredAnalysis: MessageAnalysisResult = {
    tone: analysis.tone,
    intent: analysis.intent,
  };
  
  // Add suggested reply if available for tier
  if ((tierFeatures.includes('communicationStyles') || tier === 'personal' || tier === 'pro' || tier === 'instant') && analysis.suggestedReply) {
    filteredAnalysis.suggestedReply = analysis.suggestedReply;
  }
  
  return filteredAnalysis;
}