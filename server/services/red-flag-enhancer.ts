/**
 * Red Flag Enhancer Service
 * 
 * This service provides functions to enhance red flag detection with conversation-specific
 * details rather than generic advice.
 */

/**
 * Apply strict verification criteria to filter out invalid red flags
 * based on the conversation context
 */
function filterInvalidRedFlags(redFlags: any[], conversation: string): any[] {
  if (!redFlags || !conversation) return redFlags;
  
  // Extract all messages for context analysis
  const lines = conversation.split('\n');
  const allMessages: {speaker: string, text: string}[] = [];
  
  lines.forEach(line => {
    if (!line.includes(':')) return;
    
    const [speaker, message] = line.split(':', 2);
    if (!speaker || !message) return;
    
    const speakerName = speaker.trim();
    const messageText = message.trim();
    
    allMessages.push({speaker: speakerName, text: messageText});
  });
  
  return redFlags.filter(flag => {
    // Skip filtering non-stonewalling flags
    if (flag.type !== 'Stonewalling' && 
        flag.type !== 'Emotional Withdrawal' && 
        !flag.description?.toLowerCase().includes('stonewalling')) {
      return true;
    }
    
    // Get the participant who is supposedly stonewalling
    const participant = flag.participant || flag.speaker;
    if (!participant) return true; // If no participant identified, keep the flag
    
    // Check if the participant continues to respond
    let foundParticipant = false;
    let continuesResponding = false;
    
    for (let i = 0; i < allMessages.length; i++) {
      const message = allMessages[i];
      
      // If we found a matching message from this participant
      if (message.speaker === participant) {
        foundParticipant = true;
        
        // Check if the participant's message could be perceived as stonewalling
        const isPotentialStonewalling = message.text.match(/(not talking|done talking|whatever\.|forget it\.|not discussing this|silent treatment|end of discussion|not having this conversation|walk away|leaving now)/i);

        if (isPotentialStonewalling) {
          // Check if there are more messages from this person after this one
          continuesResponding = allMessages.slice(i + 1).some(msg => msg.speaker === participant);
          
          if (continuesResponding) {
            console.log(`Filtering stonewalling flag for ${participant} who says "${message.text}" but continues responding`);
            return false; // Filter out this flag
          }
        }
      }
    }
    
    // If the participant speaks multiple times, they're probably not stonewalling
    const messageCount = allMessages.filter(msg => msg.speaker === participant).length;
    if (messageCount >= 3) {
      console.log(`Filtering stonewalling flag for ${participant} who speaks ${messageCount} times in the conversation`);
      return false;
    }
    
    return true;
  });
}

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
  
  // Filter out any invalid stonewalling red flags
  if (analysis.conversation) {
    enhancedAnalysis.redFlags = filterInvalidRedFlags(enhancedAnalysis.redFlags, analysis.conversation);
  }
  
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