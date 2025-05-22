import { TIER_LIMITS, ChatAnalysisResult, MessageAnalysisResult, DeEscalateResult } from '@shared/schema';

/**
 * Filter chat analysis results based on user's tier
 * This ensures users only see features available in their subscription tier
 */
/**
 * Filter out stonewalling red flags based on conversation context
 * Using strict explicit blockers to prevent false positives
 */
function filterStonewalling(redFlags: any[], conversation?: string): any[] {
  if (!redFlags || redFlags.length === 0) return redFlags;
  if (!conversation) return redFlags;
  
  // Extract all messages for context analysis
  const lines = conversation.split('\n');
  const allMessages: {speaker: string, text: string}[] = [];
  
  lines.forEach(line => {
    if (!line.includes(':')) return;
    
    const [speaker, message] = line.split(':', 2);
    if (!speaker || !message) return;
    
    const speakerName = speaker.trim();
    const messageText = message.trim();
    
    allMessages.push({speaker: speakerName, text: messageText});
  });
  
  // Group messages by participant
  const messagesByParticipant: { [key: string]: {speaker: string, text: string}[] } = {};
  allMessages.forEach(msg => {
    if (!messagesByParticipant[msg.speaker]) {
      messagesByParticipant[msg.speaker] = [];
    }
    messagesByParticipant[msg.speaker].push(msg);
  });
  
  // Filter out inaccurate stonewalling flags
  return redFlags.filter(flag => {
    // Skip filtering non-stonewalling flags
    if (!flag.type?.toLowerCase().includes('stonewalling') && 
        !flag.description?.toLowerCase().includes('stonewalling') &&
        !flag.type?.toLowerCase().includes('withdrawal') && 
        !flag.description?.toLowerCase().includes('withdrawal')) {
      return true;
    }
    
    // Get the participant who's supposedly stonewalling
    const participant = flag.participant || flag.speaker;
    if (!participant) return true;
    
    // Check BLOCKER #1: Is the participant still responding?
    const participantMessages = messagesByParticipant[participant] || [];
    if (participantMessages.length >= 3) {
      // If they have 3+ messages, they're clearly not stonewalling
      console.log(`BLOCKER #1: Filtering stonewalling flag for ${participant} who has ${participantMessages.length} messages in the conversation`);
      return false;
    }
    
    // Check BLOCKER #2: Is the participant explaining or justifying?
    const hasExplanatoryContent = participantMessages.some(msg => 
      msg.text.match(/(that's not what|i didn't mean|i just want to|let me explain|i'm trying to|what i meant|all i said)/i)
    );
    if (hasExplanatoryContent) {
      console.log(`BLOCKER #2: Filtering stonewalling flag for ${participant} who is explaining or justifying`);
      return false;
    }
    
    // Check BLOCKER #3: Does the conversation end with questions or openness?
    if (participantMessages.length > 0) {
      const lastMessage = participantMessages[participantMessages.length - 1];
      const endsWithQuestion = lastMessage.text.includes('?');
      const showsOpenness = lastMessage.text.match(/(we can talk|let's discuss|i'm listening|tell me more|i hear you|i understand|maybe you're right|i see your point)/i);
      
      if (endsWithQuestion || showsOpenness) {
        console.log(`BLOCKER #3: Filtering stonewalling flag for ${participant} whose last message shows openness`);
        return false;
      }
    }
    
    return true;
  });
}

export function filterChatAnalysisByTier(analysis: ChatAnalysisResult, tier: string): ChatAnalysisResult {
  // Beta tier should get full Pro-level results without any filtering
  if (tier === 'beta') {
    console.log('Beta tier detected - returning complete unfiltered analysis');
    return analysis; // Return the original analysis without any modifications
  }
  
  // Define interface for the enhanced filtered analysis with all Pro tier features
  type EnhancedChatAnalysisResult = ChatAnalysisResult & {
    communicationPatternComparison?: Record<string, {pattern: string, example: string}[]>;
    relationshipHealthIndicators?: {
      currentScore: number;
      currentLabel: string;
      primaryConcerns: {
        issue: string;
        severity: number;
        participant: string;
      }[];
      patterns: {
        recurring: string[];
        escalating: string[];
        improving: string[];
      };
      projectedOutcome: string;
      recommendedFocus: string[];
    };
    personalizedGrowthRecommendations?: Record<string, {
      area: string;
      recommendation: string;
      example?: string;
    }[]>;
    redFlagsTimeline?: {
      overview: string;
      progression: {
        position: string;
        positionIndex: number;
        quoteIndex: number;
        type: string;
        description: string;
        severity: number;
        participant: string;
      }[];
      escalationPoints: {
        position: string;
        description: string;
        severityJump: number;
        participant: string;
      }[];
    };
    redFlags?: Array<{
      type: string;
      description?: string;
      severity?: number;
      participant?: string;
      examples?: Array<{
        text: string;
        from: string;
      }>;
      impact?: string;
      recommendedAction?: string;
      behavioralPattern?: string;
      progression?: string;
    }>;
    redFlagsDetected?: boolean;
  };
  // If tier doesn't exist, default to free
  const tierFeatures = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]?.features || TIER_LIMITS.free.features;
  
  // Create a filtered copy of the analysis with required fields
  const filteredAnalysis: EnhancedChatAnalysisResult = {
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
  // - Red Flag Types (high-level overview of potential issues) - for better user insights
  
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
  
  // For free tier, show high-level red flag types only
  // The controller will add these from the personal tier analysis 
  // For other tiers, show the appropriate level of detail
  console.log('Red flags available in raw analysis:', !!analysis.redFlags);
  if (analysis.redFlags) {
    console.log('Raw red flags count:', analysis.redFlags.length);
  }
  
  // For personal and higher tiers, include the red flags with appropriate details
  if (tier !== 'free' && analysis.redFlags && analysis.redFlags.length > 0) {
    // Include the full red flags for paid tiers
    // We'll filter them later in the controller using the red-flag-enhancer
    filteredAnalysis.redFlags = analysis.redFlags;
    console.log(`Adding ${analysis.redFlags.length} detailed red flags to ${tier} tier analysis`);
  }
  
  // Note: For free tier, the controller will add just the red flag types
  // This is done specifically so we can show basic types without detailed quotes/analysis
  if (tier === 'free') {
    console.log('Free tier will have high-level red flag types added by controller');
    // The redFlags array with just type and severity will be added by the controller
  }
  
  // PERSONAL TIER FEATURES:
  if (tier === 'personal' || tier === 'pro' || tier === 'instant' || tier === 'beta') {
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
      // For pro tier, enhance with quotes, context, and detailed analysis
      else if (tier === 'pro' || tier === 'instant' || tier === 'beta') {
        // Process each flag with more detailed, evidence-based analysis
        filteredAnalysis.redFlags = redFlags.map(flag => {
          // Create a base enhanced flag structure
          // First, try to get participant names from the analysis
          const participantNames = analysis.toneAnalysis?.participantTones ? 
            Object.keys(analysis.toneAnalysis.participantTones) : [];
          
          // Improve participant attribution for Beta tier
          let bestParticipant = flag.participant || 'Both participants';
          if (participantNames.length >= 2) {
            const flagType = flag.type.toLowerCase();
            const flagDesc = flag.description?.toLowerCase() || '';
            
            // Check if either participant name appears in the flag description
            const participant1 = participantNames[0];
            const participant2 = participantNames[1];
            
            if (flagDesc.includes(participant1.toLowerCase())) {
              bestParticipant = participant1;
            } else if (flagDesc.includes(participant2.toLowerCase())) {
              bestParticipant = participant2;
            } else if (analysis.keyQuotes && analysis.keyQuotes.length > 0) {
              // Try to match based on conversation quotes and patterns
              const participant1Quotes = analysis.keyQuotes.filter(q => q.speaker === participant1).length;
              const participant2Quotes = analysis.keyQuotes.filter(q => q.speaker === participant2).length;
              
              // If one participant dominates the quotes and this is a dominance/control flag
              if (['narcissism', 'power', 'manipulation', 'control'].some(term => flagType.includes(term))) {
                bestParticipant = participant1Quotes > participant2Quotes ? participant1 : participant2;
              }
            }
          }
          
          const enhancedFlag = { 
            ...flag,
            participant: bestParticipant,
            examples: [] as {text: string, from: string}[],
            impact: '', // Will add impact analysis
            progression: '', // Will add progression analysis
            recommendedAction: '', // Will add specific recommendations
            behavioralPattern: '', // Will add behavioral pattern analysis
            timelinePosition: '' // Will add position in conversation
          };
          
          // Generate severity text based on flag's severity
          const severityLevels = ['minor concern', 'moderate concern', 'significant concern', 
                                 'serious concern', 'critical concern'];
          const severityIndex = Math.min(Math.floor(flag.severity / 2), 4);
          const severityText = severityLevels[severityIndex];
          
          // ---- FIRST: Find relevant quotes from the conversation for this flag ----
          let relevantQuotes: any[] = [];
          let primaryQuote = null;
          
          if (analysis.keyQuotes && analysis.keyQuotes.length > 0) {
            // Create specific keywords to identify quotes related to this flag type
            const flagType = flag.type.toLowerCase();
            const flagDesc = flag.description?.toLowerCase() || '';
            
            // Create keyword maps for different flag types
            const keywordMap: Record<string, string[]> = {
              'manipulation': ['manipulat', 'pressure', 'guilt', 'force', 'insist', 'demand'],
              'gaslighting': ['reality', 'imagin', 'crazy', 'didn\'t happen', 'exaggerat', 'memory'],
              'stonewalling': ['silence', 'avoid', 'ignore', 'shut down', 'withdraw', 'talk'],
              'criticism': ['critic', 'always', 'never', 'wrong', 'fault', 'blame', 'accus'],
              'contempt': ['disrespect', 'dismissive', 'superior', 'mock', 'sarcas', 'condescend'],
              'defensiveness': ['defens', 'excuse', 'justify', 'not my fault', 'counter', 'blame'],
              'love bombing': ['love', 'forever', 'perfect', 'soul mate', 'destiny', 'meant to be'],
              'financial': ['money', 'loan', 'pay', 'fund', 'afford', 'help', 'invest', 'need'],
              'urgency': ['urgent', 'emergency', 'immediate', 'right away', 'can\'t wait', 'hurry']
            };
            
            // Find quotes related to this flag in analysis text
            relevantQuotes = analysis.keyQuotes.filter(quote => {
              const quoteAnalysis = quote.analysis?.toLowerCase() || '';
              
              // Direct match: quote analysis mentions flag type or description
              if (quoteAnalysis.includes(flagType) || 
                  flagDesc.split(' ').some(word => word.length > 4 && quoteAnalysis.includes(word))) {
                return true;
              }
              
              // Keyword match: quote analysis contains keywords associated with this flag type
              for (const [flagKey, keywords] of Object.entries(keywordMap)) {
                if (flagType.includes(flagKey)) {
                  if (keywords.some(keyword => quoteAnalysis.includes(keyword))) {
                    return true;
                  }
                }
              }
              
              // Content match: the quote itself contains keywords associated with this flag type
              const quoteText = quote.quote?.toLowerCase() || '';
              for (const [flagKey, keywords] of Object.entries(keywordMap)) {
                if (flagType.includes(flagKey)) {
                  if (keywords.some(keyword => quoteText.includes(keyword))) {
                    return true;
                  }
                }
              }
              
              return false;
            });
            
            // If we found relevant quotes, use the first one as primary and add others as examples
            if (relevantQuotes.length > 0) {
              primaryQuote = relevantQuotes[0];
              
              // Add all relevant quotes to examples array
              relevantQuotes.forEach(quote => {
                enhancedFlag.examples.push({
                  text: quote.quote,
                  from: quote.speaker
                });
              });
              
              // Set timeline position based on primary quote position
              const quoteIndex = analysis.keyQuotes.indexOf(primaryQuote);
              const totalQuotes = analysis.keyQuotes.length;
              
              if (quoteIndex < totalQuotes / 3) {
                enhancedFlag.timelinePosition = 'Early in conversation';
              } else if (quoteIndex < 2 * totalQuotes / 3) {
                enhancedFlag.timelinePosition = 'Mid-conversation';
              } else {
                enhancedFlag.timelinePosition = 'Late in conversation';
              }
            }
          }
          
          // Flag for whether we have concrete examples
          let hasExamples = relevantQuotes.length > 0;
          const primaryExample = hasExamples ? relevantQuotes[0].quote : '';
          const primarySpeaker = hasExamples ? relevantQuotes[0].speaker : enhancedFlag.participant;
          
          // If we have a specific example, use it to create a very specific impact analysis
          if (hasExamples && primaryExample && relevantQuotes && relevantQuotes.length > 0) {
            // Set speaker and text variables from the example
            const exampleSpeaker = relevantQuotes[0].speaker;
            const exampleText = relevantQuotes[0].quote;
            
            // Create a context-specific impact statement that references the actual quote
            if (flag.type.toLowerCase().includes('manipulation')) {
              enhancedFlag.impact = `When ${exampleSpeaker} says "${exampleText}", it creates emotional pressure and confusion in the conversation. This is a ${severityText} that makes it difficult to maintain clear boundaries.`;
            }
            else if (flag.type.toLowerCase().includes('gaslighting')) {
              enhancedFlag.impact = `The statement "${exampleText}" from ${exampleSpeaker} makes you question your perception of events, creating self-doubt. This is a ${severityText} that damages trust.`;
            }
            else if (flag.type.toLowerCase().includes('stonewalling')) {
              enhancedFlag.impact = `${exampleSpeaker}'s response "${exampleText}" prevents meaningful resolution of the issue at hand. This is a ${severityText} that leads to unresolved tensions.`;
            }
            else if (flag.type.toLowerCase().includes('criticism')) {
              enhancedFlag.impact = `The criticism in "${exampleText}" from ${exampleSpeaker} creates defensiveness and makes constructive dialogue difficult. This is a ${severityText} that can erode self-esteem.`;
            } 
            else if (flag.type.toLowerCase().includes('contempt')) {
              enhancedFlag.impact = `${exampleSpeaker}'s contemptuous tone in "${exampleText}" shows fundamental disrespect. This is a ${severityText} that can permanently damage relationship foundations.`;
            }
            else if (flag.type.toLowerCase().includes('defensiveness')) {
              enhancedFlag.impact = `When ${exampleSpeaker} responds with "${exampleText}", it blocks productive conversation by deflecting concerns. This is a ${severityText} that prevents genuine understanding.`;
            }
            else {
              // For any other flag type, still use the quote but with a more generic analysis
              enhancedFlag.impact = `${exampleSpeaker}'s communication in "${exampleText}" illustrates ${flag.type.toLowerCase()} behavior. This is a ${severityText} that creates tension in the relationship dynamic.`;
            }
          } else {
            // If we don't have specific examples, fall back to a more general but still contextual analysis
            enhancedFlag.impact = `This represents a ${severityText} in the communication dynamic. ` +
              `The ${flag.type} behavior exhibited by ${enhancedFlag.participant} creates tension and may lead to ` +
              `miscommunication if not addressed directly.`;
          }
          
          // Add progression analysis based on flag type with participant attribution
          const participant = enhancedFlag.participant;
          
          // Create participant-specific progression descriptions
          if (flag.type.toLowerCase().includes('manipulation')) {
            enhancedFlag.progression = `${participant}'s manipulation often begins subtly and intensifies over time as boundaries are tested.`;
          }
          else if (flag.type.toLowerCase().includes('gaslighting')) {
            enhancedFlag.progression = `${participant}'s gaslighting typically escalates as the recipient begins to question their own reality and memories.`;
          }
          else if (flag.type.toLowerCase().includes('stonewalling')) {
            enhancedFlag.progression = `${participant}'s stonewalling usually indicates a pattern of emotional withdrawal that deepens over time.`;
          }
          else if (flag.type.toLowerCase().includes('criticism')) {
            enhancedFlag.progression = `${participant}'s criticism frequently leads to defensiveness and can evolve into contempt if unchecked.`;
          }
          else if (flag.type.toLowerCase().includes('contempt')) {
            enhancedFlag.progression = `${participant}'s contempt often results from unresolved conflicts and represents a serious breakdown in respect.`;
          }
          else if (flag.type.toLowerCase().includes('defensiveness')) {
            enhancedFlag.progression = `${participant}'s defensiveness may develop into more harmful behaviors if accountability is not established.`;
          }
          else if (flag.type.toLowerCase().includes('power imbalance')) {
            enhancedFlag.progression = `The power imbalance favoring ${participant} tends to worsen as they become increasingly dominant in conversations.`;
          }
          else if (flag.type.toLowerCase().includes('respect issues')) {
            enhancedFlag.progression = `${participant}'s respect issues can gradually erode the foundation of mutual respect necessary for healthy communication.`;
          }
          else if (flag.type.toLowerCase().includes('emotional abuse')) {
            enhancedFlag.progression = `${participant}'s emotional abuse typically follows a cycle of intensity that may worsen without intervention.`;
          }
          
          // If no match was found, use a generic progression
          if (!enhancedFlag.progression) {
            enhancedFlag.progression = 'This behavior typically intensifies over time if not addressed directly.';
          }
          
          // Add recommended action based on flag type with participant context
          
          // Create personalized action recommendations with specific references to the conversation
          // If we have an example text from the conversation, use it to make the recommendation more specific
          if (hasExamples && flag.examples && flag.examples[0]?.text) {
            let exampleText = flag.examples[0].text;
            let shortenedExample = exampleText;
            // If the example is too long, truncate it for a cleaner recommendation
            if (shortenedExample.length > 40) {
              shortenedExample = shortenedExample.substring(0, 37) + '...';
            }
            
            if (flag.type.toLowerCase().includes('manipulation')) {
              enhancedFlag.recommendedAction = `When ${participant} uses manipulation tactics like "${shortenedExample}", establish clear boundaries by responding: "I need you to tell me directly what you want rather than creating emotional pressure."`;
            }
            else if (flag.type.toLowerCase().includes('gaslighting')) {
              enhancedFlag.recommendedAction = `When ${participant} says things like "${shortenedExample}" that make you question your reality, validate your experience: "I know what I experienced, and I'm confident in my perception of events."`;
            }
            else if (flag.type.toLowerCase().includes('stonewalling')) {
              enhancedFlag.recommendedAction = `When ${participant} responds with "${shortenedExample}", acknowledge the withdrawal: "I notice you're shutting down. Let's take a short break and come back to this conversation when we're both ready to engage."`;
            }
            else if (flag.type.toLowerCase().includes('criticism')) {
              enhancedFlag.recommendedAction = `When ${participant} criticizes with statements like "${shortenedExample}", request specific feedback: "I feel hurt by that characterization. Could you focus on specific behaviors that concern you rather than generalizing?"`;
            }
            else if (flag.type.toLowerCase().includes('contempt')) {
              enhancedFlag.recommendedAction = `When ${participant} shows contempt through comments like "${shortenedExample}", address the disrespect: "I find that tone disrespectful. I'd like us to communicate with mutual respect even when we disagree."`;
            }
            else if (flag.type.toLowerCase().includes('defensiveness')) {
              enhancedFlag.recommendedAction = `When ${participant} becomes defensive with "${shortenedExample}", try validating their feelings first: "I can see this feels challenging. I'm trying to share my perspective, not attack you. Can we approach this as a team?"`;
            }
            else if (flag.type.toLowerCase().includes('power imbalance')) {
              enhancedFlag.recommendedAction = `When ${participant} dominates with comments like "${shortenedExample}", establish balance: "I'd like to make sure we both have equal opportunity to express ourselves. Let's take turns sharing our thoughts fully."`;
            }
            else if (flag.type.toLowerCase().includes('respect issues')) {
              enhancedFlag.recommendedAction = `When ${participant} communicates disrespectfully with "${shortenedExample}", set expectations: "I need us to communicate with mutual respect. That comment felt disrespectful to me."`;
            }
            else if (flag.type.toLowerCase().includes('emotional abuse')) {
              enhancedFlag.recommendedAction = `When ${participant} says harmful things like "${shortenedExample}", set firm boundaries: "That type of communication is hurtful. I need us to find healthier ways to discuss our concerns or take a break."`;
            }
            else if (flag.type.toLowerCase().includes('love bombing')) {
              enhancedFlag.recommendedAction = `When ${participant} uses excessive flattery like "${shortenedExample}", slow things down: "I appreciate your enthusiasm, but I prefer to build connection gradually as we get to know each other better."`;
            }
            else if (flag.type.toLowerCase().includes('financial')) {
              enhancedFlag.recommendedAction = `When ${participant} brings up money with "${shortenedExample}", maintain clear boundaries: "I'm not comfortable discussing financial assistance at this stage of our relationship."`;
            }
            else {
              // For other flag types, still reference the specific example
              enhancedFlag.recommendedAction = `When ${participant} communicates with "${shortenedExample}", address the concern directly: "I notice a pattern that makes me uncomfortable. Can we discuss how to communicate more constructively about this topic?"`;
            }
          } else {
            // If we don't have specific examples, use more general but still tailored recommendations
            if (flag.type.toLowerCase().includes('manipulation')) {
              enhancedFlag.recommendedAction = `When ${participant} uses manipulation tactics, establish clear boundaries and request direct communication without hidden agendas. Example response: "I need you to tell me directly what you want rather than trying to make me feel guilty."`;
            }
            else if (flag.type.toLowerCase().includes('gaslighting')) {
              enhancedFlag.recommendedAction = `To address ${participant}'s gaslighting behavior, document incidents and seek validation from trusted sources about your perceptions. Consider saying: "I know what I experienced, and I'm not willing to question my reality."`;
            }
            else if (flag.type.toLowerCase().includes('stonewalling')) {
              enhancedFlag.recommendedAction = `When ${participant} stonewalls, request time-outs with an agreement to revisit the topic later. Try: "I notice you're shutting down. Let's take 30 minutes to cool off and agree to continue this conversation afterward."`;
            }
            else if (flag.type.toLowerCase().includes('criticism')) {
              enhancedFlag.recommendedAction = `Address ${participant}'s criticism by requesting specific behaviors rather than character judgments. Respond with: "I feel hurt when you criticize who I am instead of discussing specific actions that bother you."`;
            }
            else if (flag.type.toLowerCase().includes('contempt')) {
              enhancedFlag.recommendedAction = `For ${participant}'s contemptuous behavior, address the underlying disrespect directly: "I notice there's a tone of disrespect in our conversations. We need to discuss how we can communicate with more respect."`;
            }
            else if (flag.type.toLowerCase().includes('defensiveness')) {
              enhancedFlag.recommendedAction = `When ${participant} becomes defensive, acknowledge their perspective first: "I understand you may feel criticized. I'm trying to express my feelings, not attack you. Can we both practice listening without immediately defending?"`;
            }
            else if (flag.type.toLowerCase().includes('power imbalance')) {
              enhancedFlag.recommendedAction = `To balance the power dynamic with ${participant}, establish equal conversation guidelines: "I notice one person often dominates our discussions. Can we agree that each of us gets equal time to share our thoughts without interruption?"`;
            }
            else if (flag.type.toLowerCase().includes('respect issues')) {
              enhancedFlag.recommendedAction = `Address respect issues with ${participant} by explicitly discussing expectations: "I need us to agree on what respectful communication looks like. When you [specific behavior], it feels disrespectful to me."`;
            }
            else if (flag.type.toLowerCase().includes('emotional abuse')) {
              enhancedFlag.recommendedAction = `${participant}'s emotionally abusive behavior requires firm boundaries and possibly professional help. Prioritize your emotional safety with statements like: "This type of communication is harmful, and I won't participate in it. I need us to get professional support."`;
            }
            else {
              // For any other flag type
              enhancedFlag.recommendedAction = `Address this behavior from ${participant} directly in a calm moment, using specific examples and focusing on impact rather than intent.`;
            }
          }
          
          // Add behavioral pattern analysis with specific attribution and context
          
          // Create detailed behavioral pattern analysis with participant names and examples from the conversation
          
          // If we already have example text from earlier processing, use it for contextual analysis
          if (hasExamples && flag.examples && flag.examples[0]?.text) {
            const exampleText = flag.examples[0].text;
            // Create specific behavioral pattern analysis using actual conversation examples
            if (flag.type.toLowerCase().includes('manipulation')) {
              enhancedFlag.behavioralPattern = `When ${participant} says "${exampleText}", it creates emotional pressure to influence your choices. This manipulation suggests a pattern of using subtle tactics rather than direct requests to get what ${participant} wants.`;
            }
            else if (flag.type.toLowerCase().includes('gaslighting')) {
              enhancedFlag.behavioralPattern = `${participant}'s statement "${exampleText}" makes you question your own perceptions. This reality-distorting pattern reflects a tendency to avoid accountability by making you doubt your judgment.`;
            }
            else if (flag.type.toLowerCase().includes('stonewalling')) {
              enhancedFlag.behavioralPattern = `When ${participant} responds with "${exampleText}", it shuts down meaningful conversation. This avoidance pattern likely emerges whenever difficult topics arise, preventing resolution of issues.`;
            }
            else if (flag.type.toLowerCase().includes('criticism')) {
              enhancedFlag.behavioralPattern = `The criticism in "${exampleText}" from ${participant} attacks character rather than addressing specific behaviors. This pattern suggests a tendency to express dissatisfaction through blame rather than constructive feedback.`;
            }
            else if (flag.type.toLowerCase().includes('contempt')) {
              enhancedFlag.behavioralPattern = `${participant}'s contemptuous tone in "${exampleText}" shows fundamental disrespect. This destructive pattern indicates an underlying negative view of you that influences how ${participant} responds to disagreements.`;
            }
            else if (flag.type.toLowerCase().includes('defensiveness')) {
              enhancedFlag.behavioralPattern = `${participant}'s defensive response "${exampleText}" deflects responsibility. This self-protection pattern emerges when ${participant} feels criticized, blocking productive dialogue about concerns.`;
            }
            else if (flag.type.toLowerCase().includes('power imbalance')) {
              enhancedFlag.behavioralPattern = `The power dynamic shown in "${exampleText}" reveals how ${participant} maintains control in conversations. This pattern suggests an established role distribution that may exist throughout your interactions.`;
            }
            else if (flag.type.toLowerCase().includes('respect issues')) {
              enhancedFlag.behavioralPattern = `${participant}'s disrespectful communication in "${exampleText}" indicates an underlying issue with how ${participant} views your relationship. This suggests a pattern of unequal regard that affects multiple interactions.`;
            }
            else if (flag.type.toLowerCase().includes('emotional abuse')) {
              enhancedFlag.behavioralPattern = `${participant}'s emotionally harmful statement "${exampleText}" is concerning. This abusive pattern can cause lasting psychological impact and may escalate if not addressed directly.`;
            }
            else if (flag.type.toLowerCase().includes('love bombing')) {
              enhancedFlag.behavioralPattern = `${participant}'s excessive flattery in "${exampleText}" artificially accelerates intimacy. This pattern often occurs early in relationships to create quick emotional bonds before showing less positive behavior.`;
            }
            else if (flag.type.toLowerCase().includes('financial')) {
              enhancedFlag.behavioralPattern = `${participant}'s focus on money in "${exampleText}" establishes a concerning dynamic. This pattern can create financial dependence or obligation that complicates the relationship.`;
            }
            else {
              // For any other flag type with an example
              enhancedFlag.behavioralPattern = `${participant}'s communication pattern shown in "${exampleText}" reflects a potentially problematic dynamic in your interaction. This behavior likely influences other aspects of your relationship as well.`;
            }
          } else {
            // If we don't have specific examples to reference, use these more general patterns
            if (flag.type.toLowerCase().includes('manipulation')) {
              enhancedFlag.behavioralPattern = `${participant}'s manipulation is part of a control-seeking behavioral pattern that likely appears in other contexts beyond this conversation. When feeling insecure or threatened, ${participant} may use emotional leverage to maintain control.`;
            }
            else if (flag.type.toLowerCase().includes('gaslighting')) {
              enhancedFlag.behavioralPattern = `${participant}'s gaslighting connects to a deeper need to maintain control by destabilizing your perception of reality. This pattern often emerges when ${participant} feels challenged or when accountability is requested.`;
            }
            else if (flag.type.toLowerCase().includes('stonewalling')) {
              enhancedFlag.behavioralPattern = `${participant}'s stonewalling reflects established avoidance patterns that likely stem from anxiety, overwhelm, or conflict aversion. This is a protective mechanism ${participant} uses when feeling emotionally flooded.`;
            }
            else if (flag.type.toLowerCase().includes('criticism')) {
              enhancedFlag.behavioralPattern = `${participant}'s critical approach often indicates perfectionist tendencies or unmet expectations. This pattern suggests ${participant} may struggle with direct requests and instead expresses needs through criticism.`;
            }
            else if (flag.type.toLowerCase().includes('contempt')) {
              enhancedFlag.behavioralPattern = `The contempt shown by ${participant} suggests deep-seated resentment that has built up over time. This is among the most destructive patterns and indicates ${participant} may be viewing you with a sense of superiority.`;
            }
            else if (flag.type.toLowerCase().includes('defensiveness')) {
              enhancedFlag.behavioralPattern = `${participant}'s defensiveness is part of established self-protection strategies that avoid vulnerability. When ${participant} feels criticized, this pattern activates automatically as a shield against perceived attacks.`;
            }
            else if (flag.type.toLowerCase().includes('power imbalance')) {
              enhancedFlag.behavioralPattern = `This power dynamic favoring ${participant} reflects established roles that likely exist throughout your relationship. The conversation shows how ${participant} maintains control through subtle dominance tactics.`;
            }
            else if (flag.type.toLowerCase().includes('respect issues')) {
              enhancedFlag.behavioralPattern = `${participant}'s respect issues indicate underlying beliefs about relationship hierarchy. This pattern suggests ${participant} may not view the relationship as one between equals.`;
            }
            else if (flag.type.toLowerCase().includes('emotional abuse')) {
              enhancedFlag.behavioralPattern = `${participant}'s emotionally abusive behavior is part of a larger pattern of control and domination. This is not isolated and suggests a concerning pattern that may escalate if not addressed directly.`;
            }
            else {
              // For any other flag type without specific examples
              enhancedFlag.behavioralPattern = `${participant}'s behavior suggests a pattern that may appear in multiple contexts within your relationship. The specific nature of the communication indicates it's likely not an isolated incident.`;
            }
          }
          
          // Move this quote finding process earlier, before we try to create contextual analysis
          // We need to find these examples first, so we can use them in our impact/behavioral analysis
          
          // First, find all relevant quotes for this flag type and create detailed examples
          if (analysis.keyQuotes && analysis.keyQuotes.length > 0) {
            // Define keywords based on flag type to use in multiple detection approaches
            const keywordMap: Record<string, string[]> = {
              'manipulation': ['manipulat', 'pressure', 'guilt', 'force', 'insist', 'demand'],
              'gaslighting': ['reality', 'imagin', 'crazy', 'didn\'t happen', 'exaggerat', 'overreact', 'memory'],
              'stonewalling': ['silence', 'avoid', 'ignore', 'shut down', 'withdraw', 'refuse', 'talk'],
              'criticism': ['critic', 'always', 'never', 'wrong', 'fault', 'blame', 'accus', 'shame'],
              'contempt': ['disrespect', 'dismissive', 'superior', 'eye roll', 'mock', 'sarcas', 'condescend'],
              'defensiveness': ['defens', 'excuse', 'justify', 'not my fault', 'counter', 'blame', 'deny'],
              'love bombing': ['love', 'forever', 'perfect', 'soul mate', 'destiny', 'meant to be', 'never felt'],
              'financial': ['money', 'loan', 'pay', 'fund', 'afford', 'help', 'invest', 'need', 'urgent'],
              'urgency': ['need now', 'urgent', 'emergency', 'immediate', 'right away', 'can\'t wait', 'hurry']
            };
            
            // Extract key words from the flag type and description
            const flagType = flag.type.toLowerCase();
            const flagDesc = flag.description?.toLowerCase() || '';
            
            // Match based on AI-generated keywords first, then add specific keyword matching
            // This is a two-pass approach for maximum accuracy
            
            // ---- PASS 1: Match based on direct flag type & description in quote analysis ----
            let primaryQuotes = analysis.keyQuotes.filter(quote => {
              const quoteAnalysis = quote.analysis?.toLowerCase() || '';
              
              // Direct matches for flag type and description
              const directMatch = quoteAnalysis.includes(flagType) || 
                flagDesc.split(' ').some(word => word.length > 4 && quoteAnalysis.includes(word));
                
              if (directMatch) return true;
              
              // Check for type-specific keywords in the quote analysis
              // Find the relevant keyword list for this flag type
              for (const [flagKey, keywords] of Object.entries(keywordMap)) {
                if (flagType.includes(flagKey)) {
                  // If any keyword is found in the quote analysis, it's relevant
                  if (keywords.some(keyword => quoteAnalysis.includes(keyword))) {
                    return true;
                  }
                }
              }
              
              return false;
            });
            
            // ---- PASS 2: If we don't have matches yet, do a direct check of message content ----
            if (primaryQuotes.length === 0) {
              primaryQuotes = analysis.keyQuotes.filter(quote => {
                const quoteText = quote.quote?.toLowerCase() || '';
                
                // Check for type-specific keywords in the direct quote text
                for (const [flagKey, keywords] of Object.entries(keywordMap)) {
                  if (flagType.includes(flagKey)) {
                    // If any keyword is found in the quote text, it's relevant
                    if (keywords.some(keyword => quoteText.includes(keyword))) {
                      return true;
                    }
                  }
                }
                
                return false;
              });
            }
            
            // ---- PASS 3: If still no matches, use flag-specific criteria ----
            if (primaryQuotes.length === 0) {
              // Special case for love bombing: look for excessive affection/flattery
              if (flagType.includes('love bomb') || flagDesc.includes('flattery')) {
                primaryQuotes = analysis.keyQuotes.filter(quote => {
                  const quoteText = quote.quote?.toLowerCase() || '';
                  return quoteText.includes('love') || 
                         quoteText.includes('beautiful') || 
                         quoteText.includes('perfect') || 
                         quoteText.includes('amazing') ||
                         quoteText.includes('special');
                });
              }
              // Special case for financial manipulation
              else if (flagType.includes('financial') || flagType.includes('money')) {
                primaryQuotes = analysis.keyQuotes.filter(quote => {
                  const quoteText = quote.quote?.toLowerCase() || '';
                  return quoteText.includes('money') || 
                         quoteText.includes('pay') || 
                         quoteText.includes('dollar') || 
                         quoteText.includes('loan') ||
                         quoteText.includes('help') ||
                         quoteText.includes('need');
                });
              }
            }
            
            // If we found relevant quotes, add them as examples
            if (primaryQuotes.length > 0) {
              // Take the first match as primary for detailed analysis
              const relevantQuote = primaryQuotes[0];
              
              // Use this quote as the main example for our enhanced flag
              enhancedFlag.quote = relevantQuote.quote;
              enhancedFlag.participant = relevantQuote.speaker;
              enhancedFlag.context = relevantQuote.analysis || `This message shows ${flag.type.toLowerCase()} behavior.`;
              
              // Add this to our examples array for consistency
              enhancedFlag.examples.push({
                text: relevantQuote.quote,
                from: relevantQuote.speaker
              });
              
              // Set the timeline position based on where this quote appears
              const quoteIndex = analysis.keyQuotes.indexOf(relevantQuote);
              const totalQuotes = analysis.keyQuotes.length;
              
              if (quoteIndex < totalQuotes / 3) {
                enhancedFlag.timelinePosition = 'Early in conversation';
              } else if (quoteIndex < 2 * totalQuotes / 3) {
                enhancedFlag.timelinePosition = 'Mid-conversation';
              } else {
                enhancedFlag.timelinePosition = 'Late in conversation';
              }
              
              // Add additional quotes as examples (up to 2 more for Pro tier)
              const additionalQuotes = primaryQuotes
                .filter(quote => quote.quote !== relevantQuote.quote)
                .slice(0, 2);
                
              additionalQuotes.forEach(quote => {
                enhancedFlag.examples.push({
                  text: quote.quote,
                  from: quote.speaker
                });
              });
              
              // Update our flag to indicate we found examples
              hasExamples = true;
            }
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
  if (tier === 'pro' || tier === 'instant' || tier === 'beta') {
    // Add communication pattern comparison (showing side-by-side patterns of participants)
    if (tierFeatures.includes('communicationStyles') && analysis.toneAnalysis.participantTones) {
      const participantNames = Object.keys(analysis.toneAnalysis.participantTones);
      
      // Create a comparison of communication patterns if we have key quotes
      if (participantNames.length >= 2 && analysis.keyQuotes && analysis.keyQuotes.length > 0) {
        // Initialize communication pattern comparison object
        filteredAnalysis.communicationPatternComparison = {} as Record<string, {pattern: string, example: string}[]>;
        
        // Group quotes by speaker
        const quotesByParticipant: Record<string, any[]> = {};
        participantNames.forEach(name => { quotesByParticipant[name] = []; });
        
        analysis.keyQuotes.forEach(quote => {
          if (quotesByParticipant[quote.speaker]) {
            quotesByParticipant[quote.speaker].push(quote);
          }
        });
        
        // Analyze patterns for each participant
        participantNames.forEach(participant => {
          const quotes = quotesByParticipant[participant] || [];
          
          // Skip if no quotes
          if (quotes.length === 0) return;
          
          // Analyze communication patterns
          const patterns: { pattern: string, example: string }[] = [];
          
          // Extract patterns from quote analysis
          const patternKeywords = [
            'defensive', 'critical', 'dismissive', 'supportive', 
            'empathetic', 'direct', 'passive', 'aggressive', 
            'manipulative', 'open', 'closed', 'honest'
          ];
          
          // Find patterns in quote analysis
          quotes.forEach(quote => {
            const analysis = quote.analysis.toLowerCase();
            
            patternKeywords.forEach(keyword => {
              if (analysis.includes(keyword) && 
                  !patterns.some(p => p.pattern.toLowerCase().includes(keyword))) {
                patterns.push({
                  pattern: `${keyword.charAt(0).toUpperCase()}${keyword.slice(1)} communication style`,
                  example: quote.quote
                });
              }
            });
          });
          
          // Add identified patterns to comparison
          filteredAnalysis.communicationPatternComparison[participant] = patterns.slice(0, 3);
        });
      }
    }
    
    // Add relationship health indicators with trend projections
    if (analysis.healthScore) {
      const score = analysis.healthScore.score;
      const label = analysis.healthScore.label;
      
      // Create enhanced health indicators with forward-looking projections
      filteredAnalysis.relationshipHealthIndicators = {
        currentScore: score,
        currentLabel: label,
        primaryConcerns: [],
        patterns: {
          recurring: [],
          escalating: [],
          improving: []
        },
        projectedOutcome: '',
        recommendedFocus: []
      };
      
      // Add primary concerns based on red flags
      if (analysis.redFlags && analysis.redFlags.length > 0) {
        // Get top 3 most severe red flags
        const topConcerns = [...analysis.redFlags]
          .sort((a, b) => b.severity - a.severity)
          .slice(0, 3);
        
        filteredAnalysis.relationshipHealthIndicators.primaryConcerns = 
          topConcerns.map(flag => ({
            issue: flag.type,
            severity: flag.severity,
            participant: flag.participant || "Both participants"
          }));
      }
      
      // Add recommendation focus areas based on health score
      if (score < 40) {
        filteredAnalysis.relationshipHealthIndicators.projectedOutcome = 
          "This relationship shows significant strain that may lead to further deterioration without intervention.";
        filteredAnalysis.relationshipHealthIndicators.recommendedFocus = [
          "Consider professional counseling to address fundamental communication issues",
          "Establish clear boundaries and expectations",
          "Focus on rebuilding core trust and respect"
        ];
      } else if (score < 60) {
        filteredAnalysis.relationshipHealthIndicators.projectedOutcome = 
          "With consistent effort, this relationship could improve, but current patterns need addressing.";
        filteredAnalysis.relationshipHealthIndicators.recommendedFocus = [
          "Practice active listening techniques in difficult conversations",
          "Develop healthy conflict resolution strategies",
          "Acknowledge and address recurring tension points"
        ];
      } else if (score < 80) {
        filteredAnalysis.relationshipHealthIndicators.projectedOutcome = 
          "This relationship has a positive foundation but requires maintenance to address emerging issues.";
        filteredAnalysis.relationshipHealthIndicators.recommendedFocus = [
          "Continue building on established communication strengths",
          "Address minor issues before they become larger problems",
          "Deepen understanding of each other's communication styles"
        ];
      } else {
        filteredAnalysis.relationshipHealthIndicators.projectedOutcome = 
          "This relationship shows healthy dynamics with strong potential for continued positive growth.";
        filteredAnalysis.relationshipHealthIndicators.recommendedFocus = [
          "Maintain open communication during life transitions",
          "Continue validating each other's perspectives",
          "Build resilience by addressing small concerns together"
        ];
      }
      
      // Add recurring patterns based on communication dynamics
      if (analysis.communication.patterns) {
        const patterns = analysis.communication.patterns;
        
        // Classify patterns based on content
        const negativePatterns = patterns.filter(p => 
          p.toLowerCase().includes('criticism') || 
          p.toLowerCase().includes('defensive') || 
          p.toLowerCase().includes('contempt') || 
          p.toLowerCase().includes('stonewalling')
        );
        
        const positivePatterns = patterns.filter(p => 
          p.toLowerCase().includes('support') || 
          p.toLowerCase().includes('validat') || 
          p.toLowerCase().includes('listen') || 
          p.toLowerCase().includes('understand')
        );
        
        // Add to appropriate categories
        if (negativePatterns.length > 0) {
          filteredAnalysis.relationshipHealthIndicators.patterns.recurring = 
            negativePatterns.slice(0, 2);
        }
        
        if (positivePatterns.length > 0) {
          filteredAnalysis.relationshipHealthIndicators.patterns.improving = 
            positivePatterns.slice(0, 2);
        }
      }
    }
    
    // Add personalized growth recommendations for each participant
    if (analysis.toneAnalysis.participantTones) {
      const participantNames = Object.keys(analysis.toneAnalysis.participantTones);
      
      // Initialize personalized recommendations
      filteredAnalysis.personalizedGrowthRecommendations = {} as Record<string, {area: string, recommendation: string, example?: string}[]>;
      
      // Create recommendations for each participant
      participantNames.forEach(participant => {
        // Get participant's tone
        const tone = analysis.toneAnalysis.participantTones?.[participant] || '';
        
        // Create tailored recommendations based on tone and red flags
        const recommendations: {area: string, recommendation: string, example?: string}[] = [];
        
        // Add recommendations based on tone
        if (tone.toLowerCase().includes('defensive')) {
          recommendations.push({
            area: 'Emotional Awareness',
            recommendation: `${participant}, practice recognizing when you feel defensive and take a pause before responding. This will help you respond rather than react.`,
            example: 'When feeling criticized, try saying: "I need a moment to think about this" instead of immediately defending yourself.'
          });
        } else if (tone.toLowerCase().includes('critical')) {
          recommendations.push({
            area: 'Communication Style',
            recommendation: `${participant}, focus on expressing needs directly rather than through criticism. This shifts conversation from blame to problem-solving.`,
            example: 'Instead of "You never listen to me," try "I feel unheard when I am interrupted. Could we agree to let each other finish speaking?"'
          });
        } else if (tone.toLowerCase().includes('withdraw') || tone.toLowerCase().includes('avoid')) {
          recommendations.push({
            area: 'Engagement Patterns',
            recommendation: `${participant}, practice staying present in difficult conversations by focusing on small timeframes. Commit to staying engaged for just 5 minutes initially.`,
            example: 'When feeling overwhelmed, say: "This is important to me, but I am feeling overwhelmed. Can we talk for 5 minutes now and then take a short break?"'
          });
        }
        
        // Add recommendations based on red flags
        if (analysis.redFlags) {
          const participantFlags = analysis.redFlags.filter(flag => 
            flag.participant === participant
          );
          
          // Process participant-specific red flags
          participantFlags.forEach(flag => {
            if (flag.type.toLowerCase().includes('manipulation')) {
              recommendations.push({
                area: 'Direct Communication',
                recommendation: `${participant}, practice expressing needs and desires directly rather than through indirect means. This builds trust and clarity.`,
                example: 'Instead of hinting or using guilt, try: "I would really like to spend time together this weekend. Are you available?"'
              });
            } else if (flag.type.toLowerCase().includes('stonewalling')) {
              recommendations.push({
                area: 'Emotional Regulation',
                recommendation: `${participant}, develop a "time-out" signal for when you feel emotionally flooded, with an agreed time to resume the conversation.`,
                example: 'When feeling overwhelmed: "I am feeling too overwhelmed to continue this conversation productively. Can we take 20 minutes and come back to this?"'
              });
            }
          });
        }
        
        // Ensure we have at least one recommendation
        if (recommendations.length === 0) {
          recommendations.push({
            area: 'Active Listening',
            recommendation: `${participant}, enhance connection through reflective listening by paraphrasing what you have heard before responding.`,
            example: 'Try saying: "If I understand correctly, you are saying that... Is that right?"'
          });
        }
        
        // Limit to 3 recommendations
        filteredAnalysis.personalizedGrowthRecommendations[participant] = recommendations.slice(0, 3);
      });
    }
    
    // Add red flags timeline with progressive tracking
    if (tierFeatures.includes('redFlagsTimeline') && analysis.redFlags && analysis.redFlags.length > 0 && analysis.keyQuotes) {
      // Create timeline structure
      filteredAnalysis.redFlagsTimeline = {
        overview: "Analysis of how concerning behaviors developed during the conversation",
        progression: [] as {
          position: string, 
          positionIndex: number,
          quoteIndex: number,
          type: string,
          description: string,
          severity: number,
          participant: string
        }[],
        escalationPoints: [] as {
          position: string,
          description: string,
          severityJump: number,
          participant: string
        }[]
      };
      
      // Create a timeline mapping of quotes
      const timelineMap: Record<string, {
        position: string, 
        index: number,
        quotes: any[]
      }> = {
        'early': { position: 'Early in conversation', index: 0, quotes: [] },
        'mid': { position: 'Mid-conversation', index: 1, quotes: [] },
        'late': { position: 'Late in conversation', index: 2, quotes: [] }
      };
      
      // Determine position of each quote
      const totalQuotes = analysis.keyQuotes.length;
      analysis.keyQuotes.forEach((quote, index) => {
        if (index < totalQuotes / 3) {
          timelineMap['early'].quotes.push({...quote, index});
        } else if (index < 2 * totalQuotes / 3) {
          timelineMap['mid'].quotes.push({...quote, index});
        } else {
          timelineMap['late'].quotes.push({...quote, index});
        }
      });
      
      // Match red flags to timeline positions
      analysis.redFlags.forEach(flag => {
        // Default position if we can't determine
        let position = 'Unknown';
        let positionIndex = 3;
        let quoteIndex = -1;
        
        // Try to find where this flag appears in the conversation
        const flagText = flag.description.toLowerCase();
        
        // Look through all quotes to find relevant ones
        for (const [timeKey, timeData] of Object.entries(timelineMap)) {
          const matchingQuote = timeData.quotes.find(quote => {
            const quoteText = quote.quote.toLowerCase();
            const quoteAnalysis = quote.analysis.toLowerCase();
            
            return quoteText.includes(flagText) || 
                   quoteAnalysis.includes(flagText) ||
                   quoteAnalysis.includes(flag.type.toLowerCase());
          });
          
          if (matchingQuote) {
            position = timeData.position;
            positionIndex = timeData.index;
            quoteIndex = matchingQuote.index;
            break;
          }
        }
        
        // Add to progression timeline
        filteredAnalysis.redFlagsTimeline.progression.push({
          position,
          positionIndex,
          quoteIndex,
          type: flag.type,
          description: flag.description,
          severity: flag.severity,
          participant: flag.participant || 'Unknown'
        });
      });
      
      // Sort by position and then by quote index
      filteredAnalysis.redFlagsTimeline.progression.sort((a, b) => {
        if (a.positionIndex !== b.positionIndex) {
          return a.positionIndex - b.positionIndex;
        }
        return a.quoteIndex - b.quoteIndex;
      });
      
      // Identify escalation points
      if (filteredAnalysis.redFlagsTimeline.progression.length > 1) {
        for (let i = 1; i < filteredAnalysis.redFlagsTimeline.progression.length; i++) {
          const current = filteredAnalysis.redFlagsTimeline.progression[i];
          const previous = filteredAnalysis.redFlagsTimeline.progression[i-1];
          
          // Check for escalation in severity
          if (current.severity > previous.severity + 1) {
            filteredAnalysis.redFlagsTimeline.escalationPoints.push({
              position: current.position,
              description: `Significant escalation from "${previous.type}" (${previous.severity}/10) to "${current.type}" (${current.severity}/10)`,
              severityJump: current.severity - previous.severity,
              participant: current.participant
            });
          }
        }
      }
    }
    
    // Add conversation dynamics (Conversation Dynamics & Behavioral Patterns)
    if (tierFeatures.includes('conversationDynamics') && analysis.communication.dynamics) {
      // Enhance dynamics with more detailed analysis and examples
      if (typeof analysis.communication.dynamics === 'string') {
        // For Pro tier, enhance the string-based dynamics into more detailed patterns
        filteredAnalysis.communication.dynamics = analysis.communication.dynamics;
      } else {
        // Start with the original dynamics
        filteredAnalysis.communication.dynamics = {
          ...analysis.communication.dynamics
        };
      }
      
      // Get references to participant names
      const participantNames = analysis.toneAnalysis?.participantTones ? 
        Object.keys(analysis.toneAnalysis.participantTones) : [];
      
      const participant1 = participantNames.length > 0 ? participantNames[0] : 'Participant 1';
      const participant2 = participantNames.length > 1 ? participantNames[1] : 'Participant 2';
        
      // Generate behavioral patterns with examples from keyQuotes
      if (analysis.keyQuotes && analysis.keyQuotes.length > 0) {
        // Map quotes to speakers
        const quotesByParticipant: Record<string, any[]> = {};
        analysis.keyQuotes.forEach(quote => {
          if (!quotesByParticipant[quote.speaker]) {
            quotesByParticipant[quote.speaker] = [];
          }
          quotesByParticipant[quote.speaker].push(quote);
        });
        
        // Analyze communication patterns for each participant
        const patterns = [];
        
        // Pattern types to identify
        const patternTypes = [
          'defensiveness', 'stonewalling', 'criticism', 'contempt', 
          'validation', 'empathy', 'problem-solving', 'emotional expression',
          'interruption', 'topic change', 'withdrawal', 'engagement'
        ];
        
        // Create patterns with examples for each participant
        for (const participant of participantNames) {
          const quotes = quotesByParticipant[participant] || [];
          if (quotes.length > 0) {
            // Analyze patterns in quotes
            const patternCounts: Record<string, { count: number, examples: any[] }> = {};
            
            quotes.forEach(quote => {
              const analysis = quote.analysis?.toLowerCase() || '';
              
              patternTypes.forEach(pattern => {
                if (analysis.includes(pattern)) {
                  if (!patternCounts[pattern]) {
                    patternCounts[pattern] = { count: 0, examples: [] };
                  }
                  
                  patternCounts[pattern].count++;
                  if (patternCounts[pattern].examples.length < 2) { // Limit to 2 examples
                    patternCounts[pattern].examples.push(quote);
                  }
                }
              });
            });
            
            // Add dominant patterns
            Object.entries(patternCounts)
              .sort(([, a], [, b]) => (b as any).count - (a as any).count)
              .slice(0, 3) // Top 3 patterns
              .forEach(([pattern, data]) => {
                const examples = (data as any).examples;
                patterns.push({
                  participant,
                  pattern: pattern.charAt(0).toUpperCase() + pattern.slice(1),
                  frequency: (data as any).count > 3 ? 'High' : ((data as any).count > 1 ? 'Moderate' : 'Low'),
                  examples: examples.map((ex: any) => ({ 
                    text: ex.quote,
                    analysis: `This demonstrates ${pattern} through ${
                      pattern === 'defensiveness' ? 'deflecting criticism and shifting blame' :
                      pattern === 'stonewalling' ? 'withdrawing from engagement and shutting down' :
                      pattern === 'criticism' ? 'attacking character rather than behavior' :
                      pattern === 'contempt' ? 'expressing superiority and disrespect' :
                      pattern === 'validation' ? 'acknowledging the other\'s perspective' :
                      pattern === 'empathy' ? 'showing understanding of feelings' :
                      pattern === 'problem-solving' ? 'offering constructive solutions' :
                      pattern === 'emotional expression' ? 'openly sharing feelings' :
                      'this communication pattern'
                    }`
                  }))
                });
              });
          }
        }
        
        // Add patterns to dynamics
        filteredAnalysis.communication.dynamics.patterns = patterns;
        
        // Generate message dominance analysis
        const messageCount: Record<string, number> = {};
        const totalWords: Record<string, number> = {};
        const interruptionCount: Record<string, number> = {};
        
        participantNames.forEach(name => {
          messageCount[name] = quotesByParticipant[name]?.length || 0;
          totalWords[name] = quotesByParticipant[name]?.reduce((sum, quote) => 
            sum + (quote.quote.split(' ').length), 0) || 0;
          interruptionCount[name] = 0;
        });
        
        // Calculate interruptions (simplified heuristic)
        if (analysis.keyQuotes && analysis.keyQuotes.length > 2) {
          for (let i = 1; i < analysis.keyQuotes.length; i++) {
            const prevQuote = analysis.keyQuotes[i-1];
            const currQuote = analysis.keyQuotes[i];
            
            // Different speakers and short gap indicates possible interruption
            if (prevQuote.speaker !== currQuote.speaker && 
                prevQuote.quote.length < 20 && 
                !prevQuote.quote.endsWith('?')) {
              interruptionCount[currQuote.speaker] = 
                (interruptionCount[currQuote.speaker] || 0) + 1;
            }
          }
        }
        
        // Create dominance metrics
        const totalMessages = Object.values(messageCount).reduce((a, b) => a + b, 0);
        const dominanceMetrics: Record<string, any> = {};
        
        participantNames.forEach(name => {
          dominanceMetrics[name] = {
            messageShare: totalMessages ? Math.round((messageCount[name] / totalMessages) * 100) : 0,
            wordCount: totalWords[name],
            interruptions: interruptionCount[name]
          };
        });
        
        // Determine overall dominance pattern
        let dominantParticipant = '';
        let dominanceRatio = 0;
        
        if (participantNames.length >= 2) {
          const p1 = participantNames[0];
          const p2 = participantNames[1];
          
          const p1Score = (messageCount[p1] || 0) + (totalWords[p1] || 0) / 20;
          const p2Score = (messageCount[p2] || 0) + (totalWords[p2] || 0) / 20;
          
          dominanceRatio = Math.abs(p1Score - p2Score) / Math.max(1, (p1Score + p2Score) / 2);
          
          if (dominanceRatio > 0.3) { // Significant imbalance
            dominantParticipant = p1Score > p2Score ? p1 : p2;
          }
        }
        
        // Create dominance analysis
        filteredAnalysis.communication.dynamics.dominanceAnalysis = {
          overview: dominantParticipant ? 
            `The conversation shows a significant imbalance with ${dominantParticipant} dominating through greater message volume and speaking time.` :
            `The conversation shows relatively balanced participation between participants.`,
          metrics: dominanceMetrics
        };
        
        // Generate evasion tactics with examples
        const evasionTactics = [];
        const evasionTypes = [
          'topic change', 'deflection', 'vague response', 'ignoring question',
          'counterattack', 'minimizing', 'generalizing', 'selective attention'
        ];
        
        // Look for evasion in quotes
        for (const participant of participantNames) {
          const quotes = quotesByParticipant[participant] || [];
          
          quotes.forEach(quote => {
            const quoteText = quote.quote.toLowerCase();
            const quoteAnalysis = quote.analysis?.toLowerCase() || '';
            
            for (const evasion of evasionTypes) {
              if (quoteAnalysis.includes(evasion) || 
                 (evasion === 'topic change' && (quoteAnalysis.includes('changes topic') || quoteAnalysis.includes('changing subject'))) ||
                 (evasion === 'deflection' && quoteAnalysis.includes('deflect')) ||
                 (evasion === 'counterattack' && quoteAnalysis.includes('attack back'))) {
                
                evasionTactics.push({
                  participant,
                  type: evasion.charAt(0).toUpperCase() + evasion.slice(1),
                  example: quote.quote,
                  impact: `This ${evasion} tactic prevents addressing the underlying issue and maintains emotional distance.`
                });
                
                // Only record one example per evasion type per participant
                break;
              }
            }
          });
        }
        
        // Add evasion tactics to dynamics
        filteredAnalysis.communication.dynamics.evasionTactics = evasionTactics;
        
        // Generate power shifts analysis
        const powerShifts = [];
        
        // Analyze sequence for shifts
        if (analysis.keyQuotes && analysis.keyQuotes.length > 3) {
          let currentHolder = '';
          
          // Simplified algorithm to detect power shifts based on tone changes
          for (let i = 1; i < analysis.keyQuotes.length; i++) {
            const prevQuote = analysis.keyQuotes[i-1];
            const currQuote = analysis.keyQuotes[i];
            
            // Look for indicators of power dynamics
            const prevAnalysis = prevQuote.analysis?.toLowerCase() || '';
            const currAnalysis = currQuote.analysis?.toLowerCase() || '';
            
            const submissionTerms = ['apologizes', 'gives in', 'concedes', 'backs down', 'acquiesces'];
            const dominanceTerms = ['dismisses', 'forces', 'commands', 'insists', 'demands', 'ignores'];
            
            // Check for power shift indicators
            const submissionInPrev = submissionTerms.some(term => prevAnalysis.includes(term));
            const dominanceInCurr = dominanceTerms.some(term => currAnalysis.includes(term));
            
            if (prevQuote.speaker !== currQuote.speaker && 
                ((submissionInPrev && !currentHolder) || 
                 (dominanceInCurr && currentHolder !== currQuote.speaker))) {
              
              powerShifts.push({
                position: `After message ${i}`,
                from: submissionInPrev ? prevQuote.speaker : 'neutral',
                to: currQuote.speaker,
                trigger: currQuote.quote,
                analysis: `Power shifts to ${currQuote.speaker} as they ${
                  dominanceTerms.find(term => currAnalysis.includes(term)) || 'take control'
                } of the conversation.`
              });
              
              currentHolder = currQuote.speaker;
            }
          }
        }
        
        // Add power shifts to dynamics
        filteredAnalysis.communication.dynamics.powerShifts = powerShifts;
      }
    }
    
    // Add message dominance analysis
    if (tierFeatures.includes('messageDominance')) {
      // Implement message dominance if not already included in dynamics
      if (!filteredAnalysis.communication.dynamics?.dominanceAnalysis) {
        filteredAnalysis.messageDominance = {
          overview: "Analysis of message volume and control patterns in the conversation",
          participants: {}
        };
        
        // Get participant names from participantTones
        const participantNames = analysis.toneAnalysis?.participantTones ? 
          Object.keys(analysis.toneAnalysis.participantTones) : [];
        
        if (participantNames.length > 0 && analysis.keyQuotes) {
          // Count messages by participant
          const messagesByParticipant: Record<string, any[]> = {};
          participantNames.forEach(name => { messagesByParticipant[name] = []; });
          
          analysis.keyQuotes.forEach(quote => {
            if (messagesByParticipant[quote.speaker]) {
              messagesByParticipant[quote.speaker].push(quote);
            }
          });
          
          // Calculate dominance metrics
          participantNames.forEach(name => {
            const messages = messagesByParticipant[name] || [];
            const wordCount = messages.reduce((sum, quote) => 
              sum + (quote.quote.split(' ').length), 0);
            
            filteredAnalysis.messageDominance.participants[name] = {
              messageCount: messages.length,
              wordCount: wordCount,
              averageLength: messages.length ? Math.round(wordCount / messages.length) : 0,
              dominanceScore: 0 // Will be calculated below
            };
          });
          
          // Calculate relative dominance scores
          if (participantNames.length >= 2) {
            const totalMessages = Object.values(messagesByParticipant).reduce(
              (sum, msgs) => sum + msgs.length, 0);
            
            participantNames.forEach(name => {
              const participant = filteredAnalysis.messageDominance.participants[name];
              const messageShare = totalMessages ? participant.messageCount / totalMessages : 0;
              
              // Dominance score is a weighted combination of message count and length
              participant.dominanceScore = Math.round(
                (messageShare * 0.7 + (participant.averageLength / 50) * 0.3) * 100
              );
            });
          }
        }
      }
    }
    
    // Add power dynamics analysis
    if (tierFeatures.includes('powerDynamics') && !filteredAnalysis.communication.dynamics?.powerShifts) {
      filteredAnalysis.powerDynamics = {
        overview: "Analysis of power balance and control tactics in the conversation",
        patterns: []
      };
      
      // If we have keyQuotes, identify power dynamics
      if (analysis.keyQuotes && analysis.keyQuotes.length > 0) {
        // Power tactics to look for
        const powerTactics = [
          { name: 'Dismissal', keywords: ['dismiss', 'ignor', 'invalid'] },
          { name: 'Control', keywords: ['control', 'demand', 'insist', 'should'] },
          { name: 'Blame', keywords: ['blame', 'fault', 'accus', 'your fault'] },
          { name: 'Emotional Appeal', keywords: ['guilt', 'pity', 'you don\'t care', 'if you loved'] },
          { name: 'Superiority', keywords: ['know better', 'always right', 'expert', 'smarter'] }
        ];
        
        // Look for tactics in quotes
        for (const quote of analysis.keyQuotes) {
          const quoteText = quote.quote.toLowerCase();
          const quoteAnalysis = quote.analysis?.toLowerCase() || '';
          
          for (const tactic of powerTactics) {
            if (tactic.keywords.some(keyword => 
              quoteText.includes(keyword) || quoteAnalysis.includes(keyword))) {
              
              filteredAnalysis.powerDynamics.patterns.push({
                type: tactic.name,
                participant: quote.speaker,
                example: quote.quote,
                impact: `This ${tactic.name.toLowerCase()} tactic shifts power balance and can undermine healthy dialogue.`
              });
              
              // Only record one example per tactic per speaker
              break;
            }
          }
        }
      }
    }
    
    // Add historical pattern tracking
    if (tierFeatures.includes('historicalPatterns')) {
      filteredAnalysis.historicalPatterns = {
        escalationPoints: [],
        repeatingIssues: [],
        communicationCycles: []
      };
      
      // If we have keyQuotes, identify patterns
      if (analysis.keyQuotes && analysis.keyQuotes.length > 0) {
        // Identify escalation points
        for (let i = 1; i < analysis.keyQuotes.length; i++) {
          const prevQuote = analysis.keyQuotes[i-1];
          const currQuote = analysis.keyQuotes[i];
          
          // Look for tone shifts indicating escalation
          const prevAnalysis = prevQuote.analysis?.toLowerCase() || '';
          const currAnalysis = currQuote.analysis?.toLowerCase() || '';
          
          const escalationTerms = ['anger', 'frustration', 'upset', 'raise voice', 'aggressive'];
          
          // Check if current quote shows escalation
          const hasEscalation = escalationTerms.some(term => 
            !prevAnalysis.includes(term) && currAnalysis.includes(term));
          
          if (hasEscalation) {
            filteredAnalysis.historicalPatterns.escalationPoints.push({
              triggerMessage: prevQuote.quote,
              escalationResponse: currQuote.quote,
              participants: [prevQuote.speaker, currQuote.speaker],
              analysis: `Communication escalates here as ${currQuote.speaker} responds with heightened emotion.`
            });
          }
        }
      }
    }
  }
  
  // BETA TIER: Give exact same analysis as PRO tier
  if (tier === 'beta') {
    // Simply run the analysis again as 'pro' tier to get full features
    return filterChatAnalysisByTier(analysis, 'pro');
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
  if (tier === 'personal' || tier === 'pro' || tier === 'instant' || tier === 'beta') {
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
  if (tier === 'pro' || tier === 'instant' || tier === 'beta') {
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
  if (tier === 'personal' || tier === 'pro' || tier === 'instant' || tier === 'beta') {
    // Add alternative options (additional approaches)
    if (result.alternativeOptions) {
      filteredResult.alternativeOptions = result.alternativeOptions;
    }
  }
  
  // PRO TIER & INSTANT DEEP DIVE ADDITIONAL FEATURES:
  if (tier === 'pro' || tier === 'instant' || tier === 'beta') {
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