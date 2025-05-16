/**
 * This file contains example data structures for each tier's analysis results
 * Useful for developers to visualize the differences between tiers
 */

// Sample Pro tier red flag with detailed analysis
const proTierRedFlagExample = {
  type: "manipulation",
  description: "extreme affection met with coldness",
  severity: 8,
  participant: "John",
  quote: "I love you more than anything! Why won't you say it back?",
  context: "This message shows an unhealthy demand for reciprocal emotional expression. This represents a clear example of manipulation behavior, which undermines healthy communication.",
  examples: [
    {
      text: "I love you more than anything! Why won't you say it back?",
      from: "John"
    },
    {
      text: "You know how I feel. I don't need to say it all the time.",
      from: "Sarah"
    },
    {
      text: "If you really loved me, you'd say it.",
      from: "John"
    }
  ],
  impact: "This represents a serious concern in the relationship dynamic. The manipulation behavior exhibited by John may lead to increased tension and communication breakdown if not addressed.",
  progression: "John's manipulation often begins subtly and intensifies over time as boundaries are tested.",
  recommendedAction: "Establish clear boundaries and request direct communication without hidden agendas.",
  behavioralPattern: "Part of control-seeking behavior that may appear in other contexts.",
  timelinePosition: "Mid-conversation"
};

// Sample Personal tier red flag (less detailed)
const personalTierRedFlagExample = {
  type: "manipulation",
  description: "extreme affection met with coldness",
  severity: 8,
  participant: "John"
};

// Sample Pro tier conversation dynamics
const proTierDynamicsExample = [
  "John: Shows a pattern of emotional withdrawal when faced with difficult topics. Example: \"You know how I feel. I don't need to say it all the time.\" - Sarah",
  "Sarah: Tends to become defensive when her emotional responses are questioned. Example: \"I'm just not as expressive as you, stop trying to change me.\" - Sarah",
  "John: Uses emotional appeals to gain compliance from Sarah. Example: \"If you really loved me, you'd say it.\" - John"
];

// Sample Personal tier conversation dynamics
const personalTierDynamicsExample = [
  "One participant shows emotional withdrawal when faced with difficult topics.",
  "There's a pattern of defensiveness when emotional responses are questioned.",
  "Emotional appeals are being used to gain compliance."
];

// Sample Pro tier message dominance analysis 
const proTierMessageDominanceExample = {
  overview: "Analysis of message volume and control in the conversation",
  participants: {
    "John": {
      messagePercent: 65,
      wordCount: 420,
      dominanceLevel: "Highly Dominant"
    },
    "Sarah": {
      messagePercent: 35,
      wordCount: 225,
      dominanceLevel: "Submissive"
    }
  }
};

// Sample Pro tier evasion tactics
const proTierEvasionTacticsExample = [
  {
    participant: "Sarah",
    type: "Topic change",
    example: "You know how I feel. Anyway, did you take the trash out?",
    impact: "This topic change tactic prevents addressing the underlying issue and maintains emotional distance."
  },
  {
    participant: "John",
    type: "Deflection",
    example: "I wouldn't have to ask if you were more affectionate.",
    impact: "This deflection tactic shifts responsibility and creates defensive responses."
  }
];

// Sample Pro tier power dynamics
const proTierPowerDynamicsExample = {
  overview: "Analysis of power balance within the conversation",
  patterns: [
    {
      type: "Emotional Appeal",
      participant: "John",
      example: "If you really loved me, you'd say it.",
      impact: "This emotional appeal tactic shifts power balance in the conversation."
    },
    {
      type: "Dismissal",
      participant: "Sarah",
      example: "You're being ridiculous about this whole thing.",
      impact: "This dismissal tactic undermines John's concerns and establishes dominance."
    }
  ]
};

// Sample Pro tier behavioral patterns
const proTierBehavioralPatternsExample = {
  "John": [
    "Manipulation: \"If you really loved me, you'd say it.\"",
    "Shows emotional vulnerability followed by control attempts",
    "Uses guilt as a persuasion tactic"
  ],
  "Sarah": [
    "Stonewalling: \"You know how I feel. I don't need to say it all the time.\"",
    "Tends to withdraw when emotionally pressured",
    "Dismisses concerns rather than addressing them directly"
  ]
};

// Sample Pro tier red flags timeline
const proTierRedFlagsTimelineExample = [
  {
    position: "Early in conversation",
    type: "manipulation",
    description: "Using affection to create obligation",
    participant: "John",
    severity: 6
  },
  {
    position: "Mid-conversation",
    type: "stonewalling",
    description: "Refusing to engage with partner's concerns",
    participant: "Sarah",
    severity: 7
  },
  {
    position: "Late in conversation",
    type: "emotional abuse",
    description: "Using love as a weapon",
    participant: "John",
    severity: 8
  }
];

/**
 * The Pro tier result is significantly more comprehensive with:
 * 
 * 1. More detailed red flag analysis including:
 *    - Multiple contextual examples with speaker attribution
 *    - Impact analysis specific to the relationship
 *    - Progression analysis for how the behavior typically develops
 *    - Specific recommended actions tailored to the situation
 *    - Behavioral pattern analysis connecting to larger patterns
 *    - Timeline positioning showing when issues occurred
 * 
 * 2. Rich conversation dynamics with:
 *    - Participant attribution for each dynamic
 *    - Supporting examples with quotes from the conversation
 * 
 * 3. Message dominance analysis with:
 *    - Quantitative metrics on message participation
 *    - Dominance level assessments for each participant
 * 
 * 4. Evasion tactics detection with:
 *    - Specific examples from the conversation
 *    - Impact analysis for each evasion tactic
 * 
 * 5. Power dynamics analysis with:
 *    - Pattern identification with participant attribution
 *    - Examples showing how power is exercised
 *    - Impact descriptions for each power tactic
 * 
 * 6. Behavioral patterns broken down by participant with:
 *    - Supporting quotes from the conversation
 *    - Pattern recognition across different messages
 * 
 * 7. Red flags timeline showing:
 *    - Progression of issues throughout the conversation
 *    - When specific problems emerged
 *    - How severity changed over time
 */