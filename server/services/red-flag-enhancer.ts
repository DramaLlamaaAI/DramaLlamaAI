/**
 * Red Flag Enhancer Service
 * 
 * This service provides functions to enhance red flag detection with conversation-specific
 * details rather than generic advice.
 */

/**
 * Enhances red flags with quotes from the conversation
 */
export function enhanceRedFlags(analysis: any, tier: string): any {
  // If no analysis or no red flags, return original analysis
  if (!analysis || !analysis.redFlags || analysis.redFlags.length === 0) {
    return analysis;
  }

  // If tier is free, just return basic red flag info
  if (tier === 'free') {
    return analysis;
  }
  
  // Get the key quotes from the conversation
  const keyQuotes = analysis.keyQuotes || [];
  
  // Create deep copy of the analysis to avoid mutations
  const enhancedAnalysis = JSON.parse(JSON.stringify(analysis));
  
  // Process each red flag
  enhancedAnalysis.redFlags = enhancedAnalysis.redFlags.map((flag: any) => {
    // Find relevant quotes for this flag
    const relevantQuotes = keyQuotes.filter((quote: any) => {
      // If the quote analysis mentions any words related to the flag type
      const analysis = quote.analysis?.toLowerCase() || '';
      const flagType = flag.type.toLowerCase();
      return analysis.includes(flagType);
    });
    
    // For Personal tier, add basic quote information
    if (tier === 'personal' && relevantQuotes.length > 0) {
      const quote = relevantQuotes[0];
      flag.exampleQuote = quote.quote;
      flag.participant = quote.speaker;
    }
    
    // For Pro tier, add detailed information with examples and recommendations
    if ((tier === 'pro' || tier === 'instant') && relevantQuotes.length > 0) {
      // Add all examples
      flag.examples = relevantQuotes.map((quote: any) => ({
        text: quote.quote,
        from: quote.speaker
      }));
      
      // Add primary example
      const primaryQuote = relevantQuotes[0];
      flag.quote = primaryQuote.quote;
      flag.speaker = primaryQuote.speaker;
      
      // Create impact analysis
      flag.impact = `When ${primaryQuote.speaker} says "${primaryQuote.quote}", it creates tension and can damage trust in the relationship.`;
      
      // Create recommendation
      flag.recommendedAction = `Consider discussing how statements like "${primaryQuote.quote}" affect you emotionally, using "I" statements to express your feelings.`;
      
      // Add behavioral pattern analysis
      flag.behavioralPattern = `This type of communication may indicate an underlying pattern of ${flag.type.toLowerCase()} behavior that could escalate if not addressed.`;
    }
    
    return flag;
  });
  
  return enhancedAnalysis;
}