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
  // - Red Flags Count (but not the details) - for conversion optimization
  
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
  
  // For free tier, the redFlagsCount should be added by the controller
  // This ensures data integrity by getting the count from a full personal tier analysis
  // We don't compute any red flags values in this service
  console.log('Red flags available in raw analysis:', !!analysis.redFlags);
  if (analysis.redFlags) {
    console.log('Raw red flags count:', analysis.redFlags.length);
  }
  
  // Add red flags for free tier as well (showing the actual red flags)
  if (tier === 'free' && analysis.redFlags && analysis.redFlags.length > 0) {
    // Include the actual red flags for the free tier too
    filteredAnalysis.redFlags = analysis.redFlags;
    console.log(`Adding ${filteredAnalysis.redFlags.length} red flags to free tier analysis`);
  }
  
  // The tier filter itself doesn't add redFlagsCount for free tier
  // This is done in the controller which has access to the personal tier analysis
  if (tier === 'free') {
    // Note: The controller will add the redFlagsCount property 
    // based on the actual personal tier analysis
    console.log('Free tier analysis will have redFlagsCount added by controller');
  }
  
  // PERSONAL TIER FEATURES:
  if (tier === 'personal' || tier === 'pro' || tier === 'instant') {
    // Add red flags if available 
    if (tierFeatures.includes('redFlags')) {
      // Make sure we always add redFlags to the filtered analysis, even if empty array
      const redFlags = analysis.redFlags || [];
      
      // For personal tier, ensure red flags ALWAYS have participant information
      if (tier === 'personal') {
        filteredAnalysis.redFlags = redFlags.map(flag => {
          // Add participant info based on the flag type if not already present
          if (!flag.participant) {
            // Get participant names from participantTones if available
            const participantNames = analysis.toneAnalysis?.participantTones ? 
              Object.keys(analysis.toneAnalysis.participantTones) : [];
            
            const participant1 = participantNames.length > 0 ? participantNames[0] : '';
            const participant2 = participantNames.length > 1 ? participantNames[1] : '';
            
            // Perform more detailed analysis of flag type to determine which participant
            const flagType = flag.type.toLowerCase();
            const flagDesc = flag.description.toLowerCase();

            // Check if description or type contains participant names
            const isParticipant1 = 
              (participant1 && (flagType.includes(participant1.toLowerCase()) || 
              flagDesc.includes(participant1.toLowerCase())));
              
            const isParticipant2 = 
              (participant2 && (flagType.includes(participant2.toLowerCase()) || 
              flagDesc.includes(participant2.toLowerCase())));

            // More specific checks for common behaviors 
            const narcissism = ['narcissism', 'self-centered', 'self-importance', 'grandiose'];
            const defensiveness = ['defensive', 'deflection', 'blame-shifting'];
            const stonewalling = ['stonewalling', 'withdrawal', 'silence', 'avoiding'];
            const criticism = ['criticism', 'contempt', 'insult', 'belittling'];
            const gaslighting = ['gaslighting', 'manipulation', 'invalidating'];
            
            // Check if specific behaviors are mentioned in relation to participants
            let participantInfo = 'Both participants';
            
            // More detailed linguistic analysis of the flag
            if (isParticipant1 && !isParticipant2) {
              participantInfo = participant1;
            } else if (isParticipant2 && !isParticipant1) {
              participantInfo = participant2;
            } else {
              // Fall back to analyzing the full context to determine participant
              // This helps with accuracy when participant names aren't directly mentioned
              const flagContext = (flag.type + ' ' + flag.description).toLowerCase();
              
              // If we have key quotes, they provide the most reliable attribution
              if (analysis.keyQuotes && analysis.keyQuotes.length > 0) {
                // Find quotes that may relate to this flag
                const relevantQuotes = analysis.keyQuotes.filter(quote => {
                  const quoteText = quote.quote.toLowerCase();
                  const quoteAnalysis = quote.analysis.toLowerCase();
                  
                  // Check if quote relates to this flag type
                  return narcissism.some(term => quoteAnalysis.includes(term) && flagType.includes(term)) ||
                         defensiveness.some(term => quoteAnalysis.includes(term) && flagType.includes(term)) ||
                         stonewalling.some(term => quoteAnalysis.includes(term) && flagType.includes(term)) ||
                         criticism.some(term => quoteAnalysis.includes(term) && flagType.includes(term)) ||
                         gaslighting.some(term => quoteAnalysis.includes(term) && flagType.includes(term));
                });
                
                if (relevantQuotes.length > 0) {
                  // Count attribution to each participant
                  const speakerCounts: Record<string, number> = {};
                  relevantQuotes.forEach(quote => {
                    speakerCounts[quote.speaker] = (speakerCounts[quote.speaker] || 0) + 1;
                  });
                  
                  // Assign to the participant with the most relevant quotes
                  const maxSpeaker = Object.entries(speakerCounts).reduce((max: [string, number], [speaker, count]) => 
                    count > max[1] ? [speaker, count] : max, ['', 0])[0];
                    
                  if (maxSpeaker) {
                    participantInfo = maxSpeaker;
                  }
                }
              }
            }
            
            return {
              ...flag,
              participant: participantInfo
            };
          }
          return flag;
        });
      } 
      // For pro tier, enhance with quotes and context
      else if (tier === 'pro' || tier === 'instant') {
        filteredAnalysis.redFlags = redFlags.map(flag => {
          // Try to find relevant quotes from key quotes if available
          let enhancedFlag = { 
            ...flag,
            participant: flag.participant || 'Both participants',
            examples: [] as {text: string, from: string}[]
          };
          
          // If we have key quotes, find all relevant quotes for this flag type
          if (analysis.keyQuotes && analysis.keyQuotes.length > 0) {
            // Find primary relevant quote
            const relevantQuote = analysis.keyQuotes.find(quote => {
              const quoteAnalysis = quote.analysis?.toLowerCase() || '';
              const flagType = flag.type.toLowerCase();
              
              return quoteAnalysis.includes(flagType) || 
                (flagType.includes('manipulation') && quoteAnalysis.includes('manipulat')) ||
                (flagType.includes('criticism') && quoteAnalysis.includes('critic')) ||
                (flagType.includes('defensive') && quoteAnalysis.includes('defens')) ||
                (flagType.includes('stonewalling') && quoteAnalysis.includes('avoid')) ||
                (flagType.includes('contempt') && quoteAnalysis.includes('disrespect'));
            });
            
            if (relevantQuote) {
              enhancedFlag.quote = relevantQuote.quote;
              enhancedFlag.participant = relevantQuote.speaker;
              enhancedFlag.context = relevantQuote.analysis;
              
              // Add to examples array
              enhancedFlag.examples.push({
                text: relevantQuote.quote,
                from: relevantQuote.speaker
              });
            }
            
            // Find additional supporting quotes (up to 2 more)
            const additionalQuotes = analysis.keyQuotes
              .filter(quote => {
                // Skip the already used primary quote
                if (relevantQuote && quote.quote === relevantQuote.quote) return false;
                
                const quoteAnalysis = quote.analysis?.toLowerCase() || '';
                const flagType = flag.type.toLowerCase();
                
                return quoteAnalysis.includes(flagType) || 
                  (flagType.includes('manipulation') && quoteAnalysis.includes('manipulat')) ||
                  (flagType.includes('criticism') && quoteAnalysis.includes('critic')) ||
                  (flagType.includes('defensive') && quoteAnalysis.includes('defens')) ||
                  (flagType.includes('stonewalling') && quoteAnalysis.includes('avoid')) ||
                  (flagType.includes('contempt') && quoteAnalysis.includes('disrespect'));
              })
              .slice(0, 2); // Limit to 2 additional quotes
            
            // Add additional quotes to examples array
            additionalQuotes.forEach(quote => {
              enhancedFlag.examples.push({
                text: quote.quote,
                from: quote.speaker
              });
            });
          }
          
          return enhancedFlag;
        });
      } 
      else {
        filteredAnalysis.redFlags = redFlags;
      }
      
      console.log(`Added ${filteredAnalysis.redFlags.length} enhanced red flags to ${tier} tier analysis`);
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