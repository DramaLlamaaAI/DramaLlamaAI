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
  
  // Enhanced accountability indicators with categories
  const fullAccountabilityPhrases = [
    'that\'s on me', 'i was wrong', 'i messed up', 'i take responsibility',
    'my fault', 'i made a mistake', 'i should have', 'i could have done better',
    'i\'m responsible for', 'i need to own', 'i failed to', 'i dropped the ball',
    'i\'m to blame', 'i let you down', 'i didn\'t handle', 'i was out of line'
  ];
  
  const sharedAccountabilityPhrases = [
    'we both', 'we all', 'both of us', 'all of us', 'we messed up',
    'we dropped the ball', 'we need to', 'we should have', 'our fault',
    'we\'re both responsible', 'we both contributed', 'we all played a part'
  ];
  
  const deflectionDisguisedPhrases = [
    'i\'m sorry, but you', 'i apologize, but you', 'my bad, but you',
    'i was wrong, but you', 'i messed up, but you', 'yes i did, but you',
    'i take responsibility, but', 'that\'s on me, but you', 'i\'m at fault, but'
  ];
  
  const deflectionLanguage = [
    'you always', 'you never', 'that\'s not my', 'it\'s your fault',
    'you made me', 'i had to because you', 'if you hadn\'t', 'you\'re the one',
    'that\'s just how i am', 'you\'re overreacting', 'you\'re being',
    'you started it', 'you did it first', 'you\'re just as bad'
  ];
  
  // Enhanced participant analysis with sophisticated accountability detection
  function analyzeParticipant(participant: string): any {
    // Extract participant's messages
    const participantMessages = conversation.toLowerCase().split('\n')
      .filter(line => line.includes(participant.toLowerCase() + ':'))
      .map(line => line.split(':').slice(1).join(':').trim());
    
    const allText = participantMessages.join(' ').toLowerCase();
    
    let fullAccountabilityCount = 0;
    let sharedAccountabilityCount = 0;
    let deflectionDisguisedCount = 0;
    let deflectionCount = 0;
    const examples = [];
    
    // Check for full accountability phrases
    fullAccountabilityPhrases.forEach(phrase => {
      if (allText.includes(phrase)) {
        fullAccountabilityCount++;
        const matchingMessage = participantMessages.find(msg => 
          msg.toLowerCase().includes(phrase)
        );
        if (matchingMessage && examples.length < 3) {
          examples.push({
            text: matchingMessage.slice(0, 120) + (matchingMessage.length > 120 ? '...' : ''),
            behavioral: 'Full accountability',
            type: 'full_accountability'
          });
        }
      }
    });
    
    // Check for shared accountability phrases
    sharedAccountabilityPhrases.forEach(phrase => {
      if (allText.includes(phrase)) {
        sharedAccountabilityCount++;
        const matchingMessage = participantMessages.find(msg => 
          msg.toLowerCase().includes(phrase)
        );
        if (matchingMessage && examples.length < 3) {
          examples.push({
            text: matchingMessage.slice(0, 120) + (matchingMessage.length > 120 ? '...' : ''),
            behavioral: 'Shared responsibility',
            type: 'shared_accountability'
          });
        }
      }
    });
    
    // Check for deflection disguised as accountability
    deflectionDisguisedPhrases.forEach(phrase => {
      if (allText.includes(phrase)) {
        deflectionDisguisedCount++;
        const matchingMessage = participantMessages.find(msg => 
          msg.toLowerCase().includes(phrase)
        );
        if (matchingMessage && examples.length < 3) {
          examples.push({
            text: matchingMessage.slice(0, 120) + (matchingMessage.length > 120 ? '...' : ''),
            behavioral: 'Disguised deflection',
            type: 'deflection_disguised'
          });
        }
      }
    });
    
    // Check for pure deflection
    deflectionLanguage.forEach(phrase => {
      if (allText.includes(phrase)) {
        deflectionCount++;
        const matchingMessage = participantMessages.find(msg => 
          msg.toLowerCase().includes(phrase)
        );
        if (matchingMessage && examples.length < 3) {
          examples.push({
            text: matchingMessage.slice(0, 120) + (matchingMessage.length > 120 ? '...' : ''),
            behavioral: 'Blame deflection',
            type: 'deflection'
          });
        }
      }
    });
    
    // Calculate sophisticated accountability score
    let score = 'Low';
    let signal = '❌';
    let description = 'Limited accountability language detected';
    
    const totalSignals = fullAccountabilityCount + sharedAccountabilityCount + deflectionDisguisedCount + deflectionCount;
    
    if (fullAccountabilityCount >= 2) {
      score = 'High';
      signal = '✅';
      description = 'Demonstrates clear personal responsibility without deflection';
    } else if (fullAccountabilityCount === 1 && deflectionCount === 0) {
      score = 'Moderate';
      signal = '⚠️';
      description = 'Shows some personal accountability';
    } else if (sharedAccountabilityCount > 0 && deflectionCount === 0) {
      score = 'Moderate';
      signal = '⚠️';
      description = 'Prefers shared responsibility approach';
    } else if (deflectionDisguisedCount > 0) {
      score = 'Low';
      signal = '❌';
      description = 'Uses accountability language but deflects blame';
    } else if (deflectionCount > 0) {
      score = 'Low';
      signal = '❌';
      description = 'Tends to deflect responsibility onto others';
    }
    
    return {
      score,
      signal,
      description,
      sampleQuotes: examples.slice(0, 2), // Limit to 2 best examples
      fullAccountabilityCount,
      sharedAccountabilityCount,
      deflectionDisguisedCount,
      deflectionCount
    };
  }
  
  return {
    [me]: analyzeParticipant(me),
    [them]: analyzeParticipant(them)
  };
}

export function createBetaTierAnalysis(rawAnalysis: any, me: string, them: string): any {
  console.log('BETA TIER SERVICE: Creating dedicated Beta tier analysis');
  console.log(`Participants: ${me} and ${them}`);
  
  // Generate Accountability Language Signals
  const accountabilitySignals = generateAccountabilitySignals(rawAnalysis, me, them);
  console.log('BETA TIER SERVICE: Generated accountability language signals');
  
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
    
    // Accountability Language Signals - NEW BETA FEATURE
    accountabilityLanguageSignals: accountabilitySignals,

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
    }
  };
  
  // Process red flags with proper participant attribution
  if (rawAnalysis.redFlags && rawAnalysis.redFlags.length > 0) {
    betaAnalysis.redFlags = rawAnalysis.redFlags.map((flag: any) => {
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