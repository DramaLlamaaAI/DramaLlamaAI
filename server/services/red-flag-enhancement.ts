/**
 * Advanced Red Flag Enhancement Service
 * 
 * This service provides conversation-specific enhancements for red flags in the Pro tier
 * It ensures that red flag analyses include actual quotes and specific insights
 * rather than generic recommendations
 */

import { ChatAnalysisResult, Analysis } from '@shared/schema';

// Types for enhanced red flag data
interface QuoteMatch {
  quote: string;
  speaker: string;
  analysis?: string;
  relevance: number; // 0-10 relevance score
}

interface EnhancedRedFlag {
  type: string;
  description?: string;
  severity: number;
  participant: string;
  examples: Array<{text: string, from: string}>;
  impact: string;
  recommendedAction: string;
  behavioralPattern: string;
  timelinePosition?: string;
  quote?: string;
  context?: string;
}

/**
 * Enhances red flags with conversation-specific insights and examples
 */
export function enhanceRedFlags(
  redFlags: any[], 
  keyQuotes: any[], 
  conversationText: string
): EnhancedRedFlag[] {
  if (!redFlags || redFlags.length === 0) {
    return [];
  }

  return redFlags.map(flag => {
    // Find relevant quotes from the conversation for this flag
    const relevantQuotes = findRelevantQuotes(flag, keyQuotes, conversationText);
    
    // Create enhanced flag with conversation-specific insights
    return createEnhancedRedFlag(flag, relevantQuotes);
  });
}

/**
 * Finds quotes in the conversation that are relevant to the specified red flag
 */
function findRelevantQuotes(flag: any, keyQuotes: any[], conversationText: string): QuoteMatch[] {
  if (!keyQuotes || keyQuotes.length === 0) {
    return [];
  }

  const flagType = flag.type?.toLowerCase() || '';
  const flagDesc = flag.description?.toLowerCase() || '';
  
  // Create keyword maps for different flag types to improve matching
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
  
  // Calculate relevance score for each quote
  const scoredQuotes: QuoteMatch[] = keyQuotes.map(quote => {
    const quoteText = quote.quote?.toLowerCase() || '';
    const quoteAnalysis = quote.analysis?.toLowerCase() || '';
    let relevanceScore = 0;
    
    // Direct matches in quote analysis (highest relevance)
    if (quoteAnalysis.includes(flagType)) {
      relevanceScore += 5;
    }
    
    if (flagDesc && flagDesc.split(' ').some(word => word.length > 4 && quoteAnalysis.includes(word))) {
      relevanceScore += 3;
    }
    
    // Check for keyword matches in the analysis
    for (const [flagKey, keywords] of Object.entries(keywordMap)) {
      if (flagType.includes(flagKey)) {
        keywords.forEach(keyword => {
          if (quoteAnalysis.includes(keyword)) {
            relevanceScore += 2;
          }
          if (quoteText.includes(keyword)) {
            relevanceScore += 1;
          }
        });
      }
    }
    
    // Special case for financial issues
    if (flagType.includes('financial') && (quoteText.includes('money') || quoteText.includes('pay'))) {
      relevanceScore += 3;
    }
    
    // Special case for love bombing
    if (flagType.includes('love bomb') && (quoteText.includes('love') || quoteText.includes('perfect'))) {
      relevanceScore += 3;
    }
    
    return {
      quote: quote.quote,
      speaker: quote.speaker,
      analysis: quote.analysis,
      relevance: Math.min(10, relevanceScore) // Cap at 10
    };
  });
  
  // Sort by relevance and return the most relevant quotes
  return scoredQuotes
    .filter(quote => quote.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3);
}

/**
 * Creates an enhanced red flag with conversation-specific insights
 */
