import { Request, Response } from 'express';
import { analyzeChatConversation, analyzeMessage, deEscalateMessage, detectParticipants } from '../services/anthropic-updated';
import { processImage } from '../services/ocr-service';
import { TIER_LIMITS } from '@shared/schema';
import { filterChatAnalysisByTier, filterMessageAnalysisByTier, filterDeEscalateResultByTier } from '../services/tier-service';
import { storage } from '../storage';
import { extractRedFlagsCount } from '../services/anthropic-helpers';
import { enhanceRedFlags } from '../services/red-flag-enhancer';
import { enhanceWithEvasionDetection } from '../services/evasion-detection';
import { enhanceWithConflictDynamics } from '../services/conflict-dynamics';
import { enhanceWithDirectRedFlags, detectRedFlagsDirectly } from '../services/direct-red-flag-detector';

// Import validation function from routes
function isValidWhatsAppFormat(text: string): boolean {
  if (!text || text.trim().length < 20) return false;
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 3) return false;
  
  const whatsappPatterns = [
    /\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}(\s*(AM|PM))?\s*-\s*.+:\s*.+/i,
    /\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?\]\s*.+:\s*.+/i,
    /\d{1,2}:\d{2}(\s*(AM|PM))?\s*-\s*.+:\s*.+/i,
    /\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4},?\s*\d{1,2}:\d{2}.*-.*:\s*.+/i,
    /^[^:\[\(]*:\s*.+/,
    /\s*-\s*.+:\s*.+/
  ];
  
  let validLines = 0;
  let totalChecked = 0;
  
  for (const line of lines.slice(0, Math.min(20, lines.length))) {
    totalChecked++;
    if (whatsappPatterns.some(pattern => pattern.test(line))) {
      validLines++;
    }
  }
  
  const validRatio = validLines / totalChecked;
  console.log(`WhatsApp validation: ${validLines}/${totalChecked} lines valid (${(validRatio * 100).toFixed(1)}%)`);
  return validRatio >= 0.3;
}

// Helper function to filter messages to recent timeframe (default: 3 months)
function filterRecentMessages(chatText: string, monthsBack: number = 3): string {
  const lines = chatText.split('\n');
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
  
  // WhatsApp date formats: DD/MM/YYYY, MM/DD/YYYY, etc.
  const dateRegexes = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+/, // DD/MM/YYYY or MM/DD/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+/, // YYYY-MM-DD
    /^\[(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+/ // [DD/MM/YYYY]
  ];
  
  const recentLines: string[] = [];
  let foundRecentMessage = false;
  
  for (const line of lines) {
    // Skip system messages and empty lines
    if (!line.trim() || line.includes('Messages and calls are end-to-end encrypted')) {
      recentLines.push(line);
      continue;
    }
    
    let messageDate: Date | null = null;
    
    // Try to parse date from line
    for (const regex of dateRegexes) {
      const match = line.match(regex);
      if (match) {
        const [, part1, part2, part3] = match;
        
        // Try different date interpretations
        const possibleDates = [
          new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1)), // DD/MM/YYYY
          new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2)), // MM/DD/YYYY
          new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3))  // YYYY-MM-DD
        ];
        
        // Use the date that seems most reasonable (not in future, not too old)
        for (const date of possibleDates) {
          if (date.getTime() <= Date.now() && date.getFullYear() > 2000) {
            messageDate = date;
            break;
          }
        }
        break;
      }
    }
    
    // If we found a date and it's recent enough, include this message
    if (messageDate && messageDate >= cutoffDate) {
      foundRecentMessage = true;
      recentLines.push(line);
    } else if (!messageDate && foundRecentMessage) {
      // This is likely a continuation of a recent message (no timestamp)
      recentLines.push(line);
    } else if (messageDate && messageDate < cutoffDate) {
      // This message is too old, skip it
      continue;
    } else if (!messageDate) {
      // No date found, include it (might be header or continuation)
      recentLines.push(line);
    }
  }
  
  const filteredText = recentLines.join('\n');
  console.log(`Date filtering: Original ${lines.length} lines, filtered to ${recentLines.length} lines (last ${monthsBack} months)`);
  
  // If filtering resulted in very few messages, fall back to more months
  const messageCount = recentLines.filter(line => 
    line.includes(':') && !line.includes('Messages and calls are end-to-end encrypted')
  ).length;
  
  if (messageCount < 10 && monthsBack < 12) {
    console.log(`Too few recent messages (${messageCount}), expanding to ${monthsBack * 2} months`);
    return filterRecentMessages(chatText, monthsBack * 2);
  }
  
  return filteredText;
}

// Get the user's tier from the authenticated session
const getUserTier = (req: Request): string => {
  // Regular authentication flow
  if (req.session && req.session.userId) {
    // For authenticated users, we'll get their tier from storage
    // But we'll return 'free' if we're unable to find it
    let tier = req.session.userTier || 'free';
    
    console.log(`getUserTier: Original tier from session: ${tier}`);
    
    // Beta tier users get Pro tier treatment
    if (tier === 'beta') {
      tier = 'pro';
      console.log('getUserTier: Converted Beta to Pro tier');
    }
    
    console.log(`getUserTier: Final tier: ${tier}`);
    return tier;
  } else {
    // For anonymous users
    return 'free';
  }
};

