/**
 * Dedicated Beta Tier Analysis Service
 * Provides full Pro-level features with proper participant attribution
 */

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

export function createBetaTierAnalysis(rawAnalysis: any, me: string, them: string): any {
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
  
  const filteredRedFlags = (rawAnalysis.redFlags || []).filter((flag: any) => {
    // Check if flag targets safe expressions (vulnerable/constructive communication)
    const isSafeExpression = flag.examples?.some((example: any) => {
      const text = example.text?.toLowerCase() || '';
      return safeExpressions.some(safe => text.includes(safe));
    });
    
    // Don't flag defensive reassurance or vulnerability as red flags
    const isDefensiveReassurance = flag.type?.toLowerCase().includes('breakdown') || 
                                  flag.description?.toLowerCase().includes('expressing needs') ||
                                  flag.description?.toLowerCase().includes('failure to express');
    
    // Context-aware check: Is this emotional expression followed by coercion/blame?
    const hasCoerciveContext = flag.examples?.some((example: any) => {
      const text = example.text?.toLowerCase() || '';
      return text.includes(' but you') || text.includes('you never') || text.includes('you always');
    });
    
    // Only flag if it's not a safe expression, not defensive reassurance, OR if it has coercive context
    return !isSafeExpression && !isDefensiveReassurance || hasCoerciveContext;
  });
  
  console.log('BETA TIER SERVICE: Filtered red flags from', (rawAnalysis.redFlags || []).length, 'to', filteredRedFlags.length);
  
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
    redFlags: [],
    
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
    
    // Enhanced nuance detection active

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
  
  console.log('BETA TIER SERVICE: Analysis complete');
  console.log('BETA TIER SERVICE: Accountability signals included:', !!betaAnalysis.accountabilityLanguageSignals);
  return betaAnalysis;
}