function createEnhancedRedFlag(flag: any, relevantQuotes: QuoteMatch[]): EnhancedRedFlag {
  // Create base enhanced flag
  const enhancedFlag: EnhancedRedFlag = {
    ...flag,
    participant: flag.participant || 'Both participants',
    examples: [],
    impact: '',
    recommendedAction: '',
    behavioralPattern: ''
  };
  
  // Add examples from relevant quotes
  relevantQuotes.forEach(quote => {
    enhancedFlag.examples.push({
      text: quote.quote,
      from: quote.speaker
    });
  });
  
  // If we have relevant quotes, use the first one as the primary example
  const hasExamples = relevantQuotes.length > 0;
  
  if (hasExamples) {
    const primary = relevantQuotes[0];
    enhancedFlag.quote = primary.quote;
    enhancedFlag.context = primary.analysis;
    
    // Determine position in conversation timeline
    // Simplified for now - would need actual position in conversation
    enhancedFlag.timelinePosition = 'Mid-conversation';
    
    // Generate severity text for use in analysis
    const severityLevels = ['minor concern', 'moderate concern', 'significant concern', 
                          'serious concern', 'critical concern'];
    const severityIndex = Math.min(Math.floor(enhancedFlag.severity / 2), 4);
    const severityText = severityLevels[severityIndex];
    
    // Create specific impact analysis using the actual quote
    enhancedFlag.impact = createImpactAnalysis(
      flag.type,
      primary.quote,
      primary.speaker,
      severityText
    );
    
    // Create specific behavioral pattern analysis using the actual quote
    enhancedFlag.behavioralPattern = createBehavioralAnalysis(
      flag.type,
      primary.quote,
      primary.speaker
    );
    
    // Create specific recommended action using the actual quote
    enhancedFlag.recommendedAction = createRecommendedAction(
      flag.type,
      primary.quote,
      primary.speaker
    );
  } else {
    // Fallback to more general analysis if no relevant quotes found
    enhancedFlag.impact = `This represents a concern in the communication dynamic that could lead to tension if not addressed.`;
    enhancedFlag.behavioralPattern = `This pattern may appear in other contexts within the relationship as well.`;
    enhancedFlag.recommendedAction = `Address this directly by discussing specific examples and focusing on impact rather than intent.`;
  }
  
  return enhancedFlag;
}

/**
 * Creates a specific impact analysis based on the flag type and example
 */
function createImpactAnalysis(flagType: string, quote: string, speaker: string, severityText: string): string {
  // Shorten example if too long
  let shortQuote = quote;
  if (shortQuote.length > 40) {
    shortQuote = shortQuote.substring(0, 37) + '...';
  }
  
  const flagLower = flagType.toLowerCase();
  
  if (flagLower.includes('manipulation')) {
    return `When ${speaker} says "${shortQuote}", it creates emotional pressure to comply. This communication tactic makes it difficult to maintain healthy boundaries and can lead to regretted decisions.`;
  }
  else if (flagLower.includes('gaslighting')) {
    return `The statement "${shortQuote}" from ${speaker} undermines your confidence in your own perceptions. This creates self-doubt and makes it harder to trust your judgment in future interactions.`;
  }
  else if (flagLower.includes('stonewalling')) {
    return `${speaker}'s response "${shortQuote}" blocks productive conversation by shutting down communication. This prevents resolution of the issue and leaves tensions unaddressed.`;
  }
  else if (flagLower.includes('criticism')) {
    return `The criticism in "${shortQuote}" focuses on character rather than specific behaviors. This approach creates defensiveness instead of understanding and makes constructive dialogue difficult.`;
  }
  else if (flagLower.includes('love bombing')) {
    return `${speaker}'s excessive flattery in "${shortQuote}" creates artificial intimacy too quickly. This can be used to accelerate commitment before you've had time to evaluate the relationship objectively.`;
  }
  else if (flagLower.includes('financial')) {
    return `The focus on money in "${shortQuote}" introduces financial entanglement early in the relationship. This can create obligations and dependencies that complicate the relationship dynamic.`;
  }
  else if (flagLower.includes('urgency')) {
    return `${speaker}'s creation of urgency with "${shortQuote}" pressures you to make decisions quickly. This tactic prevents careful consideration and can lead to hasty choices you might later regret.`;
  }
  
  // Default case for other flag types
  return `${speaker}'s communication in "${shortQuote}" represents a ${severityText} that affects the health of your interaction. This pattern creates tension and can lead to communication breakdown if not addressed.`;
}

/**
 * Creates a specific behavioral pattern analysis based on the flag type and example
 */
