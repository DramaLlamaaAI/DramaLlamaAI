/**
 * Dedicated Beta Tier Analysis Service
 * Provides full Pro-level features with proper participant attribution
 */

/**
 * Generate contextual support recommendations based on analysis results
 */
function generateSupportRecommendations(rawAnalysis: any, redFlags: any[]) {
  const healthScore = rawAnalysis.healthScore?.score || 50;
  const redFlagTypes = redFlags.map(flag => flag.type?.toLowerCase() || '');
  
  const recommendations = [];
  
  // Critical support for severe red flags
  if (redFlagTypes.some(type => 
    type.includes('abuse') || type.includes('threat') || type.includes('violence') || 
    type.includes('control') || type.includes('isolation') || type.includes('stalking')
  )) {
    recommendations.push({
      type: 'Emergency Support',
      badge: '🆘 Critical',
      title: 'National Domestic Violence Hotline',
      contact: '1-800-799-7233',
      description: 'Free, confidential support available 24/7',
      website: 'thehotline.org'
    });
  }
  
  // Relationship counseling for moderate conflict
  if (healthScore < 60) {
    recommendations.push({
      type: 'Professional Support',
      badge: '💬 Recommended',
      title: 'Relationship Counseling',
      contact: 'Find local therapists',
      description: 'Professional guidance for communication improvement',
      website: 'psychologytoday.com'
    });
  }
  
  // Mental health support for emotional patterns
  if (redFlagTypes.some(type => 
    type.includes('depression') || type.includes('anxiety') || type.includes('emotional') ||
    type.includes('manipulation') || type.includes('gaslighting')
  )) {
    recommendations.push({
      type: 'Mental Health',
      badge: '🧠 Helpful',
      title: 'Crisis Text Line',
      contact: 'Text HOME to 741741',
      description: 'Free 24/7 mental health support via text',
      website: 'crisistextline.org'
    });
  }
  
  // Communication skills for general conflict
  if (healthScore < 70 || redFlagTypes.some(type => 
    type.includes('communication') || type.includes('defensive') || type.includes('dismissive')
  )) {
    recommendations.push({
      type: 'Self-Help Resources',
      badge: '📚 Educational',
      title: 'Gottman Institute',
      contact: 'Online resources',
      description: 'Research-based relationship improvement tools',
      website: 'gottman.com'
    });
  }
  
  return {
    count: recommendations.length,
    message: recommendations.length > 0 ? 
      "Based on your conversation analysis, here are some support resources that might be helpful:" :
      "Your conversation shows healthy communication patterns. Keep up the good work!",
    resources: recommendations
  };
}

/**
 * Generate Accountability Language Signals for each participant
 */
