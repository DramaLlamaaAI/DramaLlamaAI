import { TIER_LIMITS, ChatAnalysisResult, MessageAnalysisResult, DeEscalateResult } from '@shared/schema';

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
      // Only include participant tones for tiers that have this feature
      ...(analysis.toneAnalysis.participantTones && tierFeatures.includes('participantTones') ? 
        { participantTones: analysis.toneAnalysis.participantTones } : {})
    },
    communication: {
      // For free tier, simplify the patterns to just a few core insights
      patterns: tier === 'free' ? 
        // Limit to at most 2 patterns for free tier, and simplify them
        (analysis.communication.patterns || []).slice(0, 2).map(pattern => {
          // Simplify the pattern text to be more concise
          return pattern.split('.')[0] + '.'; // Take just the first sentence
        }) : 
        // For paid tiers, include all patterns
        analysis.communication.patterns || [],
    }
  };
  
  // Add health score if available (all tiers have this)
  if (analysis.healthScore) {
    filteredAnalysis.healthScore = analysis.healthScore;
  }
  
  // FREE TIER FEATURES:
  // - Overall Emotional Tone Summary (toneAnalysis.overallTone) - included above
  // - Conversation Health Meter (healthScore) - added above
  // - Basic Communication Insights (communication.patterns) - added above
  // - Key Summary Quotes (keyQuotes) - limited version
  
  if (tierFeatures.includes('keyQuotes') && analysis.keyQuotes) {
    // For free tier, limit to just 2 quotes without improvement suggestions
    if (tier === 'free') {
      filteredAnalysis.keyQuotes = analysis.keyQuotes
        .slice(0, 2)
        .map(quote => ({
          speaker: quote.speaker,
          quote: quote.quote,
          analysis: quote.analysis,
          // Free tier doesn't get improvement suggestions
        }));
    } else {
      // Other tiers get full quotes with improvements
      filteredAnalysis.keyQuotes = analysis.keyQuotes;
    }
  }
  
  // PERSONAL TIER FEATURES:
  if (tier === 'personal' || tier === 'pro' || tier === 'instant') {
    // Add red flags if available 
    if (tierFeatures.includes('redFlags') && analysis.redFlags) {
      filteredAnalysis.redFlags = analysis.redFlags;
    }
    
    // Add high tension factors (part of advancedToneAnalysis)
    if (tierFeatures.includes('advancedToneAnalysis') && analysis.highTensionFactors) {
      filteredAnalysis.highTensionFactors = analysis.highTensionFactors;
    }
    
    // Add participant conflict scores (part of communicationStyles)
    if (tierFeatures.includes('communicationStyles') && analysis.participantConflictScores) {
      filteredAnalysis.participantConflictScores = analysis.participantConflictScores;
    }
    
    // Add tension contributions (Individual Contributions to Tension)
    if (tierFeatures.includes('tensionContributions') && analysis.tensionContributions) {
      filteredAnalysis.tensionContributions = analysis.tensionContributions;
    }
    
    // Add tension meaning (What This Means section)
    if (tierFeatures.includes('tensionContributions') && analysis.tensionMeaning) {
      filteredAnalysis.tensionMeaning = analysis.tensionMeaning;
    }
    
    // Add personalized suggestions
    if (analysis.communication.suggestions) {
      filteredAnalysis.communication.suggestions = analysis.communication.suggestions;
    }
  }
  
  // PRO TIER & INSTANT DEEP DIVE ADDITIONAL FEATURES:
  if (tier === 'pro' || tier === 'instant') {
    // Add conversation dynamics (Conversation Dynamics & Behavioral Patterns)
    if (tierFeatures.includes('conversationDynamics') && analysis.communication.dynamics) {
      filteredAnalysis.communication.dynamics = analysis.communication.dynamics;
    }
    
    // Additional Pro/Instant features that would be added here if the API returned them:
    // - Evasion Identification (evasionIdentification)
    // - Message Dominance Analysis (messageDominance)
    // - Power Dynamics Analysis (powerDynamics)
    // - Historical Pattern Recognition (historicalPatterns)
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
  
  // FREE TIER FEATURES:
  // - Basic Tone (tone)
  // - Basic Intent Detection (intent)
  
  // PERSONAL TIER FEATURES:
  if (tier === 'personal' || tier === 'pro' || tier === 'instant') {
    // Add suggested reply (part of communication styles)
    if (analysis.suggestedReply) {
      filteredAnalysis.suggestedReply = analysis.suggestedReply;
    }
    
    // Add manipulation score 
    if (tierFeatures.includes('manipulationScore') && analysis.manipulationScore) {
      filteredAnalysis.manipulationScore = analysis.manipulationScore;
    }
    
    // Add communication style 
    if (tierFeatures.includes('communicationStyles') && analysis.communicationStyle) {
      filteredAnalysis.communicationStyle = analysis.communicationStyle;
    }
  }
  
  // PRO TIER & INSTANT DEEP DIVE ADDITIONAL FEATURES:
  if (tier === 'pro' || tier === 'instant') {
    // Add potential response (advanced analysis)
    if (analysis.potentialResponse) {
      filteredAnalysis.potentialResponse = analysis.potentialResponse;
    }
    
    // Add possible reword (advanced analysis)
    if (analysis.possibleReword) {
      filteredAnalysis.possibleReword = analysis.possibleReword;
    }
    
    // Add power dynamics
    if (tierFeatures.includes('powerDynamics') && analysis.powerDynamics) {
      filteredAnalysis.powerDynamics = analysis.powerDynamics;
    }
  }
  
  return filteredAnalysis;
}

/**
 * Filter de-escalate message results based on user's tier
 */
export function filterDeEscalateResultByTier(result: DeEscalateResult, tier: string): DeEscalateResult {
  // If tier doesn't exist, default to free
  const tierFeatures = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]?.features || TIER_LIMITS.free.features;
  
  // Create a filtered copy of the analysis
  const filteredResult: DeEscalateResult = {
    original: result.original,
    rewritten: result.rewritten,
    explanation: result.explanation,
  };
  
  // FREE TIER FEATURES:
  // - Original message (original)
  // - Rewritten message (rewritten)
  // - Basic explanation (explanation)
  
  // PERSONAL TIER FEATURES:
  if (tier === 'personal' || tier === 'pro' || tier === 'instant') {
    // Add alternative options (additional approaches)
    if (result.alternativeOptions) {
      filteredResult.alternativeOptions = result.alternativeOptions;
    }
  }
  
  // PRO TIER & INSTANT DEEP DIVE ADDITIONAL FEATURES:
  if (tier === 'pro' || tier === 'instant') {
    // Add additional context insights (deeper analysis)
    if (result.additionalContextInsights) {
      filteredResult.additionalContextInsights = result.additionalContextInsights;
    }
    
    // Add long term strategy (behavioral pattern recommendations)
    if (result.longTermStrategy) {
      filteredResult.longTermStrategy = result.longTermStrategy;
    }
  }
  
  return filteredResult;
}