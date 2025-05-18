/**
 * Evasion Detection Service
 * 
 * This service analyzes conversations to identify patterns of evasion, including:
 * - Topic shifting
 * - Question dodging
 * - Non-committal responses
 * - Deflection
 * - Avoidance
 * - Refusal to engage
 */

interface EvasionInstance {
  type: string;          // Type of evasion (e.g., "Topic Shifting", "Question Dodging")
  participant: string;   // Name of participant exhibiting the behavior
  example: string;       // Direct quote from the conversation
  context?: string;      // Additional context about when/why this is evasive
  severity?: number;     // Optional severity rating (1-10)
}

/**
 * Simple evasion detection for Personal tier
 * Identifies basic patterns without detailed examples
 */
export function detectBasicEvasion(keyQuotes: any[]): { 
  hasEvasion: boolean;
  evasionPatterns?: string[];
} {
  if (!keyQuotes || keyQuotes.length === 0) {
    return { hasEvasion: false };
  }
  
  const evasionPatterns: string[] = [];
  const participantPatterns: Record<string, Set<string>> = {};
  
  // Analyze quotes for evasion patterns
  keyQuotes.forEach(quote => {
    const quoteText = quote.quote?.toLowerCase() || '';
    const quoteAnalysis = quote.analysis?.toLowerCase() || '';
    const speaker = quote.speaker;
    
    // Check for evasion indicators in the quote analysis
    if (
      quoteAnalysis.includes('avoid') || 
      quoteAnalysis.includes('deflect') || 
      quoteAnalysis.includes('dodge') ||
      quoteAnalysis.includes('shift') || 
      quoteAnalysis.includes('divert') || 
      quoteAnalysis.includes('ignore') ||
      quoteAnalysis.includes('vague') ||
      quoteAnalysis.includes('non-committal')
    ) {
      // Initialize pattern set for this participant if not exists
      if (!participantPatterns[speaker]) {
        participantPatterns[speaker] = new Set();
      }
      
      // Determine evasion type
      let evasionType = 'avoidance'; // Default
      
      if (quoteAnalysis.includes('deflect') || quoteAnalysis.includes('divert')) {
        evasionType = 'deflection';
      } else if (quoteAnalysis.includes('vague') || quoteAnalysis.includes('non-committal')) {
        evasionType = 'refusal to engage in meaningful dialogue';
      }
      
      // Add to participant's patterns
      participantPatterns[speaker].add(evasionType);
    }
  });
  
  // Convert to the expected format
  for (const [participant, patterns] of Object.entries(participantPatterns)) {
    patterns.forEach(pattern => {
      evasionPatterns.push(`${pattern} (${participant})`);
    });
  }
  
  return {
    hasEvasion: evasionPatterns.length > 0,
    evasionPatterns
  };
}

/**
 * Detailed evasion detection for Pro tier
 * Includes specific examples from the conversation
 */