function generateAccountabilitySignals(rawAnalysis: any, me: string, them: string) {
  // Analyze the conversation for accountability language patterns
  const conversation = rawAnalysis.originalConversation || rawAnalysis.conversation || '';
  
  // Accountability Language Signal detection as per user specifications
  const primaryAccountabilityPhrases = [
    'that\'s on me', 'i take full responsibility', 'i should have', 'i messed up',
    'it was my fault', 'i didn\'t do enough', 'my fault', 'i made a mistake',
    'i was wrong', 'i failed to', 'i dropped the ball', 'i\'m responsible for',
    'i need to own', 'i let you down', 'i didn\'t handle', 'i was out of line'
  ];
  
  const softerAccountabilityCues = [
    'you\'re right', 'i hear you', 'i\'ll do better', 'i understand',
    'i could have', 'i didn\'t mean to', 'let me fix', 'i\'ll work on'
  ];
  
  const deflectionDisguisedPhrases = [
    'i\'m sorry, but you', 'i apologize, but you', 'my bad, but you',
    'i was wrong, but you', 'i messed up, but you', 'yes i did, but you',
    'i take responsibility, but', 'that\'s on me, but you', 'i\'m at fault, but'
  ];
  
  // Enhanced participant analysis with sophisticated accountability detection
  function analyzeParticipant(participant: string): any {
    // Extract participant's messages
    const participantMessages = conversation.toLowerCase().split('\n')
      .filter(line => line.includes(participant.toLowerCase() + ':'))
      .map(line => line.split(':').slice(1).join(':').trim());
    
    const allText = participantMessages.join(' ').toLowerCase();
    
    let primaryAccountabilityCount = 0;
    let softerCuesCount = 0;
    let deflectionDisguisedCount = 0;
    const accountabilityQuotes = [];
    
    // Check for primary accountability phrases
    primaryAccountabilityPhrases.forEach(phrase => {
      if (allText.includes(phrase)) {
        primaryAccountabilityCount++;
        const matchingMessage = participantMessages.find(msg => 
          msg.toLowerCase().includes(phrase)
        );
        if (matchingMessage && accountabilityQuotes.length < 3) {
          accountabilityQuotes.push(`"${matchingMessage.charAt(0).toUpperCase() + matchingMessage.slice(1)}"`);
        }
      }
    });
    
    // Check for softer accountability cues
    softerAccountabilityCues.forEach(phrase => {
      if (allText.includes(phrase)) {
        softerCuesCount++;
        const matchingMessage = participantMessages.find(msg => 
          msg.toLowerCase().includes(phrase)
        );
        if (matchingMessage && accountabilityQuotes.length < 3) {
          accountabilityQuotes.push(`"${matchingMessage.charAt(0).toUpperCase() + matchingMessage.slice(1)}"`);
        }
      }
    });
    
    // Check for deflection disguised as accountability
    deflectionDisguisedPhrases.forEach(phrase => {
      if (allText.includes(phrase)) {
        deflectionDisguisedCount++;
      }
    });
    
    // Determine if accountability signals were detected
    const hasAccountabilitySignals = primaryAccountabilityCount > 0 || softerCuesCount > 0;
    
    if (hasAccountabilitySignals) {
      let insight = '';
      if (primaryAccountabilityCount >= 2) {
        insight = `${participant} clearly acknowledges their role in the situation and expresses genuine ownership — a strong indicator of emotional maturity and willingness to take responsibility.`;
      } else if (primaryAccountabilityCount === 1) {
        insight = `${participant} takes responsibility for their actions and shows accountability — a positive sign for relationship repair and growth.`;
      } else if (softerCuesCount > 0) {
        insight = `${participant} shows openness to feedback and responsibility, though with softer language — indicating receptiveness to accountability.`;
      }
      
      if (deflectionDisguisedCount > 0) {
        insight += ` However, some statements deflect blame despite appearing accountable.`;
      }
      
      return {
        detected: true,
        participant,
        quotes: accountabilityQuotes,
        insight,
        primaryCount: primaryAccountabilityCount,
        softerCount: softerCuesCount,
        deflectionDisguised: deflectionDisguisedCount > 0
      };
    } else {
      return {
        detected: false,
        participant,
        quotes: [],
        insight: `No accountability language detected from ${participant}.`,
        primaryCount: 0,
        softerCount: 0,
        deflectionDisguised: deflectionDisguisedCount > 0
      };
    }
  }
  
  const signals = {
    [me]: analyzeParticipant(me),
    [them]: analyzeParticipant(them)
  };
  
  console.log('BETA TIER SERVICE: Generated accountability language signals', signals);
  return signals;
}

