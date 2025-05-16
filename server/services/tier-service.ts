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
      // For pro tier, enhance with quotes, context, and detailed analysis
      else if (tier === 'pro' || tier === 'instant') {
        filteredAnalysis.redFlags = redFlags.map(flag => {
          // Create a significantly enhanced flag with detailed information
          let enhancedFlag = { 
            ...flag,
            participant: flag.participant || 'Both participants',
            examples: [] as {text: string, from: string}[],
            impact: '', // Added impact analysis
            progression: '', // Added progression analysis
            recommendedAction: '', // Added specific recommendations
            behavioralPattern: '', // Added related behavioral pattern
            timelinePosition: '' // Added position in communication timeline
          };
          
          // Generate detailed impact analysis based on flag type and severity
          const severityLevels = ['minor concern', 'moderate concern', 'significant concern', 
                                 'serious concern', 'critical concern'];
          const severityIndex = Math.min(Math.floor(flag.severity / 2), 4);
          const severityText = severityLevels[severityIndex];
          
          // Create detailed impact analysis
          enhancedFlag.impact = `This represents a ${severityText} in the relationship dynamic. ` +
            `The ${flag.type} behavior exhibited by ${enhancedFlag.participant} may lead to ` +
            `increased tension and communication breakdown if not addressed.`;
          
          // Add progression analysis based on flag type
          const progressionMap: Record<string, string> = {
            'manipulation': 'Often begins subtly and intensifies over time as boundaries are tested.',
            'gaslighting': 'Typically escalates as the recipient begins to question their own reality and memories.',
            'stonewalling': 'Usually indicates a pattern of emotional withdrawal that deepens over time.',
            'criticism': 'Frequently leads to defensiveness and can evolve into contempt if unchecked.',
            'contempt': 'Often results from unresolved conflicts and represents a serious breakdown in respect.',
            'defensiveness': 'May develop into more harmful behaviors if accountability is not established.',
            'power imbalance': 'Tends to worsen as one participant becomes increasingly dominant in conversations.',
            'respect issues': 'Can gradually erode the foundation of mutual respect necessary for healthy communication.',
            'emotional abuse': 'Typically follows a cycle of intensity that may worsen without intervention.',
          };
          
          // Find the best matching progression description
          for (const [key, value] of Object.entries(progressionMap)) {
            if (flag.type.toLowerCase().includes(key.toLowerCase())) {
              enhancedFlag.progression = value;
              break;
            }
          }
          
          // If no match was found, use a generic progression
          if (!enhancedFlag.progression) {
            enhancedFlag.progression = 'This behavior typically intensifies over time if not addressed directly.';
          }
          
          // Add recommended action based on flag type
          const actionMap: Record<string, string> = {
            'manipulation': 'Establish clear boundaries and request direct communication without hidden agendas.',
            'gaslighting': 'Document incidents and seek validation from trusted sources about your perceptions.',
            'stonewalling': 'Request time-outs when emotions run high, with an agreement to revisit the topic later.',
            'criticism': 'Request specific behaviors rather than criticizing character; use "I" statements.',
            'contempt': 'Address the underlying issues of disrespect and consider relationship counseling.',
            'defensiveness': 'Practice active listening and validate concerns before responding.',
            'power imbalance': 'Establish equal participation guidelines for important conversations.',
            'respect issues': 'Explicitly discuss expectations around mutual respect and dignity.',
            'emotional abuse': 'Consider whether professional help is needed and prioritize emotional safety.',
          };
          
          // Find the best matching action recommendation
          for (const [key, value] of Object.entries(actionMap)) {
            if (flag.type.toLowerCase().includes(key.toLowerCase())) {
              enhancedFlag.recommendedAction = value;
              break;
            }
          }
          
          // If no match was found, use a generic recommendation
          if (!enhancedFlag.recommendedAction) {
            enhancedFlag.recommendedAction = 'Address this directly in a calm moment, using specific examples and focusing on impact rather than intent.';
          }
          
          // Add behavioral pattern analysis
          const patternMap: Record<string, string> = {
            'manipulation': 'Part of control-seeking behavior that may appear in other contexts.',
            'gaslighting': 'Connected to a need to maintain control by destabilizing perception.',
            'stonewalling': 'Reflects avoidance patterns that may stem from anxiety or overwhelm.',
            'criticism': 'Often indicates perfectionist tendencies or unmet expectations.',
            'contempt': 'Suggests deep-seated resentment that has built up over time.',
            'defensiveness': 'Part of self-protection strategies that avoid vulnerability.',
            'power imbalance': 'Reflects established roles that may exist throughout the relationship.',
            'respect issues': 'Indicates potential underlying beliefs about relationship hierarchy.',
            'emotional abuse': 'Part of a larger pattern of control and domination.',
          };
          
          // Find the best matching pattern description
          for (const [key, value] of Object.entries(patternMap)) {
            if (flag.type.toLowerCase().includes(key.toLowerCase())) {
              enhancedFlag.behavioralPattern = value;
              break;
            }
          }
          
          // If no match was found, use a generic pattern description
          if (!enhancedFlag.behavioralPattern) {
            enhancedFlag.behavioralPattern = 'This behavior often appears in multiple contexts and may be a recurring pattern.';
          }
          
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
              
              // Expand context with more detailed analysis
              if (enhancedFlag.context) {
                enhancedFlag.context = `${enhancedFlag.context} This represents a clear example of ${flag.type.toLowerCase()} behavior, which undermines healthy communication.`;
              }
              
              // Add to examples array
              enhancedFlag.examples.push({
                text: relevantQuote.quote,
                from: relevantQuote.speaker
              });
              
              // Set timeline position based on quote position in conversation
              const quoteIndex = analysis.keyQuotes.indexOf(relevantQuote);
              const totalQuotes = analysis.keyQuotes.length;
              
              if (quoteIndex < totalQuotes / 3) {
                enhancedFlag.timelinePosition = 'Early in conversation';
              } else if (quoteIndex < 2 * totalQuotes / 3) {
                enhancedFlag.timelinePosition = 'Mid-conversation';
              } else {
                enhancedFlag.timelinePosition = 'Late in conversation';
              }
            }
            
            // Find additional supporting quotes (up to 3 more for Pro tier)
            const additionalQuotes = analysis.keyQuotes
              .filter(quote => {
                // Skip the already used primary quote
                if (relevantQuote && quote.quote === relevantQuote.quote) return false;
                
                const quoteAnalysis = quote.analysis?.toLowerCase() || '';
                const flagType = flag.type.toLowerCase();
                const flagDesc = flag.description.toLowerCase();
                
                // More comprehensive matching to find relevant quotes
                return quoteAnalysis.includes(flagType) || 
                  flagDesc.split(' ').some(word => word.length > 4 && quoteAnalysis.includes(word)) ||
                  (flagType.includes('manipulation') && quoteAnalysis.includes('manipulat')) ||
                  (flagType.includes('criticism') && quoteAnalysis.includes('critic')) ||
                  (flagType.includes('defensive') && quoteAnalysis.includes('defens')) ||
                  (flagType.includes('stonewalling') && quoteAnalysis.includes('avoid')) ||
                  (flagType.includes('contempt') && quoteAnalysis.includes('disrespect'));
              })
              .slice(0, 3); // Allow up to 3 additional quotes for Pro tier
            
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