export function detectDetailedEvasion(keyQuotes: any[], participantNames: string[]): {
  hasEvasion: boolean;
  evasionDetails?: {
    topicShifting?: EvasionInstance[];
    questionDodging?: EvasionInstance[];
    nonCommittal?: EvasionInstance[];
    deflection?: EvasionInstance[];
    avoidance?: EvasionInstance[];
    refusalToEngage?: EvasionInstance[];
  }
} {
  if (!keyQuotes || keyQuotes.length === 0) {
    return { hasEvasion: false };
  }
  
  // Initialize containers for different evasion types
  const evasionDetails: {
    topicShifting: EvasionInstance[];
    questionDodging: EvasionInstance[];
    nonCommittal: EvasionInstance[];
    deflection: EvasionInstance[];
    avoidance: EvasionInstance[];
    refusalToEngage: EvasionInstance[];
  } = {
    topicShifting: [],
    questionDodging: [],
    nonCommittal: [],
    deflection: [],
    avoidance: [],
    refusalToEngage: []
  };
  
  // Define keywords that indicate different types of evasion
  const evasionIndicators = {
    topicShifting: ['change subject', 'different topic', 'shift', 'unrelated', 'tangent'],
    questionDodging: ['dodge', 'avoid question', 'not answer', 'redirect question'],
    nonCommittal: ['vague', 'ambiguous', 'unclear', 'non-committal', 'maybe', 'perhaps'],
    deflection: ['deflect', 'counter-question', 'blame', 'defensive', 'accusatory'],
    avoidance: ['avoid', 'ignore', 'silent', 'withdraw', 'distance'],
    refusalToEngage: ['refuse', 'won\'t discuss', 'shut down', 'disengage', 'not talk about']
  };
  
  // Track previous messages to detect patterns across multiple messages
  let previousMessages: Record<string, string[]> = {};
  participantNames.forEach(name => {
    previousMessages[name] = [];
  });
  
  // First pass - identify potential evasion instances and track conversation flow
  keyQuotes.forEach(quote => {
    const quoteText = quote.quote?.toLowerCase() || '';
    const quoteAnalysis = quote.analysis?.toLowerCase() || '';
    const speaker = quote.speaker;
    
    // Add to participant's message history
    if (previousMessages[speaker]) {
      previousMessages[speaker].push(quoteText);
    }
    
    // Check for topic shifting
    for (const keyword of evasionIndicators.topicShifting) {
      if (quoteAnalysis.includes(keyword)) {
        evasionDetails.topicShifting.push({
          type: 'Topic Shifting',
          participant: speaker,
          example: quote.quote,
          context: 'Changed the subject instead of addressing the previous point'
        });
        break;
      }
    }
    
    // Check for question dodging
    for (const keyword of evasionIndicators.questionDodging) {
      if (quoteAnalysis.includes(keyword)) {
        evasionDetails.questionDodging.push({
          type: 'Question Dodging',
          participant: speaker,
          example: quote.quote,
          context: 'Failed to provide a direct answer to a question'
        });
        break;
      }
    }
    
    // Check for non-committal responses
    for (const keyword of evasionIndicators.nonCommittal) {
      if (quoteAnalysis.includes(keyword)) {
        evasionDetails.nonCommittal.push({
          type: 'Non-committal Response',
          participant: speaker,
          example: quote.quote,
          context: 'Used vague language to avoid taking a clear position'
        });
        break;
      }
    }
    
    // Check for deflection
    for (const keyword of evasionIndicators.deflection) {
      if (quoteAnalysis.includes(keyword)) {
        evasionDetails.deflection.push({
          type: 'Deflection',
          participant: speaker,
          example: quote.quote,
          context: 'Redirected attention away from the issue'
        });
        break;
      }
    }
    
    // Check for avoidance
    for (const keyword of evasionIndicators.avoidance) {
      if (quoteAnalysis.includes(keyword)) {
        evasionDetails.avoidance.push({
          type: 'Avoidance',
          participant: speaker,
          example: quote.quote,
          context: 'Actively avoided addressing the topic'
        });
        break;
      }
    }
    
    // Check for refusal to engage
    for (const keyword of evasionIndicators.refusalToEngage) {
      if (quoteAnalysis.includes(keyword)) {
        evasionDetails.refusalToEngage.push({
          type: 'Refusal to Engage',
          participant: speaker,
          example: quote.quote,
          context: 'Explicitly refused to participate in meaningful dialogue'
        });
        break;
      }
    }
  });
  
  // Second pass - additional pattern detection based on conversation flow
  // This would be more sophisticated in a full implementation
  
  // Determine if any evasion was detected
  const hasEvasion = 
    evasionDetails.topicShifting.length > 0 ||
    evasionDetails.questionDodging.length > 0 ||
    evasionDetails.nonCommittal.length > 0 ||
    evasionDetails.deflection.length > 0 ||
    evasionDetails.avoidance.length > 0 ||
    evasionDetails.refusalToEngage.length > 0;
  
  return {
    hasEvasion,
    evasionDetails
  };
}

/**
 * Integrates evasion detection into the analysis results
 */
export function enhanceWithEvasionDetection(
  analysis: any, 
  tier: string
): any {
  // Return original analysis if tier is free
  if (tier === 'free') {
    return analysis;
  }
  
  const keyQuotes = analysis.keyQuotes || [];
  
  // For Personal tier - provide basic evasion patterns
  if (tier === 'personal') {
    const basicEvasion = detectBasicEvasion(keyQuotes);
    
    if (basicEvasion.hasEvasion) {
      return {
        ...analysis,
        evasionDetection: {
          detected: true,
          patterns: basicEvasion.evasionPatterns
        }
      };
    }
  }
  
  // For Pro tier - provide detailed evasion analysis
  if (tier === 'pro' || tier === 'instant') {
    // Extract participant names
    const participantNames = [];
    if (analysis.toneAnalysis && analysis.toneAnalysis.participantTones) {
      participantNames.push(...Object.keys(analysis.toneAnalysis.participantTones));
    }
    
    const detailedEvasion = detectDetailedEvasion(keyQuotes, participantNames);
    
    if (detailedEvasion.hasEvasion) {
      return {
        ...analysis,
        evasionDetection: {
          detected: true,
          analysisTitle: '🔍 Avoidance Detection Activated',
          details: detailedEvasion.evasionDetails
        }
      };
    }
  }
  
  // No evasion detected
  return {
    ...analysis,
    evasionDetection: {
      detected: false
    }
  };
}