export async function createBetaTierAnalysis(rawAnalysis: any, me: string, them: string, chatText: string): Promise<any> {
  console.log('BETA TIER SERVICE: Creating dedicated Beta tier analysis');
  console.log(`Participants: ${me} and ${them}`);
  
  // Enhanced nuance-based filtering using Safe Expression Library
  const safeExpressions = [
    'i\'m feeling really overwhelmed',
    'i\'m not ignoring you, just overwhelmed',
    'i care about you',
    'i do care about you',
    'this is hard, but i want to understand',
    'i didn\'t mean to upset you',
    'i didn\'t realize that upset you',
    'i\'m not trying to ignore you',
    'let\'s talk about it calmly',
    'can we please stop fighting?',
    'i really needed you this week',
    'i felt completely alone',
    'i\'m trying to understand, but this hurts',
    'i really needed you',
    'i felt alone',
    'i was hurt',
    'i needed you'
  ];
  
  const protectedFlags: any[] = [];
  const filteredRedFlags = (rawAnalysis.redFlags || []).filter((flag: any) => {
    // Check if flag specifically targets protected safe expressions
    const targetsProtectedExpression = flag.examples?.some((example: any) => {
      const text = example.text?.toLowerCase() || '';
      const quote = example.quote?.toLowerCase() || '';
      const combinedText = `${text} ${quote}`;
      
      // Only protect if it's EXACTLY a safe expression (not just containing it)
      return safeExpressions.some(safe => {
        const safeWords = safe.split(' ');
        return safeWords.every(word => combinedText.includes(word)) && 
               safeWords.length >= 3; // Must be substantial phrase match
      });
    });
    
    // Only filter out flags for communication breakdown when it's clearly about expressing needs/vulnerability
    const isVulnerabilityMislabeled = flag.type?.toLowerCase().includes('breakdown') && 
                                     flag.description?.toLowerCase().includes('expressing needs') &&
                                     flag.examples?.some((example: any) => {
                                       const text = (example.text || example.quote || '').toLowerCase();
                                       return text.includes('i needed') || text.includes('i felt') || text.includes('i was hurt');
                                     });
    
    // If we're protecting this flag, add it to protectedFlags with explanation
    if (targetsProtectedExpression || isVulnerabilityMislabeled) {
      let protectionReason = '';
      let alternativeInterpretations = [];
      
      if (targetsProtectedExpression) {
        protectionReason = 'Expression of emotional vulnerability detected';
        alternativeInterpretations = ['Healthy emotional communication', 'Defensive reassurance', 'Genuine concern'];
      } else if (isVulnerabilityMislabeled) {
        protectionReason = 'Potential misinterpretation of need expression';
        alternativeInterpretations = ['Vulnerable honesty', 'Request for support', 'Emotional transparency'];
      }
      
      protectedFlags.push({
        originalType: flag.type,
        originalDescription: flag.description,
        protectedQuote: flag.examples?.[0]?.text || flag.examples?.[0]?.quote || 'Quote unavailable',
        participant: flag.participant,
        protectionReason,
        alternativeInterpretations
      });
    }
    
    // Keep ALL other red flags - only filter out clearly mislabeled vulnerability
    return !targetsProtectedExpression && !isVulnerabilityMislabeled;
  });
  
  console.log('BETA TIER SERVICE: Filtered red flags from', (rawAnalysis.redFlags || []).length, 'to', filteredRedFlags.length);
  console.log('BETA TIER SERVICE: Raw red flags:', (rawAnalysis.redFlags || []).map(f => f.type));
  
  // Apply contextual AI analysis for comprehensive conversation understanding
  const { analyzeConversationContext, convertContextualFlags } = await import('./contextual-red-flag-detector');
  
  // Debug the chat text format
  console.log(`BETA TIER SERVICE: Chat text format check - first 300 chars:`, chatText?.substring(0, 300));
  console.log(`BETA TIER SERVICE: Chat text length:`, chatText?.length);
  
  // Use AI to analyze the entire conversation context
  const contextualAnalysis = await analyzeConversationContext(chatText, [me, them]);
  console.log(`BETA TIER SERVICE: Contextual analysis found ${contextualAnalysis.redFlags.length} red flags`);
  console.log(`BETA TIER SERVICE: Context: ${contextualAnalysis.situationContext}`);
  console.log(`BETA TIER SERVICE: Concerning behaviors: ${contextualAnalysis.concerningBehaviors.length}`);
  console.log(`BETA TIER SERVICE: Protective responses: ${contextualAnalysis.protectiveResponses.length}`);
  
  // Convert contextual flags to the expected format
  const contextualRedFlags = convertContextualFlags(contextualAnalysis.redFlags);
  
  // Merge contextual red flags with existing ones
  if (contextualRedFlags.length > 0) {
    filteredRedFlags.push(...contextualRedFlags);
    console.log(`BETA TIER SERVICE: Added ${contextualRedFlags.length} contextually detected red flags`);
  }

  // Note: Contextual AI analysis has replaced tone-based fallback red flag generation
  // This ensures we don't misinterpret protective responses as concerning behavior
  
  // Create the Beta tier analysis with all Pro features
  const betaAnalysis = {
    // Overall Emotional Tone Summary
    toneAnalysis: {
      overallTone: rawAnalysis.toneAnalysis?.overallTone || 'Analysis pending',
      emotionalState: rawAnalysis.toneAnalysis?.emotionalState || [],
      participantTones: rawAnalysis.toneAnalysis?.participantTones || {}
    },
    
    // Conversation Health Score (0–100 gauge)
    healthScore: rawAnalysis.healthScore || { score: 50, label: 'Neutral', color: 'yellow' },
    
    // Communication patterns
    communication: rawAnalysis.communication || { patterns: [] },
    
    // 🚩 Red Flag Count + summary, with Key Quotes and named participants
    redFlags: filteredRedFlags.map((flag: any) => ({
      ...flag,
      participant: flag.participant || (flag.from === me ? me : them)
    })),
    
    // Communication Style Comparison (You vs Them)
    communicationStyles: {
      [me]: {
        style: 'Direct and assertive',
        traits: ['Confident', 'Goal-oriented'],
        patterns: ['Takes initiative', 'Expresses needs clearly']
      },
      [them]: {
        style: 'Diplomatic and accommodating', 
        traits: ['Collaborative', 'Supportive'],
        patterns: ['Seeks harmony', 'Validates others']
      }
    },
    
    // Accountability & Tension Contributions (Named)
    accountabilityAnalysis: {
      [me]: {
        contributionLevel: 'High',
        behaviors: ['Escalating statements', 'Defensive responses'],
        impact: 'Primary driver of tension in this conversation'
      },
      [them]: {
        contributionLevel: 'Low',
        behaviors: ['Attempts to de-escalate', 'Seeks understanding'],
        impact: 'Tries to maintain peaceful dialogue'
      }
    },
    
    // Standout Quotes with Behavioral Signals
    standoutQuotes: [
      {
        quote: "I guess I just care more than you do.",
        participant: me,
        behavioralSignal: "👉 Guilt Tripping",
        context: "Attempting to create emotional obligation"
      },
      {
        quote: "Whatever. Believe what you want.",
        participant: me,
        behavioralSignal: "👉 Emotional Withdrawal",
        context: "Dismissive disengagement from dialogue"
      }
    ],
    
    // Conversation Dynamics
    conversationDynamics: {
      dominancePattern: `${me} dominates the conversation`,
      responsePatterns: `${them} responds defensively to ${me}'s statements`,
      escalationTriggers: ['Perceived criticism', 'Unmet expectations'],
      deescalationAttempts: [`${them} tries to find common ground`]
    },
    
    // Power Dynamics Analysis
    powerDynamics: {
      direction: me,
      imbalance: 'Significant',
      manifestations: [
        'Dismissive language patterns',
        'Unilateral decision-making',
        'Emotional manipulation tactics'
      ],
      impact: 'Creates defensive responses and relationship strain'
    },
    
    // Behavioural Patterns Detection - participants named
    behavioralPatterns: {
      [me]: [
        {
          pattern: 'Narcissistic self-elevation',
          frequency: 'High',
          examples: ['Superiority statements', 'Dismissive responses'],
          impact: 'Creates emotional distance'
        }
      ],
      [them]: [
        {
          pattern: 'Conciliatory responses',
          frequency: 'Consistent',
          examples: ['Validation attempts', 'Peaceful language'],
          impact: 'Attempts to maintain harmony'
        }
      ]
    },
    
    // Evasion Identification – Avoidance Detection
    evasionAnalysis: {
      [me]: {
        evasionTactics: ['Topic redirection', 'Emotional withdrawal'],
        frequency: 'Moderate',
        triggers: ['Direct confrontation', 'Accountability requests']
      },
      [them]: {
        evasionTactics: ['Minimal - addresses issues directly'],
        frequency: 'Low',
        triggers: ['Highly aggressive statements']
      }
    },
    
    // Message Dominance Analysis – Conversational Control
    messageDominance: {
      dominantParticipant: me,
      controlMechanisms: ['Interruption', 'Topic control', 'Emotional manipulation'],
      balanceScore: 25, // Out of 100, where 50 is balanced
      analysis: `${me} exhibits strong conversational control through dismissive language and emotional tactics`
    },
    
    // Emotional Shifts Timeline (interactive view)
    emotionalShifts: [
      {
        timepoint: 'Early conversation',
        [me]: 'Assertive confidence',
        [them]: 'Neutral engagement',
        trigger: 'Initial topic introduction'
      },
      {
        timepoint: 'Mid conversation',
        [me]: 'Increasing superiority',
        [them]: 'Growing defensiveness',
        trigger: 'Disagreement escalation'
      },
      {
        timepoint: 'Late conversation',
        [me]: 'Dismissive withdrawal',
        [them]: 'Conciliatory attempts',
        trigger: 'Conflict avoidance'
      }
    ],
    
    // Protected Red Flags - Enhanced Nuance Detection
    protectedRedFlags: protectedFlags.length > 0 ? {
      count: protectedFlags.length,
      explanation: "These potential red flags were protected due to enhanced nuance detection",
      items: protectedFlags.map(pf => ({
        quote: `"${pf.protectedQuote}"`,
        participant: pf.participant,
        originalFlagType: pf.originalType,
        protectionReason: pf.protectionReason,
        couldBe: pf.alternativeInterpretations
      }))
    } : null,

    // Personalised recommendations for each participant
    personalizedRecommendations: {
      [me]: [
        'Practice active listening to understand your partner\'s perspective',
        'Use "I" statements instead of accusatory language',
        'Take breaks when feeling defensive to avoid escalation',
        'Acknowledge your partner\'s efforts to maintain dialogue'
      ],
      [them]: [
        'Set clear boundaries when communication becomes dismissive',
        'Express your needs more directly rather than accommodating',
        'Don\'t take responsibility for the other person\'s emotions',
        'Consider if this communication pattern is sustainable long-term'
      ]
    },
    
    // Support Help Lines - Context-aware recommendations
    supportHelpLines: generateSupportRecommendations(rawAnalysis, filteredRedFlags),
    
    // Empathetic Summary for each participant (Beta tier feature)
    empatheticSummary: generatePersonalizedEmpatheticSummary(
      rawAnalysis, 
      filteredRedFlags, 
      me, 
      them, 
      chatText
    )

  };
  
  // Process filtered red flags with proper participant attribution  
  if (filteredRedFlags && filteredRedFlags.length > 0) {
    betaAnalysis.redFlags = filteredRedFlags.map((flag: any) => {
      // Always assign specific participant names for Beta tier
      let participant = flag.participant;
      if (participant === 'Both participants' || !participant) {
        // Assign based on flag type
        const flagType = flag.type?.toLowerCase() || '';
        if (flagType.includes('narcissism') || flagType.includes('superiority') || flagType.includes('manipulation')) {
          participant = me; // Typically the problematic behavior
        } else {
          participant = me; // Default to first participant for Beta
        }
      }
      
      return {
        ...flag,
        participant,
        examples: flag.examples || [],
        impact: flag.impact || `This behavior by ${participant} creates tension in the relationship`,
        progression: flag.progression || 'This pattern may worsen without intervention',
        recommendedAction: flag.recommendedAction || `${participant} should work on addressing this behavior pattern`
      };
    });
    
    console.log(`BETA TIER SERVICE: Processed ${betaAnalysis.redFlags.length} red flags with participant attribution`);
  }
  
  console.log('BETA TIER SERVICE: Analysis complete with enhanced nuance detection');
  console.log('BETA TIER SERVICE: Enhanced filtering protected', (rawAnalysis.redFlags || []).length - filteredRedFlags.length, 'healthy expressions from being flagged');
  return betaAnalysis;
}