function createBehavioralAnalysis(flagType: string, quote: string, speaker: string): string {
  // Shorten example if too long
  let shortQuote = quote;
  if (shortQuote.length > 40) {
    shortQuote = shortQuote.substring(0, 37) + '...';
  }
  
  const flagLower = flagType.toLowerCase();
  
  if (flagLower.includes('manipulation')) {
    return `${speaker}'s statement "${shortQuote}" shows a pattern of using emotional leverage rather than direct requests. This approach aims to influence your choices through pressure rather than honest communication.`;
  }
  else if (flagLower.includes('gaslighting')) {
    return `When ${speaker} says "${shortQuote}", it undermines your confidence in your perceptions. This reality-distorting pattern serves to avoid accountability and maintain control in the conversation.`;
  }
  else if (flagLower.includes('stonewalling')) {
    return `${speaker}'s response "${shortQuote}" demonstrates withdrawal from difficult topics. This avoidance pattern typically emerges when facing uncomfortable subjects and prevents resolution.`;
  }
  else if (flagLower.includes('criticism')) {
    return `The criticism in "${shortQuote}" focuses on character rather than specific behaviors. This pattern of negative attribution makes constructive problem-solving difficult and creates defensiveness.`;
  }
  else if (flagLower.includes('contempt')) {
    return `${speaker}'s comment "${shortQuote}" shows fundamental disrespect. This pattern indicates an underlying negative perception that affects multiple interactions and undermines relationship health.`;
  }
  else if (flagLower.includes('love bombing')) {
    return `${speaker}'s excessive flattery in "${shortQuote}" artificially accelerates intimacy. This approach often creates a false sense of connection while applying pressure for quick commitment.`;
  }
  else if (flagLower.includes('financial')) {
    return `${speaker}'s focus on money in "${shortQuote}" establishes concerning financial expectations early. This pattern often creates imbalanced obligations that complicate the relationship dynamic.`;
  }
  
  // Default for other flag types
  return `${speaker}'s communication pattern shown in "${shortQuote}" represents a potentially recurring behavior. This approach affects the quality of your interaction and likely influences other aspects of your relationship as well.`;
}

/**
 * Creates a specific recommended action based on the flag type and example
 */
function createRecommendedAction(flagType: string, quote: string, speaker: string): string {
  // Shorten example if too long
  let shortQuote = quote;
  if (shortQuote.length > 40) {
    shortQuote = shortQuote.substring(0, 37) + '...';
  }
  
  const flagLower = flagType.toLowerCase();
  
  if (flagLower.includes('manipulation')) {
    return `When ${speaker} uses manipulation tactics like "${shortQuote}", respond with: "I notice you're trying to make me feel guilty instead of directly asking for what you want. I'd prefer if you'd tell me clearly what you need."`;
  }
  else if (flagLower.includes('gaslighting')) {
    return `When ${speaker} makes you question your reality with statements like "${shortQuote}", affirm your experience: "I know what I experienced, and I'm confident in my perception of what happened."`;
  }
  else if (flagLower.includes('stonewalling')) {
    return `When ${speaker} withdraws with "${shortQuote}", acknowledge it directly: "I notice you're shutting down this conversation. I'd like us to take a short break and agree on when we can revisit this topic."`;
  }
  else if (flagLower.includes('criticism')) {
    return `When ${speaker} criticizes with "${shortQuote}", request specific feedback: "When you generalize about me that way, I feel attacked. Could you focus on the specific behavior that concerns you?"`;
  }
  else if (flagLower.includes('love bombing')) {
    return `When ${speaker} uses excessive flattery like "${shortQuote}", set a boundary: "I appreciate your enthusiasm, but I prefer to build connection gradually as we get to know each other better."`;
  }
  else if (flagLower.includes('financial')) {
    return `When ${speaker} brings up money with "${shortQuote}", maintain clear boundaries: "I'm not comfortable discussing financial assistance at this stage of our relationship."`;
  }
  else if (flagLower.includes('urgency')) {
    return `When ${speaker} creates pressure with "${shortQuote}", slow things down: "I understand you want a quick decision, but I need time to think this through carefully before responding."`;
  }
  
  // Default for other flag types
  return `When ${speaker} communicates with "${shortQuote}", address the pattern directly: "I notice something in our communication that makes me uncomfortable. Can we discuss how to interact more constructively about this topic?"`;
}