// Track a user's analysis usage
const trackUsage = async (req: Request): Promise<void> => {
  try {
    if (req.session && req.session.userId) {
      // Track usage for authenticated users
      await storage.incrementUserUsage(req.session.userId);
    } else if (req.body.deviceId) {
      // Track usage for anonymous users
      await storage.incrementAnonymousUsage(req.body.deviceId);
    }
    console.log('Usage tracked successfully');
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
};

// Function to analyze group chat conversations with multiple participants
// This specialized version handles WhatsApp group chats
const analyzeGroupChatConversation = async (conversation: string, participants: string[], tier: string): Promise<any> => {
  console.log(`Analyzing group chat with ${participants.length} participants using ${tier} tier`);
  
  // Handle missing or invalid API keys
  if (!process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-') && 
      !process.env.OPENAI_API_KEY?.startsWith('sk-')) {
    console.log('API keys missing or invalid - using mock analysis for development');
    // Return mock analysis with basic structure
    return createMockGroupAnalysis(conversation, participants, tier);
  }
  
  try {
    // Import the appropriate service based on the tier
    const { analyzeChatWithAnthropicAI } = await import('../services/anthropic-updated');
    
    // Create a specialized prompt to handle group chat dynamics
    // We'll simulate as if this is a multi-person conversation
    // The primary participant will be the first one, but all will be analyzed
    
    // Define main participants for prompt structure (needed for API format)
    const me = participants[0] || 'Participant1';
    // Use all remaining participants 
    const them = participants.slice(1).join(', ') || 'OtherParticipants';
    
    // Create detailed instruction for multi-participant analysis
    const groupChatInstruction = `
This is a GROUP CHAT with ${participants.length} participants: ${participants.join(', ')}.
Analyze the dynamics between ALL participants, not just two people.
For each detected pattern or issue, identify WHICH SPECIFIC PARTICIPANT(S) exhibit the behavior.
Ensure the analysis accounts for group dynamics, not just one-on-one interactions.

Important instructions for group chat analysis:
1. Include SEPARATE sections for EACH participant's communication style
2. For red flags, power dynamics, and other behavioral patterns, attribute them to the SPECIFIC participant
3. Include quotes from MULTIPLE participants to show group interaction patterns
4. Analyze how participants respond to each other beyond just one-to-one exchanges
5. Look for coalition patterns, subgrouping, or outsider dynamics that may be present
`;

    try {
      // Get the raw analysis from Anthropic
      const rawAnalysis = await analyzeChatWithAnthropicAI(conversation, me, them, tier, groupChatInstruction);
      
      // Ensure the participantTones includes all group members
      if (rawAnalysis && rawAnalysis.toneAnalysis && rawAnalysis.toneAnalysis.participantTones) {
        // Make sure all participants have tone descriptions
        for (const participant of participants) {
          if (!rawAnalysis.toneAnalysis.participantTones[participant]) {
            const briefDescription = `Group participant (tone not individually analyzed)`;
            rawAnalysis.toneAnalysis.participantTones[participant] = briefDescription;
          }
        }
      }
      
      // Add group chat specific data for UI rendering
      rawAnalysis.isGroupChat = true;
      rawAnalysis.groupParticipants = participants;
      
      // For message dominance and power dynamics in Pro tier
      if (tier === 'pro' || tier === 'instant') {
        // Generate message dominance data if not already present
        if (!rawAnalysis.messageDominance) {
          rawAnalysis.messageDominance = generateMessageDominanceAnalysis(conversation, participants);
        }
        
        // Generate power dynamics if not already present
        if (!rawAnalysis.powerDynamics) {
          rawAnalysis.powerDynamics = generatePowerDynamicsAnalysis(conversation, participants);
        }
      }
      
      // Return the full analysis
      return rawAnalysis;
    } catch (anthropicError) {
      console.error('Error in group chat analysis with Anthropic:', anthropicError);
      // If it's an API key error, throw a specific error
      if (anthropicError.message && anthropicError.message.includes('API key')) {
        throw new Error('Anthropic API key issue: ' + anthropicError.message);
      }
      // Otherwise continue to OpenAI fallback
      throw anthropicError;
    }
  } catch (error) {
    console.log('Attempting fallback to OpenAI for group chat analysis');
    
    // Check if OpenAI key is valid before attempting
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.error('OpenAI API key missing or invalid format');
      // Use mock analysis when both APIs fail due to key issues
      return createMockGroupAnalysis(conversation, participants, tier);
    }
    
    // Fall back to OpenAI for backup analysis if Anthropic fails
    try {
      const { analyzeChatWithOpenAI } = await import('../services/openai-service');
      
      // Use the same format for OpenAI service
      const me = participants[0] || 'Participant1';
      const them = participants.slice(1).join(', ') || 'OtherParticipants';
      
      const openAIAnalysis = await analyzeChatWithOpenAI(conversation, me, them, tier, `GROUP CHAT with ${participants.length} participants`);
      
      // Add group chat metadata
      openAIAnalysis.isGroupChat = true;
      openAIAnalysis.groupParticipants = participants;
      
      // For message dominance and power dynamics in Pro tier with OpenAI fallback
      if ((tier === 'pro' || tier === 'instant') && !openAIAnalysis.messageDominance) {
        openAIAnalysis.messageDominance = generateMessageDominanceAnalysis(conversation, participants);
      }
      
      if ((tier === 'pro' || tier === 'instant') && !openAIAnalysis.powerDynamics) {
        openAIAnalysis.powerDynamics = generatePowerDynamicsAnalysis(conversation, participants);
      }
      
      return openAIAnalysis;
    } catch (fallbackError) {
      console.error('Both Anthropic and OpenAI fallback failed for group chat analysis:', fallbackError);
      
      // If we get here, both APIs have failed
      // Return a mock analysis with basic structure
      return createMockGroupAnalysis(conversation, participants, tier);
    }
  }
};

