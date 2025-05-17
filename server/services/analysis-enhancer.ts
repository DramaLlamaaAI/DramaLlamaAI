/**
 * Analysis Enhancer Service
 * 
 * This service enhances chat analysis results with conversation-specific insights
 * instead of generic recommendations, especially for Pro tier users.
 */

/**
 * Enhances red flags in the analysis to make them more specific to the conversation
 * by using actual quotes and creating relevant insights instead of generic recommendations.
 */
export function enhanceAnalysisWithQuotes(analysis: any): any {
  // Ensure we have the required data
  if (!analysis || !analysis.redFlags || !analysis.keyQuotes) {
    return analysis;
  }

  // Enhance each red flag with conversation-specific insights
  const enhancedRedFlags = analysis.redFlags.map((flag: any) => {
    // Find quotes from the conversation that relate to this flag
    const relevantQuotes = findRelevantQuotes(flag, analysis.keyQuotes);
    
    // If we found relevant quotes, use them to create specific insights
    if (relevantQuotes.length > 0) {
      // Primary quote for detailed analysis
      const primaryQuote = relevantQuotes[0];
      
      return {
        ...flag,
        // Add examples section with actual quotes
        examples: relevantQuotes.map(quote => ({
          text: quote.quote,
          from: quote.speaker
        })),
        
        // Create specific impact analysis based on the quote
        impact: createImpactAnalysis(flag, primaryQuote),
        
        // Create specific recommendations based on the quote
        recommendedAction: createRecommendation(flag, primaryQuote),
        
        // Create behavioral pattern analysis based on the quote
        behavioralPattern: createBehavioralAnalysis(flag, primaryQuote),
        
        // Add additional context
        quote: primaryQuote.quote,
        context: primaryQuote.analysis || `This shows ${flag.type} behavior.`,
        timelinePosition: 'Mid-conversation' // Simplified position
      };
    }
    
    // No relevant quotes found, return the original flag
    return flag;
  });
  
  // Return the enhanced analysis
  return {
    ...analysis,
    redFlags: enhancedRedFlags
  };
}

/**
 * Finds quotes from the conversation that are relevant to a specific red flag
 */
function findRelevantQuotes(flag: any, quotes: any[]): any[] {
  // Get the flag type and description (if available)
  const flagType = (flag.type || '').toLowerCase();
  const flagDesc = (flag.description || '').toLowerCase();
  
  // Create keyword maps for different flag types
  const keywordMap: Record<string, string[]> = {
    'manipulation': ['manipulat', 'pressure', 'guilt', 'force', 'insist', 'control'],
    'gaslighting': ['reality', 'imagin', 'crazy', 'happened', 'misunderstand'],
    'stonewalling': ['silence', 'avoid', 'ignore', 'shut down', 'withdraw', 'talk'],
    'love bombing': ['love', 'perfect', 'destiny', 'meant to be', 'special'],
    'financial': ['money', 'loan', 'pay', 'fund', 'afford', 'help', 'need'],
    'urgency': ['urgent', 'now', 'quick', 'immediate', 'hurry', 'can\'t wait']
  };
  
  // Find quotes that match the flag type
  return quotes.filter(quote => {
    const quoteText = (quote.quote || '').toLowerCase();
    const quoteAnalysis = (quote.analysis || '').toLowerCase();
    
    // Direct matches in quote analysis
    if (quoteAnalysis.includes(flagType)) return true;
    
    // Matches in flag description
    if (flagDesc && flagDesc.split(' ').some(word => 
      word.length > 4 && quoteAnalysis.includes(word))) return true;
    
    // Keyword matches from our map
    for (const [key, keywords] of Object.entries(keywordMap)) {
      if (flagType.includes(key)) {
        if (keywords.some(kw => quoteAnalysis.includes(kw) || quoteText.includes(kw))) {
          return true;
        }
      }
    }
    
    // Special cases for specific flag types
    if (flagType.includes('financial') && 
        (quoteText.includes('money') || quoteText.includes('pay'))) {
      return true;
    }
    
    if (flagType.includes('love') && 
        (quoteText.includes('love') || quoteText.includes('perfect'))) {
      return true;
    }
    
    return false;
  }).slice(0, 3); // Limit to 3 most relevant quotes
}

/**
 * Creates an impact analysis specific to the conversation based on a quote
 */
