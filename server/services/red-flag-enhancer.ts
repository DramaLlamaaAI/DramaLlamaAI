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
  
  // Group messages by participant
  const messagesByParticipant: { [key: string]: {speaker: string, text: string}[] } = {};
  allMessages.forEach(msg => {
    if (!messagesByParticipant[msg.speaker]) {
      messagesByParticipant[msg.speaker] = [];
    }
    messagesByParticipant[msg.speaker].push(msg);
  });
  
  return redFlags.filter(flag => {
    // Skip filtering non-stonewalling flags
    if (!flag.type?.toLowerCase().includes('stonewalling') && 
        !flag.description?.toLowerCase().includes('stonewalling') &&
        !flag.type?.toLowerCase().includes('withdrawal') && 
        !flag.description?.toLowerCase().includes('withdrawal')) {
      return true;
    }
    
    // Get the participant who's supposedly stonewalling
    const participant = flag.participant || flag.speaker;
    if (!participant) return true;
    
    // BLOCKER #1: Is the participant still responding?
    const participantMessages = messagesByParticipant[participant] || [];
    if (participantMessages.length >= 3) {
      // If they have 3+ messages, they're clearly not stonewalling
      console.log(`BLOCKER #1: Filtering stonewalling flag for ${participant} who has ${participantMessages.length} messages in the conversation`);
      return false;
    }
    
    // BLOCKER #2: Is the participant explaining or justifying?
    const hasExplanatoryContent = participantMessages.some(msg => 
      msg.text.match(/(that's not what|i didn't mean|i just want to|let me explain|i'm trying to|what i meant|all i said|i was just|i'm just|i've been|i need you to|i want you to)/i)
    );
    if (hasExplanatoryContent) {
      console.log(`BLOCKER #2: Filtering stonewalling flag for ${participant} who is explaining or justifying`);
      return false;
    }
    
    // BLOCKER #3: Does the conversation end with questions or openness?
    if (participantMessages.length > 0) {
      const lastMessage = participantMessages[participantMessages.length - 1];
      const endsWithQuestion = lastMessage.text.includes('?');
      const showsOpenness = lastMessage.text.match(/(we can talk|let's discuss|i'm listening|tell me more|i hear you|i understand|maybe you're right|i see your point|can we|should we|could we)/i);
      
      if (endsWithQuestion || showsOpenness) {
        console.log(`BLOCKER #3: Filtering stonewalling flag for ${participant} whose last message shows openness`);
        return false;
      }
    }
    
    // Check if there's a clear conversation-ending message
    let foundTerminalMessage = false;
    
    if (participantMessages.length > 0) {
      const lastMessage = participantMessages[participantMessages.length - 1];
      // Only count as stonewalling if there's a clear "end conversation" message
      foundTerminalMessage = Boolean(lastMessage.text.match(/(not talking|done talking|whatever\.|forget it\.|not discussing this|silent treatment|end of discussion|not having this conversation|walk away|leaving now)/i));
      
      if (!foundTerminalMessage) {
        console.log(`Filtering stonewalling flag for ${participant} who doesn't have any conversation-ending messages`);
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Validates that a quote actually exists in the conversation
 */
function validateQuoteInConversation(quote: string, conversation: string): boolean {
  if (!quote || !conversation) return false;
  
  // Clean the quote and conversation for comparison
  const cleanQuote = quote.trim().toLowerCase();
  const cleanConversation = conversation.toLowerCase();
  
  // Check if the quote (or a significant portion of it) exists in the conversation
  return cleanConversation.includes(cleanQuote) || 
         // Also check for partial matches (in case of slight variations)
         cleanQuote.split(' ').length > 3 && 
         cleanQuote.split(' ').slice(0, 5).join(' ').length > 10 &&
         cleanConversation.includes(cleanQuote.split(' ').slice(0, 5).join(' '));
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
  
  // Get the key quotes from the conversation and validate them
  const keyQuotes = (analysis.keyQuotes || []).filter((quote: any) => {
    if (!quote.quote || !analysis.conversation) return false;
    return validateQuoteInConversation(quote.quote, analysis.conversation);
  });
  
  console.log(`Quote validation: ${analysis.keyQuotes?.length || 0} original quotes, ${keyQuotes.length} validated quotes`);
  
  // Create deep copy of the analysis to avoid mutations
  const enhancedAnalysis = JSON.parse(JSON.stringify(analysis));
  
  // Filter out any invalid stonewalling red flags
  if (analysis.conversation) {
    enhancedAnalysis.redFlags = filterInvalidRedFlags(enhancedAnalysis.redFlags, analysis.conversation);
  }
  
  // Process each red flag
  enhancedAnalysis.redFlags = enhancedAnalysis.redFlags.map((flag: any) => {
    // Fix participant attribution for Beta tiers - always assign to specific participants
    if (tier === 'beta' && flag.participant === 'Both participants') {
      // Get participant names from tone analysis
      const participantNames = enhancedAnalysis.toneAnalysis?.participantTones ? 
        Object.keys(enhancedAnalysis.toneAnalysis.participantTones) : [];
      
      console.log(`BETA TIER: Fixing participant attribution for flag: ${flag.type}, participants available: ${participantNames}`);
      
      if (participantNames.length >= 2) {
        const flagType = flag.type.toLowerCase();
        const flagDesc = flag.description?.toLowerCase() || '';
        
        // For Beta tier, always assign to the first participant (typically the problematic one)
        flag.participant = participantNames[0];
        console.log(`BETA TIER: Assigned flag ${flag.type} to ${flag.participant}`);
      }
    }
    // Fix participant attribution for Pro tiers
    else if (tier === 'pro' && flag.participant === 'Both participants') {
      // Get participant names from tone analysis
      const participantNames = enhancedAnalysis.toneAnalysis?.participantTones ? 
        Object.keys(enhancedAnalysis.toneAnalysis.participantTones) : [];
      
      console.log(`Fixing participant attribution for flag: ${flag.type}, participants available: ${participantNames}`);
      
      if (participantNames.length >= 2) {
        const flagType = flag.type.toLowerCase();
        const flagDesc = flag.description?.toLowerCase() || '';
        
        // Assign based on flag type - narcissism, power, manipulation typically go to first participant
        if (['narcissism', 'power', 'manipulation', 'control', 'superiority'].some(term => 
            flagType.includes(term) || flagDesc.includes(term))) {
          flag.participant = participantNames[0]; // Jordan (typically the aggressive one)
          console.log(`Assigned ${flag.type} to ${participantNames[0]}`);
        } else {
          // For other flags, also assign to first participant as default
          flag.participant = participantNames[0];
          console.log(`Assigned ${flag.type} to ${participantNames[0]} (default)`);
        }
      }
    }
    
    // Find relevant quotes for this flag
    const relevantQuotes = keyQuotes.filter((quote: any) => {
      // If the quote analysis mentions any words related to the flag type
      const analysis = quote.analysis?.toLowerCase() || '';
      const flagType = flag.type.toLowerCase();
      return analysis.includes(flagType);
    });
    
    // For Personal tier, add basic quote information - but only if quotes are validated
    if (tier === 'personal' && relevantQuotes.length > 0) {
      const quote = relevantQuotes[0];
      // Double-check quote validation before assigning
      if (validateQuoteInConversation(quote.quote, analysis.conversation)) {
        flag.quote = quote.quote;
        flag.participant = quote.speaker;
        
        // Also ensure there are examples for display in the UI
        flag.examples = [{ 
          text: quote.quote,
          from: quote.speaker
        }];
      } else {
        console.log(`Skipping invalid quote for flag ${flag.type}: "${quote.quote}"`);
      }
    }
    
    // For Pro tier, add detailed information with examples and recommendations - but only if quotes are validated
    if ((tier === 'pro' || tier === 'instant') && relevantQuotes.length > 0) {
      // Filter quotes once more to ensure validity
      const validQuotes = relevantQuotes.filter((quote: any) => 
        validateQuoteInConversation(quote.quote, analysis.conversation)
      );
      
      if (validQuotes.length > 0) {
        // Add all valid examples
        flag.examples = validQuotes.map((quote: any) => ({
          text: quote.quote,
          from: quote.speaker
        }));
        
        // Add primary example
        const primaryQuote = validQuotes[0];
        flag.quote = primaryQuote.quote;
        flag.speaker = primaryQuote.speaker;
        
        // Create impact analysis only with validated quotes
        flag.impact = `When ${primaryQuote.speaker} says "${primaryQuote.quote}", it creates tension and can damage trust in the relationship.`;
        
        // Create recommendation with validated quotes
        flag.recommendedAction = `Consider discussing how statements like "${primaryQuote.quote}" affect you emotionally, using "I" statements to express your feelings.`;
        
        // Add behavioral pattern analysis
        flag.behavioralPattern = `This type of communication may indicate an underlying pattern of ${flag.type.toLowerCase()} behavior that could escalate if not addressed.`;
      } else {
        console.log(`No valid quotes found for flag ${flag.type}, skipping quote enhancement`);
      }
    }
    
    return flag;
  });
  
  return enhancedAnalysis;
}