// Create a mock analysis for development when API keys are missing
function createMockGroupAnalysis(conversation: string, participants: string[], tier: string): any {
  console.log('Creating mock analysis for group chat');
  
  // Extract message counts for basic stats
  const messageCountByParticipant: {[key: string]: number} = {};
  const lines = conversation.split('\n');
  
  // Initialize counts
  participants.forEach(participant => {
    messageCountByParticipant[participant] = 0;
  });
  
  // Count messages for basic stats
  for (const line of lines) {
    for (const participant of participants) {
      if (line.includes(`${participant}:`) || (line.includes(`[`) && line.includes(`] ${participant}:`))) {
        messageCountByParticipant[participant]++;
        break;
      }
    }
  }
  
  // Create a basic tone analysis
  const participantTones: {[key: string]: string} = {};
  participants.forEach(participant => {
    const messageCount = messageCountByParticipant[participant] || 0;
    const tone = messageCount > 10 ? "Active communicator" : 
                 messageCount > 5 ? "Regular participant" : 
                 "Occasional contributor";
    participantTones[participant] = tone;
  });
  
  // Create mock analysis structure with API error notification
  const mockAnalysis = {
    toneAnalysis: {
      overallTone: "Casual and informative group conversation",
      emotionalState: [
        { emotion: "Neutral", intensity: 0.7 },
        { emotion: "Friendly", intensity: 0.6 },
        { emotion: "Engaged", intensity: 0.5 }
      ],
      participantTones
    },
    apiErrorMessage: "Our AI analysis service is temporarily unavailable. We've provided a basic analysis instead.",
    communication: {
      patterns: [
        "Regular information sharing",
        "Question and answer exchanges",
        "Social coordination"
      ],
      suggestions: [
        "Consider more direct acknowledgment of quieter participants",
        "Follow up on unanswered questions"
      ]
    },
    healthScore: {
      score: 75,
      label: "Healthy",
      color: "green"
    },
    isGroupChat: true,
    groupParticipants: participants,
    // Add additional fields for higher tiers
    ...(tier !== 'free' && {
      redFlags: []
    }),
    ...(tier === 'pro' && {
      messageDominance: generateMessageDominanceAnalysis(conversation, participants),
      powerDynamics: generatePowerDynamicsAnalysis(conversation, participants)
    }),
    // Setup error message for UI notification
    apiErrorMessage: "Analysis run with limited functionality - error connecting to AI service."
  };
  
  return mockAnalysis;
}

// Helper function to generate message dominance analysis for group chats
const generateMessageDominanceAnalysis = (conversation: string, participants: string[]): any => {
  const lines = conversation.split('\n');
  const messageCountByParticipant: {[key: string]: number} = {};
  const totalWords: {[key: string]: number} = {};
  
  // Initialize counts for all participants
  participants.forEach(participant => {
    messageCountByParticipant[participant] = 0;
    totalWords[participant] = 0;
  });
  
  // Count messages and words for each participant
  for (const line of lines) {
    // Check for participant patterns in messages
    for (const participant of participants) {
      if (line.includes(`${participant}:`) || line.includes(`[`) && line.includes(`] ${participant}:`)) {
        messageCountByParticipant[participant]++;
        // Count words in this message
        const messageContent = line.split(':').slice(1).join(':').trim();
        totalWords[participant] += messageContent.split(' ').length;
        break;
      }
    }
  }
  
  // Calculate total messages
  const totalMessages = Object.values(messageCountByParticipant).reduce((sum, count) => sum + count, 0);
  
  // Create the message dominance analysis
  const dominanceAnalysis = {
    summary: "Analysis of message volume and participation patterns in the group chat",
    totalMessages,
    participantData: {} as {[key: string]: any}
  };
  
  // Add data for each participant
  participants.forEach(participant => {
    const messageCount = messageCountByParticipant[participant];
    const wordCount = totalWords[participant];
    const messagePercentage = totalMessages > 0 ? (messageCount / totalMessages) * 100 : 0;
    
    // Determine dominance level
    let dominanceLevel = "Balanced Participant";
    if (messagePercentage > 45) dominanceLevel = "Highly Dominant";
    else if (messagePercentage > 30) dominanceLevel = "Dominant";
    else if (messagePercentage < 10) dominanceLevel = "Minimal Participation";
    else if (messagePercentage < 5) dominanceLevel = "Observer";
    
    dominanceAnalysis.participantData[participant] = {
      messageCount,
      wordCount,
      messagePercentage: Math.round(messagePercentage),
      dominanceLevel
    };
  });
  
  return dominanceAnalysis;
};

// Helper function to generate power dynamics analysis for group chats
const generatePowerDynamicsAnalysis = (conversation: string, participants: string[]): any => {
  // Create a simple power dynamics analysis structure
  const powerDynamics = {
    overallDynamics: "Analysis of power distribution and influence in the conversation",
    patterns: [] as any[],
    participantRoles: {} as {[key: string]: string}
  };
  
  // Default patterns to look for in group chats
  const defaultPatterns = [
    {
      type: "Topic control",
      description: "Ability to shift conversation topics and have others follow",
      primaryIndicator: "Successful topic changes that others engage with"
    },
    {
      type: "Question-answer dynamics",
      description: "Who asks vs. who answers questions in the group",
      primaryIndicator: "Frequency of questions vs information provision"
    },
    {
      type: "Conflict mediation",
      description: "Who steps in to resolve disagreements",
      primaryIndicator: "De-escalation attempts during tense exchanges"
    }
  ];
  
  // Add the default patterns
  powerDynamics.patterns = defaultPatterns;
  
  // Assign basic roles based on message frequency
  const lines = conversation.split('\n');
  const messageCountByParticipant: {[key: string]: number} = {};
  
  // Initialize counts
  participants.forEach(participant => {
    messageCountByParticipant[participant] = 0;
  });
  
  // Count messages for each participant
  for (const line of lines) {
    // Check for participant patterns in messages
    for (const participant of participants) {
      if (line.includes(`${participant}:`) || line.includes(`[`) && line.includes(`] ${participant}:`)) {
        messageCountByParticipant[participant]++;
        break;
      }
    }
  }
  
  // Assign roles based on participation level
  const sortedParticipants = [...participants].sort((a, b) => 
    (messageCountByParticipant[b] || 0) - (messageCountByParticipant[a] || 0)
  );
  
  // Assign lead role to most active participant
  if (sortedParticipants.length > 0) {
    powerDynamics.participantRoles[sortedParticipants[0]] = "Conversation Leader";
  }
  
  // Assign other roles
  for (let i = 1; i < sortedParticipants.length; i++) {
    const participant = sortedParticipants[i];
    const messageCount = messageCountByParticipant[participant] || 0;
    
    if (i === 1 && sortedParticipants.length > 2) {
      powerDynamics.participantRoles[participant] = "Active Participant";
    } else if (messageCount < 3) {
      powerDynamics.participantRoles[participant] = "Observer";
    } else {
      powerDynamics.participantRoles[participant] = "Regular Participant";
    }
  }
  
  return powerDynamics;
};