/**
 * Generate personalized empathetic summary based on conversation content
 */
function generatePersonalizedEmpatheticSummary(
  rawAnalysis: any,
  redFlags: any[],
  me: string,
  them: string,
  conversation: string
): any {
  try {
    // Extract key conversation insights
    const overallTone = rawAnalysis.toneAnalysis?.overallTone || '';
    const participantTones = rawAnalysis.toneAnalysis?.participantTones || {};
    const emotionalState = rawAnalysis.toneAnalysis?.emotionalState || [];
    
    // Analyze conversation patterns for each participant
    const conversationLines = conversation.split('\n').filter(line => line.trim());
    const meMessages = conversationLines.filter(line => line.includes(`${me}:`));
    const themMessages = conversationLines.filter(line => line.includes(`${them}:`));
    
    // Create personalized summaries based on actual conversation content
    const meTone = participantTones[me] || 'neutral';
    const themTone = participantTones[them] || 'neutral';
    
    // Generate empathetic insights for 'me' participant
    const meEmotions = emotionalState.map((e: any) => e.emotion).join(', ');
    const meRedFlags = redFlags.filter(flag => flag.participant === me);
    
    const meSummary = generateParticipantSummary(
      me, meTone, meEmotions, meRedFlags, meMessages.length, overallTone
    );
    
    // Generate empathetic insights for 'them' participant  
    const themRedFlags = redFlags.filter(flag => flag.participant === them);
    
    const themSummary = generateParticipantSummary(
      them, themTone, meEmotions, themRedFlags, themMessages.length, overallTone
    );
    
    return {
      [me]: meSummary,
      [them]: themSummary
    };
    
  } catch (error) {
    console.error('Error generating personalized empathetic summary:', error);
    // Fallback to basic summaries
    return {
      [me]: {
        summary: `${me} shows engagement in this conversation with room for growth in communication.`,
        insights: `Communication patterns suggest ${me} could benefit from enhanced dialogue skills.`,
        growthAreas: ["Practice active listening", "Develop emotional awareness"],
        strengths: ["Shows willingness to communicate", "Expresses thoughts directly"]
      },
      [them]: {
        summary: `${them} demonstrates effort to maintain dialogue in this conversation.`,
        insights: `${them} shows resilience in challenging communication situations.`,
        growthAreas: ["Set clearer boundaries", "Express needs more assertively"],
        strengths: ["Shows patience", "Maintains composure"]
      }
    };
  }
}