function createImpactAnalysis(flag: any, quote: any): string {
  const flagType = (flag.type || '').toLowerCase();
  const speaker = quote.speaker;
  const quoteText = quote.quote;
  
  // Create a shortened version of the quote if it's too long
  let shortQuote = quoteText;
  if (shortQuote.length > 40) {
    shortQuote = shortQuote.substring(0, 37) + '...';
  }
  
  // Create impact analysis based on flag type
  if (flagType.includes('manipulation')) {
    return `When ${speaker} says "${shortQuote}", it creates emotional pressure that makes it difficult to maintain your boundaries. This tactic is used to influence your decisions without directly asking for what they want.`;
  }
  else if (flagType.includes('gaslighting')) {
    return `${speaker}'s statement "${shortQuote}" makes you question your perceptions, creating self-doubt. This undermines your confidence in your own judgment and makes it harder to trust your instincts.`;
  }
  else if (flagType.includes('love bomb')) {
    return `The excessive affection in "${shortQuote}" from ${speaker} artificially accelerates intimacy. This creates a sense of special connection before you've had time to properly evaluate the relationship.`;
  }
  else if (flagType.includes('financial')) {
    return `${speaker}'s focus on money in "${shortQuote}" introduces financial entanglement early in your relationship. This creates potential dependency and obligation before trust is fully established.`;
  }
  else if (flagType.includes('urgency')) {
    return `The sense of urgency in "${shortQuote}" pressures you to make quick decisions without proper consideration. This prevents thoughtful evaluation and can lead to choices you might later regret.`;
  }
  
  // Default for other flag types
  return `${speaker}'s communication in "${shortQuote}" shows concerning patterns that affect the health of your interaction. This creates tension and potential misunderstanding that can damage trust.`;
}

/**
 * Creates a specific recommendation based on the conversation
 */
function createRecommendation(flag: any, quote: any): string {
  const flagType = (flag.type || '').toLowerCase();
  const speaker = quote.speaker;
  const quoteText = quote.quote;
  
  // Create a shortened version of the quote if it's too long
  let shortQuote = quoteText;
  if (shortQuote.length > 40) {
    shortQuote = shortQuote.substring(0, 37) + '...';
  }
  
  // Create recommendation based on flag type
  if (flagType.includes('manipulation')) {
    return `When ${speaker} uses statements like "${shortQuote}", respond directly: "I notice you're using guilt to influence me rather than asking directly. Please tell me clearly what you want without emotional pressure."`;
  }
  else if (flagType.includes('gaslighting')) {
    return `When ${speaker} says things like "${shortQuote}" that make you doubt your perceptions, affirm your reality: "I trust my understanding of what happened. Let's focus on addressing the actual situation rather than questioning my memory."`;
  }
  else if (flagType.includes('love bomb')) {
    return `When ${speaker} uses excessive flattery like "${shortQuote}", establish a boundary: "I appreciate your enthusiasm, but I prefer to build our connection gradually as we get to know each other better."`;
  }
  else if (flagType.includes('financial')) {
    return `When ${speaker} brings up money with "${shortQuote}", maintain clear boundaries: "I'm not comfortable with financial entanglements at this stage of our relationship. Let's focus on getting to know each other first."`;
  }
  else if (flagType.includes('urgency')) {
    return `When ${speaker} creates pressure with "${shortQuote}", take control of your timeline: "I understand you'd like a quick decision, but I need time to consider this carefully. I'll let you know when I'm ready to respond."`;
  }
  
  // Default for other flag types
  return `When you see messages like "${shortQuote}" from ${speaker}, address the pattern directly: "I notice something in this interaction that makes me uncomfortable. I'd like to discuss how we can communicate more constructively about this."`;
}

/**
 * Creates a behavioral pattern analysis specific to the conversation
 */
function createBehavioralAnalysis(flag: any, quote: any): string {
  const flagType = (flag.type || '').toLowerCase();
  const speaker = quote.speaker;
  const quoteText = quote.quote;
  
  // Create a shortened version of the quote if it's too long
  let shortQuote = quoteText;
  if (shortQuote.length > 40) {
    shortQuote = shortQuote.substring(0, 37) + '...';
  }
  
  // Create behavioral analysis based on flag type
  if (flagType.includes('manipulation')) {
    return `${speaker}'s statement "${shortQuote}" shows a pattern of using emotional leverage rather than direct communication. This approach aims to control outcomes by making you feel guilty or obligated rather than respecting your agency.`;
  }
  else if (flagType.includes('gaslighting')) {
    return `When ${speaker} says "${shortQuote}", they're undermining your confidence in your perceptions. This reality-distorting pattern serves to avoid accountability and maintain control in the conversation.`;
  }
  else if (flagType.includes('love bomb')) {
    return `${speaker}'s excessive affection in "${shortQuote}" creates artificial intimacy quickly. This approach often appears early in relationships to establish a strong emotional bond before showing less positive behavior.`;
  }
  else if (flagType.includes('financial')) {
    return `${speaker}'s focus on money in "${shortQuote}" establishes concerning expectations early. This pattern often creates financial dependencies that can be used to maintain control in the relationship.`;
  }
  else if (flagType.includes('urgency')) {
    return `The urgency in "${shortQuote}" from ${speaker} is a tactic to prevent careful consideration. This pattern creates pressure to make decisions before you've had time to fully evaluate the situation.`;
  }
  
  // Default for other flag types
  return `${speaker}'s communication pattern shown in "${shortQuote}" affects how you interact. This approach shapes the dynamic between you and influences the overall health of your communication.`;
}