// Check if user has reached their usage limit
const checkUsageLimit = async (req: Request): Promise<boolean> => {
  try {
    if (req.session && req.session.userId) {
      // Check usage limits for authenticated users
      const usage = await storage.getUserUsage(req.session.userId);
      
      // If limit is null or undefined, user has unlimited usage (admin or pro tier)
      if (usage.limit === null || usage.limit === undefined || usage.limit === Infinity) {
        return true; // No limit for admin/pro users
      }
      
      // For users with limits, check if they've reached their limit
      return usage.used < usage.limit;
    } else if (req.body.deviceId) {
      // Check usage limits for anonymous users
      const anonUsage = await storage.getAnonymousUsage(req.body.deviceId);
      if (!anonUsage) return true; // First time user
      
      // Anonymous users get 2 free analyses per month
      return anonUsage.count < 2;
    }
    return true; // Allow access if we can't determine usage
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return false; // Fail closed - if we can't check, don't allow
  }
};

// Filter conversation by date if date filter is provided
const filterConversationByDate = (conversation: string, dateFilter?: { fromDate?: string; toDate?: string }): string => {
  if (!dateFilter || (!dateFilter.fromDate && !dateFilter.toDate)) {
    return conversation;
  }
  
  // This regex matches common date/time formats in chat exports (especially WhatsApp)
  // Format examples: "1/2/23, 3:45 PM", "2023-01-02 15:45", "[02/01/2023, 15:45:21]", etc.
  const dateRegex = /(?:\[?\s*(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4})[,\s]+(\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s*[AP]M)?)\s*\]?)|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s*[AP]M)?)/i;
  
  const fromDate = dateFilter.fromDate ? new Date(dateFilter.fromDate) : null;
  const toDate = dateFilter.toDate ? new Date(dateFilter.toDate) : null;
  
  // Split the conversation into lines and filter by date
  const lines = conversation.split('\n');
  const filteredLines = lines.filter(line => {
    // Try to extract date from line
    const match = line.match(dateRegex);
    if (!match) return true; // If no date found, include the line
    
    let messageDate: Date | null = null;
    
    // Handle different date formats
    if (match[1] && match[2]) {
      // Format: 1/2/23, 3:45 PM or 2023-01-02 15:45
      const datePart = match[1];
      const timePart = match[2];
      
      // Try to parse the date, handling different separators (/, -, .)
      const parts = datePart.split(/[-/.]/);
      if (parts.length === 3) {
        // Determine if year is first (YYYY-MM-DD) or last (MM/DD/YYYY or DD/MM/YYYY)
        const isYearFirst = parts[0].length === 4;
        const year = isYearFirst ? parts[0] : parts[2];
        const month = isYearFirst ? parts[1] : parts[0];
        const day = isYearFirst ? parts[2] : parts[1];
        
        // Convert to full year if needed (23 -> 2023)
        const fullYear = year.length === 2 ? `20${year}` : year;
        
        // Create date string in a standardized format
        const dateString = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart.replace(/\s*([AP]M)$/i, '')}`;
        messageDate = new Date(dateString);
      }
    } else if (match[3]) {
      // Format: Month Day, Year HH:MM (e.g., "January 2, 2023 3:45 PM")
      messageDate = new Date(match[3]);
    }
    
    // If we couldn't parse the date, include the line
    if (!messageDate || isNaN(messageDate.getTime())) return true;
    
    // Filter based on date range
    if (fromDate && messageDate < fromDate) return false;
    if (toDate && messageDate > toDate) return false;
    
    return true;
  });
  
  // If no messages matched our date filter, return the original conversation
  if (filteredLines.length === 0 || (filteredLines.length === 1 && filteredLines[0].trim() === '')) {
    console.log('No messages matched the date filter, using original conversation');
    return conversation;
  }
  
  return filteredLines.join('\n');
};

export const analysisController = {
  // Analyze chat conversation
  analyzeChat: async (req: Request, res: Response) => {
    try {
      const { conversation, me, them, dateFilter, extraData } = req.body;
      
      // Check if this is a group chat analysis
      const isGroupChat = extraData?.isGroupChat === true;
      const groupParticipants = extraData?.groupParticipants || [];
      
      if (!conversation || !me || !them) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
      
      // Validate conversation data integrity to prevent analysis of corrupted extractions
      const conversationLines = conversation.split('\n').filter((line: string) => line.trim().length > 0);
      const messageLines = conversationLines.filter((line: string) => line.includes(':') && line.trim().length > 5);
      
      if (conversationLines.length < 3 || messageLines.length < 2) {
        return res.status(400).json({ 
          message: 'Conversation data appears incomplete or corrupted. Please verify your chat export and try again.',
          error: 'INVALID_CONVERSATION_DATA'
        });
      }
      
      // Check for realistic conversation length and complexity
      const averageMessageLength = messageLines.reduce((sum, line) => sum + line.length, 0) / messageLines.length;
      if (averageMessageLength < 10 || averageMessageLength > 1000) {
        return res.status(400).json({ 
          message: 'The conversation data does not appear to be from a genuine chat export. Please upload a real WhatsApp conversation.',
          error: 'UNREALISTIC_DATA'
        });
      }
      
      // Check for obvious placeholder patterns (but allow real names like "Dad")
      const hasObviousPlaceholders = conversation.includes('User1') ||
                                    conversation.includes('User2') ||
                                    conversation.includes('Person A') ||
                                    conversation.includes('Person B') ||
                                    conversation.includes('Participant1') ||
                                    conversation.includes('Participant2');
      
      if (hasObviousPlaceholders && messageLines.length < 10) {
        return res.status(400).json({ 
          message: 'The conversation appears to contain placeholder or test data. Please upload a genuine WhatsApp chat export.',
          error: 'PLACEHOLDER_DATA'
        });
      }
      
      // Additional validation for ZIP-extracted content
      if (conversation.length < 100 || conversation.includes('Failed to read') || conversation.includes('corrupted')) {
        return res.status(400).json({ 
          message: 'Chat extraction failed. Please export your conversation again and ensure the file is not corrupted.',
          error: 'EXTRACTION_FAILED'
        });
      }
      
      // Strict validation to prevent analysis of questionable extractions
      const hasValidWhatsAppFormat = messageLines.some((line: string) => {
        // Check for common WhatsApp patterns - be more inclusive
        return /\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}/.test(line) || 
               /\d{1,2}:\d{2}/.test(line) ||
               /\[\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}/.test(line) ||
               /\s*-\s*.+:\s*.+/.test(line) ||
               (line.includes(':') && line.includes(' ') && line.length > 10);
      });
      
      // Only block if it's clearly not a conversation format at all
      if (!hasValidWhatsAppFormat && messageLines.length < 5) {
        return res.status(400).json({ 
          message: 'The uploaded content does not appear to be a valid WhatsApp chat export. Please ensure you are uploading the correct file format.',
          error: 'INVALID_FORMAT'
        });
      }
      
      // Check for signs of artificial or corrupted content
      const suspiciousIndicators = [
        'artificially generated', 'synthetic data', 'mock conversation',
        'placeholder text', 'sample chat', 'test conversation',
        'corrupted file', 'extraction error', 'binary content'
      ];
      
      const hasArtificialContent = suspiciousIndicators.some(indicator => 
        conversation.toLowerCase().includes(indicator)
      );
      
      if (hasArtificialContent) {
        return res.status(400).json({ 
          message: 'The content appears to be artificial or corrupted. Please upload a genuine WhatsApp chat export.',
          error: 'ARTIFICIAL_CONTENT'
        });
      }
      
      // Final safety check: If this appears to be from a failed extraction, block it entirely
      const conversationSample = conversation.substring(0, 1000).toLowerCase();
      const hasRepeatedPatterns = /(.{10,})\1{2,}/.test(conversationSample);
      const hasMinimalVariation = messageLines.every((line: string, index: number) => 
        index === 0 || line.length < 30 || messageLines.filter(l => l === line).length > 1
      );
      
      if (hasRepeatedPatterns || (hasMinimalVariation && messageLines.length < 20)) {
        return res.status(400).json({ 
          message: 'The conversation data appears to be corrupted or incomplete. Please try exporting your chat again.',
          error: 'CORRUPTED_EXTRACTION'
        });
      }
      
      // Check if user has reached usage limit
      const canUseFeature = await checkUsageLimit(req);
      if (!canUseFeature) {
        return res.status(403).json({ message: 'Usage limit reached' });
      }
      
      // Get user tier and convert Beta to Pro at the source
      let tier = getUserTier(req);
      if (tier === 'beta') {
        tier = 'pro';
        console.log('BETA USER: Converting to Pro tier for complete analysis');
      }
      console.log(`CHAT ANALYSIS USING TIER: ${tier} (type: ${typeof tier})`);
      console.log(`DevMode header: ${req.headers['x-dev-mode']}, DevTier header: ${req.headers['x-dev-tier']}`);
      console.log(`Tier comparison result: tier === 'beta' is ${tier === 'beta'}`);
      
      // Track usage
      await trackUsage(req);
      
      // Filter conversation by date if date filter is provided
      const filteredConversation = filterConversationByDate(conversation, dateFilter);
      
      let filteredResults: any;
      
      try {
        // Use the already converted tier (tier was converted to 'pro' if it was 'beta' at line 516)
        console.log(`Using tier ${tier} for chat analysis request`);
        
        // For free tier, we need to detect red flags
        // To do this properly, we'll run both a free tier analysis AND a personal tier analysis
        let analysis;
        let personalAnalysis = null;
        
        // Modify the analysis request based on whether it's a group chat
        if (isGroupChat && groupParticipants.length > 2) {
          console.log(`Group chat analysis with ${groupParticipants.length} participants`);
          
          if (tier === 'free') {
            console.log('Running group chat analysis with additional personal tier for red flags detection');
            
            // First get the free tier analysis for group chat
            analysis = await analyzeGroupChatConversation(filteredConversation, groupParticipants, 'free');
            
            // Get personal tier analysis for accurate red flags
            try {
              console.log('Running personal tier group analysis for red flags detection');
              personalAnalysis = await analyzeGroupChatConversation(filteredConversation, groupParticipants, 'personal');
              console.log('Successfully ran personal tier group analysis for red flags detection');
              
              if (personalAnalysis && personalAnalysis.redFlags) {
                console.log(`Found ${personalAnalysis.redFlags.length} red flags in personal tier group analysis`);
              } else {
                console.log('No red flags found in personal tier group analysis');
              }
            } catch (personalError) {
              console.error('Failed to run personal analysis for group chat red flags:', personalError);
            }
          } else {
            // Regular analysis for group chat with other tiers
            analysis = await analyzeGroupChatConversation(filteredConversation, groupParticipants, tier);
          }
        } else {
          // Regular two-person chat analysis
          if (tier === 'free') {
            console.log('Running additional personal tier analysis to detect red flags for free tier');
            
            // First get the free tier analysis
            analysis = await analyzeChatConversation(filteredConversation, me, them, 'free');
            
            // Then get a personal tier analysis to extract red flags count
            // This is critical for data integrity - we need the actual red flags count
            try {
              console.log('Running dedicated personal tier analysis to get accurate red flags count');
              // Make sure we use a clean request for the personal tier analysis
              personalAnalysis = await analyzeChatConversation(filteredConversation, me, them, 'personal');
              console.log('Successfully ran personal tier analysis for red flags detection');
              
              // Verify that we got red flags data
              if (personalAnalysis && personalAnalysis.redFlags) {
                console.log(`Found ${personalAnalysis.redFlags.length} red flags in personal tier analysis`);
              } else {
                console.log('No red flags found in personal tier analysis');
              }
            } catch (personalError) {
              console.error('Failed to run personal analysis for red flags:', personalError);
            }
          } else {
            // Regular analysis for other tiers
            analysis = await analyzeChatConversation(filteredConversation, me, them, tier);
          }
        }
        
        console.log(`Chat analysis complete, applying tier filter: ${tier}`);
        
        // Check original tier before getUserTier conversion (Beta -> Pro)
        const originalTier = req.session && req.session.userId ? (req.session.userTier || 'free') : 'free';
        console.log(`BETA TIER CHECK: originalTier = ${originalTier}, converted tier = ${tier}`);
        console.log(`BETA TIER CHECK: originalTier === 'beta'? ${originalTier === 'beta'}`);
        
        // Special handling for Beta tier - use dedicated service
        if (originalTier === 'beta') {
          console.log('BETA TIER: Using dedicated Beta tier service');
          const { createBetaTierAnalysis } = await import('../services/beta-tier-service');
          filteredResults = createBetaTierAnalysis(analysis, me, them);
          console.log('BETA TIER: Dedicated analysis complete');
          
          // Return immediately to skip all other processing
          res.json(filteredResults);
          return;
        } else {
          // Filter results based on tier for non-Beta users
          console.log(`NON-BETA TIER: Using standard filtering for tier: ${tier}`);
          filteredResults = filterChatAnalysisByTier(analysis, tier);
        }
        
        // Skip additional processing for Beta tier (already handled by dedicated service)
        if (tier !== 'beta') {
          // Get direct red flags from the conversation text (only if health score is below 85)
          const conversationText = filteredConversation;
          const healthScore = filteredResults.healthScore?.score || 0;
          
          if (healthScore >= 85) {
            console.log(`Skipping ALL red flag detection for healthy conversation (health score: ${healthScore})`);
            // Ensure no red flags exist for healthy conversations
            if (filteredResults.redFlags && filteredResults.redFlags.length > 0) {
              console.log(`Removing ${filteredResults.redFlags.length} existing red flags from healthy conversation`);
              filteredResults.redFlags = [];
            }
          } else {
            const directRedFlags = detectRedFlagsDirectly(conversationText, healthScore);
            console.log(`Directly detected ${directRedFlags.length} red flags from text patterns`);
            
            // Apply direct red flag detection to ensure we catch toxic patterns
            // that might be missed by the AI model
            filteredResults = enhanceWithDirectRedFlags(filteredResults, conversationText);
          }
          console.log('Added direct red flag detection');
          
          // Add conflict dynamics analysis to all tiers with varying detail levels
          filteredResults = enhanceWithConflictDynamics(filteredResults, tier);
          console.log(`Added ${tier} tier conflict dynamics analysis`);
          
          // For Personal, Pro, and Instant tiers, add evasion detection
          if (tier === 'personal' || tier === 'pro' || tier === 'instant') {
            filteredResults = enhanceWithEvasionDetection(filteredResults, tier);
            console.log(`Added ${tier} tier evasion detection`);
          }
          
          // Add the raw conversation to the analysis for our red flag filters
          filteredResults.conversation = filteredConversation;
          
          // Enhance red flags with conversation-specific insights based on tier
          filteredResults = enhanceRedFlags(filteredResults, tier);
          console.log(`Enhanced ${tier} tier red flag detection`);
        }
        
        // Post-process to precisely remove only stonewalling flags
        if (filteredResults.redFlags && filteredResults.redFlags.length > 0) {
          // Filter out ONLY exact stonewalling flags while keeping other valid ones
          filteredResults.redFlags = filteredResults.redFlags.filter(flag => {
            const flagType = (flag.type || '').toLowerCase();
            
            // Check only for exact matches to "stonewalling" rather than broad filtering
            const isStonewallingFlag = 
              flagType === 'stonewalling' || 
              flagType === 'emotional withdrawal' ||
              (flagType.includes('stonewalling') && !flagType.includes('invalidation') && !flagType.includes('contempt'));
            
            if (isStonewallingFlag) {
              console.log(`Post-processing filter: Removing specific stonewalling flag: ${flag.type}`);
              return false;
            }
            
            return true;
          });
          
          console.log(`Post-processing filter: ${filteredResults.redFlags.length} flags remain after filtering stonewalling`);
        }
        
        // For free tier, add red flag types from personal analysis
        if (tier === 'free') {
          // Check AI detected flags first (this should be the primary path)
          if (personalAnalysis?.redFlags && personalAnalysis.redFlags.length > 0) {
            // Filter out only stonewalling flags and keep other valid flags
            const filteredRedFlags = personalAnalysis.redFlags.filter(flag => {
              const flagType = (flag.type || '').toLowerCase();
              const flagDesc = (flag.description || '').toLowerCase();
              
              // Check only for exact matches to "stonewalling" type/names
              // but keep other legitimate flags
              return !(
                flagType === 'stonewalling' || 
                flagType === 'emotional withdrawal' ||
                (flagType.includes('stonewalling') && 
                 (flagDesc.includes('stonewalling') || 
                  flagDesc.includes('silent treatment') ||
                  flagDesc.includes('shutting down')))
              );
            });
            
            // Get unique red flag types using a simple filter approach
            const redFlagTypes = filteredRedFlags
              .map(flag => flag.type)
              .filter((value, index, self) => self.indexOf(value) === index);
            
            console.log(`Raw red flags count: ${personalAnalysis.redFlags.length}`);
            console.log(`Filtered red flags count (removed stonewalling): ${filteredRedFlags.length}`);
            console.log(`Unique red flag types: ${redFlagTypes.length}`);
            console.log('Adding basic red flag types to free tier analysis');
            
            // For free tier, only show count and upgrade prompt - no detailed descriptions
            filteredResults.redFlags = [];
            (filteredResults as any).redFlagsDetected = true;
            (filteredResults as any).redFlagCount = filteredRedFlags.length;
            (filteredResults as any).upgradePrompt = "Upgrade to Personal tier for specific red flag details and participant analysis";
            console.log(`Free tier: Detected ${filteredRedFlags.length} red flags, showing count only`);
          } else {
            // Fallback to health score when no red flags detected
            console.log('No red flags in personal analysis, using fallback logic');
            
            // For moderately low health scores, add basic communication issues flag
            if (analysis.healthScore && analysis.healthScore.score < 60) {
              console.log('Setting default red flag types based on health score');
              (filteredResults as any).redFlagTypes = ['communication issues'];
              (filteredResults as any).redFlagsDetected = true;
            } else {
              (filteredResults as any).redFlagsDetected = false;
            }
          }
        }
      } catch (analysisError) {
        console.error('Error in analysis controller layer:', analysisError);
        
        // Return a proper error response
        return res.status(422).json({
          error: "We couldn't analyze your conversation. Please try submitting again with a clearer conversation format. If the problem persists, please contact support via Facebook."
        });
      }
      
      // Add participant information to the response
      filteredResults.participants = { me, them };
      
      res.json(filteredResults);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },
  
  // Analyze single message
  analyzeMessage: async (req: Request, res: Response) => {
    try {
      const { message, author } = req.body;
      
      if (!message || !author) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
      
      // Check if user has reached usage limit
      const canUseFeature = await checkUsageLimit(req);
      if (!canUseFeature) {
        return res.status(403).json({ message: 'Usage limit reached' });
      }
      
      // Get user tier
      const tier = getUserTier(req);
      
      // Track usage
      await trackUsage(req);
      
      // Analyze message
      const analysis = await analyzeMessage(message, author, tier);
      
      // Filter results based on user's tier
      const filteredResults = filterMessageAnalysisByTier(analysis, tier);
      
      res.json(filteredResults);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },
  
  // De-escalate a potentially heated message (now called Vent Mode)
  deEscalateMessage: async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
      
      // Get user tier
      const tier = getUserTier(req);
      
      // No need to track usage for de-escalation as it's a free feature for all users
      
      // De-escalate message
      const analysis = await deEscalateMessage(message, tier);
      
      // Filter results based on user's tier
      const filteredResults = filterDeEscalateResultByTier(analysis, tier);
      
      res.json(filteredResults);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },
  
  // Detect participant names from conversation
  detectNames: async (req: Request, res: Response) => {
    try {
      const { conversation } = req.body;
      
      if (!conversation) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
      
      // Detect participants
      const participants = await detectParticipants(conversation);
      
      res.json(participants);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },
  
  // Process image OCR
  processOcr: async (req: Request, res: Response) => {
    try {
      const { image, imageData } = req.body;
      const base64Image = image || imageData;
      
      if (!base64Image) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
      
      // Set a timeout for OCR processing to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('OCR processing timed out')), 25000); // 25 second timeout
      });
      
      console.log('Starting OCR processing...');
      
      // Process image with Tesseract OCR with timeout
      const extractedText = await Promise.race([
        processImage(base64Image),
        timeoutPromise
      ]);
      
      console.log('OCR processing completed, text length:', extractedText?.length || 0);
      
      res.json({ text: extractedText });
    } catch (error: any) {
      console.error('OCR processing error:', error);
      if (error.message.includes('timed out')) {
        res.status(408).json({ message: 'OCR processing timed out. Please try with a clearer or smaller image.' });
      } else {
        res.status(500).json({ message: error.message || 'Internal server error' });
      }
    }
  },

  // Process WhatsApp screenshot using Azure Vision API with positioning
  processWhatsAppScreenshot: async (req: Request, res: Response) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ message: 'Missing required image parameter' });
      }

      console.log('Starting Azure Vision processing for WhatsApp screenshot...');

      // Import Azure Vision service
      const { analyzeImageWithAzure } = await import('../services/azure-vision');
      
      // Process image with Azure Vision to get positioned text
      const result = await analyzeImageWithAzure(image);
      
      console.log('Azure Vision processing completed, found', result.messages.length, 'messages');
      
      res.json({
        messages: result.messages,
        imageWidth: result.imageWidth,
        rawText: result.rawText
      });
    } catch (error: any) {
      console.error('Azure Vision processing error:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },

  // Import and analyze WhatsApp chat files
  importChatFiles: async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Extract participant names from form data
      const participantNames: string[] = [];
      let index = 0;
      while (req.body[`participant_${index}`]) {
        participantNames.push(req.body[`participant_${index}`]);
        index++;
      }

      // Allow empty participant names for auto-detection
      // If no names provided, we'll use auto-detection in the processing loop

      console.log(`Processing ${files.length} chat files with participants:`, participantNames);
      const results = [];

      for (const file of files) {
        let chatText = '';
        
        try {
          if (file.originalname.toLowerCase().endsWith('.txt')) {
            // Handle text files
            chatText = file.buffer.toString('utf-8');
          } else if (file.originalname.toLowerCase().endsWith('.zip')) {
            // Handle ZIP files using JSZip
            const JSZip = require('jszip');
            
            const zip = new JSZip();
            const zipContents = await zip.loadAsync(file.buffer);
            
            // Look for .txt files in the ZIP
            const txtFiles = Object.keys(zipContents.files).filter(filename => 
              filename.toLowerCase().endsWith('.txt') && !zipContents.files[filename].dir
            );
            
            if (txtFiles.length === 0) {
              throw new Error('No .txt files found in ZIP archive');
            }
            
            // Process the first .txt file found
            const txtFile = zipContents.files[txtFiles[0]];
            chatText = await txtFile.async('text');
          } else {
            throw new Error('Unsupported file type');
          }

          // Validate that this looks like a WhatsApp export
          if (!isValidWhatsAppFormat(chatText)) {
            throw new Error('File does not appear to be a valid WhatsApp export');
          }

          // Apply date-based filtering to focus on recent conversation patterns
          chatText = filterRecentMessages(chatText);

          // Handle participant names - use provided names or set defaults for auto-detection
          let me = participantNames[0] || "";
          let them = participantNames[1] || "";
          
          try {
            // Attempt auto-detection if no names provided or if names are empty
            if (!me || !them || me.trim() === '' || them.trim() === '') {
              const detectedParticipants = await detectParticipants(chatText);
              if (detectedParticipants.me && detectedParticipants.them) {
                me = detectedParticipants.me;
                them = detectedParticipants.them;
                console.log(`Auto-detected participants: ${me} and ${them}`);
              } else {
                console.log(`Auto-detection failed, using provided names: ${me} and ${them}`);
              }
            } else {
              console.log(`Using provided participant names: ${me} and ${them}`);
            }
          } catch (detectionError) {
            console.log(`Auto-detection failed, using provided names: ${me} and ${them}`);
          }
          
          // For group chats with more than 2 participants
          if (participantNames.length > 2) {
            const analysis = await analyzeGroupChatConversation(chatText, participantNames);
            results.push({
              filename: file.originalname,
              success: true,
              analysis: analysis
            });
          } else {
            // Regular 1-on-1 chat analysis
            // Get user tier to apply proper filtering
            const originalTier = (req as any).user?.tier || 'free';
            const tier = getUserTier(req);
            
            let analysis = await analyzeChatConversation(chatText, me, them, tier);
            
            // Special handling for Beta tier - use dedicated service
            if (originalTier === 'beta') {
              console.log('BETA TIER FILE IMPORT: Using dedicated Beta tier service');
              const { createBetaTierAnalysis } = await import('../services/beta-tier-service');
              analysis = createBetaTierAnalysis(analysis, me, them);
              console.log('BETA TIER FILE IMPORT: Dedicated analysis complete');
            }
            
            // Apply the same free tier filtering logic as the main analysis endpoint
            if (tier === 'free') {
              // Run personal tier analysis to get red flag count
              let personalAnalysis = null;
              try {
                personalAnalysis = await analyzeChatConversation(chatText, me, them, 'personal');
                
                if (personalAnalysis?.redFlags && personalAnalysis.redFlags.length > 0) {
                  // Filter out stonewalling flags
                  const filteredRedFlags = personalAnalysis.redFlags.filter(flag => {
                    const flagType = (flag.type || '').toLowerCase();
                    const flagDesc = (flag.description || '').toLowerCase();
                    
                    return !(
                      flagType === 'stonewalling' || 
                      flagType === 'emotional withdrawal' ||
                      (flagType.includes('stonewalling') && 
                       (flagDesc.includes('stonewalling') || 
                        flagDesc.includes('silent treatment') ||
                        flagDesc.includes('shutting down')))
                    );
                  });
                  
                  // For free tier, only show count and upgrade prompt
                  analysis.redFlags = [];
                  analysis.redFlagsDetected = true;
                  analysis.redFlagCount = filteredRedFlags.length;
                  analysis.upgradePrompt = "Upgrade to Personal tier for specific red flag details and participant analysis";
                  console.log(`File import free tier: Detected ${filteredRedFlags.length} red flags, showing count only`);
                } else {
                  analysis.redFlagsDetected = false;
                }
              } catch (personalError) {
                console.error('Failed to run personal analysis for file import:', personalError);
              }
            }
            
            // Add participant information to the analysis
            analysis.participants = { me, them };
            
            results.push({
              filename: file.originalname,
              success: true,
              analysis: analysis
            });
          }

        } catch (fileError) {
          console.error(`Error processing file ${file.originalname}:`, fileError);
          results.push({
            filename: file.originalname,
            success: false,
            error: fileError instanceof Error ? fileError.message : 'Unknown error'
          });
        }
      }

      // For single file upload, return the analysis directly
      if (files.length === 1 && results.length === 1 && results[0].success) {
        return res.json(results[0].analysis);
      }

      // For multiple files, return the full results array
      res.json({
        success: true,
        message: `Processed ${files.length} files`,
        results: results
      });

    } catch (error: any) {
      console.error('Chat import error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
};

// Function to detect participant names from chat text
export async function detectParticipantNames(chatText: string): Promise<{ me: string | null, them: string | null }> {
  try {
    console.log('Detecting participant names from chat text...');
    
    // Parse the chat text to extract unique speakers
    const lines = chatText.split('\n').filter(line => line.trim());
    const speakers = new Set<string>();
    
    // WhatsApp format: [date, time] Speaker: message
    for (const line of lines) {
      const match = line.match(/\[.*?\]\s*([^:]+):/);
      if (match && match[1]) {
        const speaker = match[1].trim();
        if (speaker && !speaker.includes('joined') && !speaker.includes('left')) {
          speakers.add(speaker);
        }
      }
    }
    
    const speakerArray = Array.from(speakers);
    console.log('Detected speakers:', speakerArray);
    
    if (speakerArray.length >= 2) {
      return {
        me: speakerArray[0],
        them: speakerArray[1]
      };
    } else if (speakerArray.length === 1) {
      return {
        me: speakerArray[0],
        them: null
      };
    } else {
      return {
        me: null,
        them: null
      };
    }
  } catch (error) {
    console.error('Error detecting participant names:', error);
    return {
      me: null,
      them: null
    };
  }
}