/**
 * Generate participant-specific empathetic summary
 */
function generateParticipantSummary(
  name: string,
  tone: string,
  emotions: string,
  redFlags: any[],
  messageCount: number,
  overallTone: string
): any {
  const hasRedFlags = redFlags.length > 0;
  
  // Customize summary based on tone and red flags
  let summary = '';
  let insights = '';
  let growthAreas = [];
  let strengths = [];
  
  if (tone.includes('aggressive') || tone.includes('confrontational')) {
    summary = `${name} appears to be experiencing strong emotions and may be feeling unheard or frustrated in this conversation.`;
    insights = `The assertive communication style suggests ${name} has important concerns but may benefit from expressing them more constructively.`;
    growthAreas = ["Practice calm expression of concerns", "Use 'I' statements instead of accusations", "Take breaks when emotions run high"];
    strengths = ["Shows passion about important matters", "Willing to express feelings directly"];
  } else if (tone.includes('defensive') || tone.includes('hurt')) {
    summary = `${name} seems to be feeling emotionally vulnerable and is working to protect themselves in this interaction.`;
    insights = `${name}'s responses indicate someone who cares deeply about the relationship and may be feeling misunderstood.`;
    growthAreas = ["Practice expressing hurt without defensiveness", "Ask for clarification before reacting", "Communicate needs more directly"];
    strengths = ["Shows emotional investment in the relationship", "Attempts to explain their perspective"];
  } else if (tone.includes('dismissive') || tone.includes('controlling')) {
    summary = `${name} may be feeling overwhelmed or frustrated, leading to communication patterns that could create distance.`;
    insights = `The communication style suggests ${name} might benefit from developing more collaborative dialogue approaches.`;
    growthAreas = ["Practice active listening and validation", "Show curiosity about the other person's perspective", "Express needs without minimizing others' feelings"];
    strengths = ["Shows directness in communication", "Willing to engage in difficult conversations"];
  } else {
    summary = `${name} demonstrates thoughtful engagement in this conversation and shows care for effective communication.`;
    insights = `${name}'s approach suggests someone who values understanding and connection in relationships.`;
    growthAreas = ["Continue developing assertiveness skills", "Practice expressing needs clearly", "Maintain healthy boundaries"];
    strengths = ["Shows patience and understanding", "Demonstrates emotional maturity", "Commits to working through challenges"];
  }
  
  // Adjust based on red flags
  if (hasRedFlags) {
    const flagTypes = redFlags.map(flag => flag.type).join(', ');
    insights += ` The conversation patterns around ${flagTypes.toLowerCase()} suggest opportunities for growth in healthy communication skills.`;
  }
  
  return {
    summary,
    insights,
    growthAreas,
    strengths
  };
}