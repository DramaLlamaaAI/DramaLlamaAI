/**
 * Conflict Dynamics Analysis Service
 * 
 * This service analyzes conversations to identify patterns of conflict escalation or de-escalation,
 * providing insights into how participants interact during disagreements or tensions.
 */

interface ConflictDynamicsResult {
  summary: string;
  participants: {
    [name: string]: {
      tendency: 'escalates' | 'de-escalates' | 'mixed';
      examples?: string[];
      score?: number; // 0-100 scale, higher means more de-escalating
    };
  };
  interaction?: string;
  recommendations?: string[];
}

/**
 * Analyzes quotes from conversation to determine conflict dynamics
 * Different tier levels receive different levels of detail
 */
export function analyzeConflictDynamics(
  keyQuotes: any[], 
  participantNames: string[], 
  tier: string
): ConflictDynamicsResult | null {
  if (!keyQuotes || keyQuotes.length === 0 || !participantNames || participantNames.length === 0) {
    return null;
  }
  
  // Initialize conflict dynamics result structure
  const result: ConflictDynamicsResult = {
    summary: '',
    participants: {},
    interaction: '',
    recommendations: []
  };
  
  // Set up participant data structure
  participantNames.forEach(name => {
    result.participants[name] = {
      tendency: 'mixed',
      examples: [],
      score: 50 // Default to neutral
    };
  });
  
  // Keywords that indicate escalation or de-escalation
  const escalationIndicators = [
    'attack', 'accuse', 'blame', 'criticize', 'demand', 
    'insult', 'interrupt', 'mock', 'shout', 'threaten', 
    'curse', 'aggressive', 'hostile', 'angry'
  ];
  
  const deEscalationIndicators = [
    'listen', 'understand', 'acknowledge', 'appreciate', 'apologize', 
    'suggest', 'compromise', 'clarify', 'calm', 'reassure', 
    'empathize', 'validate', 'supportive', 'soothe'
  ];
  
  // Analyze quotes for conflict dynamics
  keyQuotes.forEach(quote => {
    const quoteText = quote.quote?.toLowerCase() || '';
    const quoteAnalysis = quote.analysis?.toLowerCase() || '';
    const speaker = quote.speaker;
    
    if (!result.participants[speaker]) {
      return; // Skip if speaker not found in participants
    }
    
    // Count escalation and de-escalation indicators
    let escalationCount = 0;
    let deEscalationCount = 0;
    
    // Check for escalation indicators
    escalationIndicators.forEach(indicator => {
      if (quoteAnalysis.includes(indicator) || quoteText.includes(indicator)) {
        escalationCount++;
        
        // Add example for higher tiers
        if (tier !== 'free' && result.participants[speaker].examples) {
          result.participants[speaker].examples?.push(quote.quote);
        }
      }
    });
    
    // Check for de-escalation indicators
    deEscalationIndicators.forEach(indicator => {
      if (quoteAnalysis.includes(indicator) || quoteText.includes(indicator)) {
        deEscalationCount++;
        
        // Add example for higher tiers
        if (tier !== 'free' && result.participants[speaker].examples) {
          result.participants[speaker].examples?.push(quote.quote);
        }
      }
    });
    
    // Update participant's score based on escalation/de-escalation counts
    if (escalationCount > 0 || deEscalationCount > 0) {
      const currentScore = result.participants[speaker].score || 50;
      const escalationImpact = escalationCount * -5; // Reduce score for escalation
      const deEscalationImpact = deEscalationCount * 5; // Increase score for de-escalation
      
      // Calculate new score, keeping it within 0-100 range
      let newScore = currentScore + deEscalationImpact + escalationImpact;
      newScore = Math.max(0, Math.min(100, newScore));
      
      result.participants[speaker].score = newScore;
      
      // Update tendency based on score
      if (newScore < 40) {
        result.participants[speaker].tendency = 'escalates';
      } else if (newScore > 60) {
        result.participants[speaker].tendency = 'de-escalates';
      } else {
        result.participants[speaker].tendency = 'mixed';
      }
    }
  });
  
  // For Pro tier, let's limit examples to the most representative ones (max 3 per participant)
  if (tier === 'pro' || tier === 'instant') {
    for (const participant in result.participants) {
      if (result.participants[participant].examples && 
          result.participants[participant].examples!.length > 3) {
        result.participants[participant].examples = 
          result.participants[participant].examples!.slice(0, 3);
      }
    }
  }
  
  // For Personal tier, let's keep only one example per participant
  if (tier === 'personal') {
    for (const participant in result.participants) {
      if (result.participants[participant].examples && 
          result.participants[participant].examples!.length > 1) {
        result.participants[participant].examples = 
          [result.participants[participant].examples![0]];
      }
    }
  }
  
  // Generate summary based on all participants' tendencies
  const escalatingParticipants = Object.entries(result.participants)
    .filter(([_, data]) => data.tendency === 'escalates')
    .map(([name, _]) => name);
    
  const deEscalatingParticipants = Object.entries(result.participants)
    .filter(([_, data]) => data.tendency === 'de-escalates')
    .map(([name, _]) => name);
  
  const mixedParticipants = Object.entries(result.participants)
    .filter(([_, data]) => data.tendency === 'mixed')
    .map(([name, _]) => name);
  
  // Generate summary
  if (escalatingParticipants.length > 0 && deEscalatingParticipants.length > 0) {
    result.summary = `${escalatingParticipants.join(' and ')} tend(s) to escalate conflict, while ${deEscalatingParticipants.join(' and ')} tend(s) to de-escalate.`;
  } else if (escalatingParticipants.length > 0) {
    result.summary = `All participants tend to escalate conflicts.`;
  } else if (deEscalatingParticipants.length > 0) {
    result.summary = `All participants show de-escalating communication patterns.`;
  } else {
    result.summary = `The conversation shows mixed conflict patterns.`;
  }
  
  // Generate interaction pattern (only for Personal and Pro tiers)
  if (tier === 'personal' || tier === 'pro' || tier === 'instant') {
    if (escalatingParticipants.length > 0 && deEscalatingParticipants.length > 0) {
      result.interaction = `This conversation shows an imbalanced conflict dynamic where ${escalatingParticipants.join(' and ')} escalate(s) while ${deEscalatingParticipants.join(' and ')} attempt(s) to calm the situation.`;
    } else if (escalatingParticipants.length > 1) {
      result.interaction = `This conversation shows a mutually escalating pattern that may intensify conflicts over time.`;
    } else if (deEscalatingParticipants.length > 1) {
      result.interaction = `This conversation shows a healthy conflict resolution pattern where both participants work to maintain calm communication.`;
    } else if (mixedParticipants.length > 0) {
      result.interaction = `This conversation shows inconsistent conflict management patterns.`;
    }
  }
  
  // Generate recommendations (only for Pro tier)
  if (tier === 'pro' || tier === 'instant') {
    if (escalatingParticipants.length > 0) {
      result.recommendations?.push(
        `${escalatingParticipants.join(' and ')} could benefit from practicing active listening and acknowledging the other person's perspective before responding.`
      );
    }
    
    if (deEscalatingParticipants.length > 0) {
      result.recommendations?.push(
        `${deEscalatingParticipants.join(' and ')} show(s) healthy de-escalation patterns that should be maintained.`
      );
    }
    
    if (escalatingParticipants.length > 0 && deEscalatingParticipants.length > 0) {
      result.recommendations?.push(
        `Consider establishing communication ground rules to prevent escalation cycles.`
      );
    }
  }
  
  return result;
}

/**
 * Enhances analysis results with conflict dynamics based on tier
 */
export function enhanceWithConflictDynamics(
  analysis: any,
  tier: string
): any {
  // Extract participant names
  const participantNames: string[] = [];
  if (analysis.toneAnalysis && analysis.toneAnalysis.participantTones) {
    participantNames.push(...Object.keys(analysis.toneAnalysis.participantTones));
  }
  
  // Get key quotes from the analysis
  const keyQuotes = analysis.keyQuotes || [];
  
  // Generate conflict dynamics analysis
  const conflictDynamics = analyzeConflictDynamics(keyQuotes, participantNames, tier);
  
  if (conflictDynamics) {
    return {
      ...analysis,
      conflictDynamics
    };
  }
  
  return analysis;
}