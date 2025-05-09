import Anthropic from '@anthropic-ai/sdk';
import { TIER_LIMITS } from "@shared/schema";
import { getTextFromContentBlock, parseAnthropicJson } from './anthropic-helpers';

// Define response types (keeping the same structure as before)
interface ChatAnalysisResponse {
  toneAnalysis: {
    overallTone: string;
    emotionalState: Array<{
      emotion: string;
      intensity: number;
    }>;
    participantTones?: {
      [key: string]: string;
    };
  };
  redFlags?: Array<{
    type: string;
    description: string;
    severity: number;
  }>;
  communication: {
    patterns: string[];
    dynamics?: string[];
    suggestions?: string[];
  };
  dramaScore?: number;
  healthScore?: {
    score: number;
    label: string;
    color: 'red' | 'yellow' | 'light-green' | 'green';
  };
  keyQuotes?: Array<{
    speaker: string;
    quote: string;
    analysis: string;
    improvement?: string;
  }>;
  highTensionFactors?: Array<string>;
  participantConflictScores?: {
    [participant: string]: {
      score: number;
      label: string;
      isEscalating: boolean;
    }
  };
}

interface MessageAnalysisResponse {
  tone: string;
  intent: string[];
  suggestedReply?: string;
  potentialResponse?: string;
  possibleReword?: string;
}

interface VentModeResponse {
  original: string;
  rewritten: string;
  explanation: string;
}

// Check if API key is available
const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set in environment variables');
} else {
  const maskedKey = apiKey.substring(0, 8) + '*'.repeat(Math.max(0, apiKey.length - 8));
  console.log(`ANTHROPIC_API_KEY is set, masked: ${maskedKey}`);
}

// Create Anthropic client
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Prompts (similar structure to OpenAI but adapted for Anthropic)
const prompts = {
  chat: {
    free: `Analyze this conversation between {me} and {them}. 
    Return a JSON object with the following structure:
    {
      "toneAnalysis": {
        "overallTone": "string describing the conversation's overall tone",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
        "participantTones": {"participant name": "tone description"}
      },
      "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5}],
      "communication": {
        "patterns": ["string describing specific communication patterns - use distinct, non-repetitive observations"],
        "dynamics": ["string describing relationship dynamics - focus on how participants interact with each other"],
        "suggestions": ["string with suggestions for improvement"]
      },
      "healthScore": {
        "score": number between 0-100,
        "label": "Troubled/Needs Work/Good/Excellent",
        "color": "red/yellow/light-green/green"
      },
      "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "interpretation", "improvement": "suggestion for how to reword this statement to be more constructive"}]
    }
    
    Here's the conversation:
    {conversation}`,

    personal: `Analyze this conversation between {me} and {them}. 
    Return a JSON object with the following structure:
    {
      "toneAnalysis": {
        "overallTone": "string describing the conversation's overall tone",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
        "participantTones": {"participant name": "tone description"}
      },
      "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5}],
      "communication": {
        "patterns": ["string describing patterns observed"],
        "suggestions": ["string with suggestions for improvement"]
      },
      "healthScore": {
        "score": number between 0-100,
        "label": "Troubled/Needs Work/Good/Excellent",
        "color": "red/yellow/light-green/green"
      },
      "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "interpretation", "improvement": "suggestion for how to reword this statement to be more constructive"}],
      "highTensionFactors": ["string with reason"],
      "participantConflictScores": {
        "participant name": {
          "score": number between 0-100,
          "label": "string describing style",
          "isEscalating": boolean
        }
      }
    }
    
    Here's the conversation:
    {conversation}`,

    pro: `Perform a comprehensive analysis of this conversation between {me} and {them}.
    Return a JSON object with the following structure:
    {
      "toneAnalysis": {
        "overallTone": "string describing the conversation's overall tone",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
        "participantTones": {"participant name": "tone description"}
      },
      "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5}],
      "communication": {
        "patterns": ["string describing patterns observed"],
        "suggestions": ["string with suggestions for improvement"]
      },
      "healthScore": {
        "score": number between 0-100,
        "label": "Troubled/Needs Work/Good/Excellent",
        "color": "red/yellow/light-green/green"
      },
      "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "interpretation", "improvement": "suggestion for improvement"}],
      "highTensionFactors": ["string with reason"],
      "participantConflictScores": {
        "participant name": {
          "score": number between 0-100,
          "label": "string describing style",
          "isEscalating": boolean
        }
      }
    }
    
    Here's the conversation:
    {conversation}`
  },
  message: {
    free: `Provide a basic analysis of this message sent by {author}. Focus only on the tone and intent of the message.
    Return a JSON object with the following structure:
    {
      "tone": "brief description of the tone",
      "intent": ["brief array with basic likely intentions"]
    }
    
    FOCUS ONLY ON BASIC FREE TIER FEATURES:
    - Simple tone identification
    - Basic intent recognition
    
    Here's the message:
    {message}`,
    
    personal: `Analyze this message sent by {author} with personal-level depth. Focus on the tone, intent, and suggest a possible reply.
    Return a JSON object with the following structure:
    {
      "tone": "detailed description of the tone with emotion recognition",
      "intent": ["comprehensive array of likely intentions with subtlety analysis"],
      "suggestedReply": "personalized suggested response",
      "manipulationScore": "description of any manipulation techniques used (if any)"
    }
    
    INCLUDE PERSONAL TIER FEATURES:
    - Advanced tone analysis
    - Personalized response suggestions
    - Basic manipulation detection
    - Communication style insights
    
    Here's the message:
    {message}`,
    
    pro: `Perform a comprehensive professional-level analysis of this message sent by {author}. Examine tone, intent, and provide detailed guidance.
    Return a JSON object with the following structure:
    {
      "tone": "comprehensive description of the tone with emotional nuance and subtext",
      "intent": ["detailed array with primary and secondary intentions, including possible hidden motives"],
      "suggestedReply": "tailored professional response recommendation",
      "potentialResponse": "projection of how the other person might respond",
      "possibleReword": "reframed version of the message optimized for positive communication",
      "powerDynamics": "analysis of control and influence patterns in the message",
      "communicationStyle": "detailed breakdown of the communication approach and its effectiveness"
    }
    
    INCLUDE PRO/RELATIONSHIP TIER FEATURES:
    - Deep message analysis with emotional subtext
    - Power dynamic insights
    - Response projections
    - Relationship pattern recognition
    - Detailed communication style assessment
    - Advanced reframing guidance
    
    Here's the message:
    {message}`
  },
  deEscalate: {
    free: `Rewrite this emotional message in a calmer, more constructive way.
    Return a JSON object with the following structure:
    {
      "original": "the original message",
      "rewritten": "rewritten message that's calmer and more constructive",
      "explanation": "explanation of changes made"
    }
    
    Here's the message:
    {message}`
  },
  detectNames: `Extract the two primary participants in this conversation.
  Analyze the flow of the conversation to determine who "me" (the person who might be using the app)
  and who "them" (the other person they're talking about) are.
  
  Return a simple JSON object with only two keys: "me" and "them", each with a string value of the person's name.
  
  Conversation:
  {conversation}`
};

// Helper functions are imported from anthropic-helpers.ts

/**
 * Special raw response parser to handle malformed responses from Anthropic API
 * This parser extracts key data using regex patterns directly from the raw response
 */
function extractRawChatAnalysis(rawContent: string, me: string, them: string): any {
  console.log("Using raw response extraction as fallback");
  
  try {
    // Store all extracted information
    const result: any = {
      toneAnalysis: { 
        overallTone: "", 
        emotionalState: [],
        participantTones: {}
      },
      communication: { 
        patterns: [] 
      },
      healthScore: { 
        score: 50, 
        label: "Analysis pending", 
        color: "yellow"
      }
    };
    
    // Extract overall tone
    const overallToneMatch = rawContent.match(/overallTone["'\s:]+([^"',}]+)/);
    if (overallToneMatch && overallToneMatch[1]) {
      result.toneAnalysis.overallTone = overallToneMatch[1].trim();
    } else {
      result.toneAnalysis.overallTone = "Analysis incomplete";
    }
    
    // Extract emotional state
    const emotionMatches = rawContent.match(/emotion["'\s:]+([^"',}]+).*?intensity["'\s:]+([0-9.]+)/g);
    if (emotionMatches) {
      emotionMatches.forEach(match => {
        const emotion = match.match(/emotion["'\s:]+([^"',}]+)/)?.[1].trim();
        const intensity = parseFloat(match.match(/intensity["'\s:]+([0-9.]+)/)?.[1] || "0.5");
        if (emotion) {
          result.toneAnalysis.emotionalState.push({ emotion, intensity });
        }
      });
    }
    
    // If no emotions found, add a default one
    if (result.toneAnalysis.emotionalState.length === 0) {
      result.toneAnalysis.emotionalState.push({ emotion: "mixed", intensity: 0.5 });
    }
    
    // Extract participant tones
    const participantTonesSection = rawContent.match(/participantTones["'\s:]+\{([^}]+)\}/)?.[1];
    if (participantTonesSection) {
      // Look for me's tone
      const meToneMatch = participantTonesSection.match(new RegExp(`${me}["'\\s:]+([^"',}]+)`));
      if (meToneMatch && meToneMatch[1]) {
        result.toneAnalysis.participantTones[me] = meToneMatch[1].trim();
      } else {
        result.toneAnalysis.participantTones[me] = "Unclear";
      }
      
      // Look for them's tone
      const themToneMatch = participantTonesSection.match(new RegExp(`${them}["'\\s:]+([^"',}]+)`));
      if (themToneMatch && themToneMatch[1]) {
        result.toneAnalysis.participantTones[them] = themToneMatch[1].trim();
      } else {
        result.toneAnalysis.participantTones[them] = "Unclear";
      }
    } else {
      // Default participant tones if not found
      result.toneAnalysis.participantTones[me] = "Not analyzed";
      result.toneAnalysis.participantTones[them] = "Not analyzed";
    }
    
    // Extract health score
    const scoreMatch = rawContent.match(/score["'\s:]+([0-9]+)/);
    if (scoreMatch && scoreMatch[1]) {
      const score = parseInt(scoreMatch[1]);
      result.healthScore.score = score;
      
      // Determine label and color based on score
      if (score < 30) {
        result.healthScore.label = "Conflict";
        result.healthScore.color = "red";
      } else if (score < 50) {
        result.healthScore.label = "Tension";
        result.healthScore.color = "yellow";
      } else if (score < 70) {
        result.healthScore.label = "Stable";
        result.healthScore.color = "light-green";
      } else {
        result.healthScore.label = "Healthy";
        result.healthScore.color = "green";
      }
    }
    
    // Extract communication patterns - using a non-s flag regex for compatibility
    const patternsMatch = rawContent.match(/patterns["'\s:]+\[([\s\S]*?)\]/);
    if (patternsMatch && patternsMatch[1]) {
      // Split by commas and clean up each pattern
      const patternList = patternsMatch[1]
        .split(/,/)
        .map(p => {
          // Remove quotes and extra whitespace
          return p.replace(/["']/g, '').trim();
        })
        .filter(p => p.length > 0);
      
      if (patternList.length > 0) {
        result.communication.patterns = patternList;
      }
    }
    
    // If no patterns found, add a default one
    if (result.communication.patterns.length === 0) {
      result.communication.patterns = ["Analysis incomplete - communication patterns unclear"];
    }
    
    return result;
  } catch (error) {
    console.error("Error in raw extraction fallback:", error);
    return {
      toneAnalysis: {
        overallTone: "Analysis error - please try again",
        emotionalState: [{ emotion: "unknown", intensity: 0.5 }],
        participantTones: { [me]: "unavailable", [them]: "unavailable" }
      },
      communication: {
        patterns: ["Analysis failed - please try again"]
      },
      healthScore: {
        score: 50,
        label: "Analysis Error",
        color: "yellow"
      }
    };
  }
}

export async function analyzeChatConversation(conversation: string, me: string, them: string, tier: string = 'free'): Promise<ChatAnalysisResponse> {
  try {
    console.log('Attempting to use Anthropic for chat analysis');
    
    // Create a custom enhanced prompt with improved communication pattern analysis
    let enhancedPrompt = '';
    
    if (tier === 'pro' || tier === 'instant') {
      enhancedPrompt = `Perform a comprehensive professional-level analysis of this conversation between ${me} and ${them}.
      Return a JSON object with the following structure:
      {
        "toneAnalysis": {
          "overallTone": "detailed description of the conversation's overall tone",
          "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
          "participantTones": {"participant name": "comprehensive tone description"}
        },
        "redFlags": [{"type": "string", "description": "detailed description", "severity": number between 1-5}],
        "communication": {
          "patterns": ["specific and varied interaction patterns with behavioral pattern detection"],
          "dynamics": ["detailed analysis of conversation flow, dominance patterns, and power dynamics"],
          "suggestions": ["specific tailored professional suggestions for improvement"]
        },
        "healthScore": {
          "score": number between 0-100,
          "label": "Troubled/Needs Work/Good/Excellent",
          "color": "red/yellow/light-green/green"
        },
        "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "deep interpretation including manipulation score if relevant", "improvement": "professional suggestion for improvement"}],
        "highTensionFactors": ["detailed reasons for tension with historical pattern recognition"],
        "participantConflictScores": {
          "participant name": {
            "score": number between 0-100,
            "label": "detailed description of communication style",
            "isEscalating": boolean
          }
        },
        "tensionContributions": {
          "participant name": ["specific actions/phrases that contribute to tension"]
        },
        "tensionMeaning": "brief explanation of what tension means for the relationship (50 words max)"
      }
      
      IMPORTANT GUIDELINES:
      1. Keep each field CONCISE - especially participantTones and tensionMeaning should be short
      2. Avoid lengthy explanations or analysis that exceeds 100 words in any field
      3. Keep your output format strictly compatible with JSON (no trailing commas, proper quotes)
      4. For tensionMeaning, limit to 50 words max
      
      Include ADVANCED FEATURES such as:
      - Conversation dynamics with behavioral pattern detection
      - Evasion identification and avoidance detection
      - Message dominance analysis (who controls the conversation)
      - Power dynamics analysis
      - Historical pattern recognition (recurring themes)
      - Deep red flags analysis with timeline implications
      
      Here's the conversation:
      ${conversation}`;
    } else if (tier === 'personal') {
      enhancedPrompt = `Analyze this conversation between ${me} and ${them} with a personal-level depth. 
      Return a JSON object with the following structure:
      {
        "toneAnalysis": {
          "overallTone": "detailed description of the conversation's overall tone",
          "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
          "participantTones": {"participant name": "personalized tone description"}
        },
        "redFlags": [{"type": "string", "description": "clear description", "severity": number between 1-5}],
        "communication": {
          "patterns": ["specific communication patterns observed"],
          "dynamics": ["analysis of basic relationship dynamics"],
          "suggestions": ["personalized suggestions for improvement"]
        },
        "healthScore": {
          "score": number between 0-100,
          "label": "Troubled/Needs Work/Good/Excellent",
          "color": "red/yellow/light-green/green"
        },
        "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "interpretation with basic manipulation score", "improvement": "suggestion for how to reword to be more constructive"}],
        "highTensionFactors": ["clear reasons for tension"],
        "participantConflictScores": {
          "participant name": {
            "score": number between 0-100,
            "label": "communication style description",
            "isEscalating": boolean
          }
        },
        "tensionContributions": {
          "participant name": ["specific actions/phrases that contribute to tension"]
        },
        "tensionMeaning": "explanation of what the tension means for the relationship"
      }
      
      Include PERSONAL TIER FEATURES such as:
      - Advanced emotional tone analysis
      - Individual contributions to tension
      - Clear communication styles breakdown
      - Accountability indicators
      - Emotion tracking per participant
      
      Here's the conversation:
      ${conversation}`;
    } else {
      enhancedPrompt = `Provide a basic analysis of this conversation between ${me} and ${them}. 
      Return a JSON object with the following structure:
      {
        "toneAnalysis": {
          "overallTone": "brief description of the conversation's overall tone",
          "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
          "participantTones": {"participant name": "brief tone description"}
        },
        "communication": {
          "patterns": ["basic interaction patterns observed"],
          "suggestions": ["simple suggestions for improvement"]
        },
        "healthScore": {
          "score": number between 0-100,
          "label": "Troubled/Needs Work/Good/Excellent",
          "color": "red/yellow/light-green/green"
        },
        "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "brief interpretation", "improvement": "simple suggestion"}]
      }
      
      ONLY INCLUDE BASIC FREE TIER FEATURES:
      - Overall emotional tone summary
      - Simple participant analysis
      - Conversation health meter
      - Brief highlight quotes
      - Basic communication insights
      
      Here's the conversation:
      ${conversation}`;
    }
    
    // Make the API call with enhanced error handling
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2000,
      temperature: 0.1, // Lower temperature for more consistent responses
      system: `You are a communication expert who analyzes tone, patterns, and dynamics in conversations.
      
      IMPORTANT: You are currently operating at the ${tier.toUpperCase()} tier level. 
      ${tier === 'free' ? 'Provide basic analysis with fundamental insights only.' : 
      tier === 'personal' ? 'Provide moderate-depth analysis with personalized insights.' : 
      'Provide comprehensive professional-level analysis with advanced insights.'}
      
      CRITICAL OUTPUT FORMAT REQUIREMENTS:
      1. Respond ONLY with valid JSON
      2. Keep all text fields concise - max 100 words per field
      3. ALWAYS wrap your output in \`\`\`json and \`\`\` code block markers
      4. Every string must be properly escaped - use \\" for quotes inside strings
      5. All property names must be in double quotes
      6. Never use trailing commas
      7. Keep nested objects properly balanced with matching braces {}
      8. All text values must be in double quotes, not single quotes
      9. Never use special characters or line breaks inside property names
      10. Never use line returns inside string values - escape them with \\n
      11. Before submitting your response, check that it's valid JSON
      
      When analyzing conversations:
      1. Identify different chat formats (WhatsApp, iMessage, Facebook, etc.) and adapt your analysis accordingly
      2. Look for timestamp patterns to properly segment messages between participants
      3. Focus on emotional tone and interaction patterns rather than repetitive descriptions
      4. When analyzing uploaded chat logs, be aware they may contain formatting artifacts or timestamps
      5. For each participant, identify their unique communication styles, varied emotional states, and notable quotes
      6. Provide specific and actionable recommendations for healthier communication
      7. When describing communication patterns, be specific and varied - avoid repetitive descriptions
      8. The level of detail in your analysis should match the ${tier.toUpperCase()} tier requirements
      
      This is a technical integration. Strict JSON formatting is critical.`,
      messages: [{ role: "user", content: enhancedPrompt }],
    });
    
    // Safely get content text using our helper function
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response for chat analysis');
    
    // Parse the JSON response with markdown code block handling
    try {
      return parseAnthropicJson(content);
    } catch (error) {
      console.error('JSON parsing failed in chat analysis, attempting direct extraction fallback', error);
      
      // Use the specialized raw extraction function that works directly on the raw text
      return extractRawChatAnalysis(content, me, them);
    }
  } catch (error: any) {
    // Log the specific error for debugging
    console.error('Error using Anthropic for chat analysis:', error);
    
    if (error.response) {
      console.error('Response status:', error.status);
      console.error('Response type:', error.type);
      console.error('Error message:', error.message);
    }
    
    // Throw error with support information instead of using fallback
    throw new Error('We apologize, but we are unable to process your request at this time. Please contact support at DramaLlamaConsultancy@gmail.com');
  }
}

export async function analyzeMessage(message: string, author: 'me' | 'them', tier: string = 'free') {
  try {
    console.log('Attempting to use Anthropic for message analysis');
    
    // Select the prompt based on the tier
    const promptTemplate = tier === 'pro' ? prompts.message.pro : 
                          tier === 'personal' ? prompts.message.personal : 
                          prompts.message.free;
    
    // Replace placeholder
    const prompt = promptTemplate
      .replace('{message}', message)
      .replace('{author}', author);
    
    // Make the API call with enhanced error handling
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 800,
      temperature: 0.1,
      system: `You are a communication expert who analyzes messages to determine tone, intent, and subtext.
      
      IMPORTANT: You are currently operating at the ${tier.toUpperCase()} tier level. 
      ${tier === 'free' ? 'Provide basic analysis with fundamental insights only.' : 
      tier === 'personal' ? 'Provide moderate-depth analysis with personalized insights.' : 
      'Provide comprehensive professional-level analysis with advanced insights.'}
      
      CRITICAL OUTPUT FORMAT REQUIREMENTS:
      1. Respond ONLY with valid JSON
      2. Keep all text fields concise - max 100 words per field
      3. ALWAYS wrap your output in \`\`\`json and \`\`\` code block markers
      4. Every string must be properly escaped - use \\" for quotes inside strings
      5. All property names must be in double quotes
      6. Never use trailing commas
      7. Keep nested objects properly balanced with matching braces {}
      8. All text values must be in double quotes, not single quotes
      9. Never use special characters or line breaks inside property names
      10. Never use line returns inside string values - escape them with \\n
      11. Before submitting your response, check that it's valid JSON`,
      messages: [{ role: "user", content: prompt }],
    });
    
    // Safely get content text
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response for message analysis');
    
    // Parse the JSON response with markdown code block handling
    try {
      return parseAnthropicJson(content);
    } catch (error) {
      console.error('JSON parsing failed in message analysis, attempting fallback', error);
      
      // Fallback to a simplified response that maintains basic functionality
      return {
        tone: "We couldn't complete the analysis due to a technical issue.",
        intent: ["Please try again later or contact support."],
        suggestedReply: "We apologize for the inconvenience."
      };
    }
  } catch (error: any) {
    // Log the specific error for debugging
    console.error('Error using Anthropic for message analysis:', error);
    
    if (error.response) {
      console.error('Response status:', error.status);
      console.error('Response type:', error.type);
      console.error('Error message:', error.message);
    }
    
    // Throw error with support information instead of using fallback
    throw new Error('We apologize, but we are unable to process your request at this time. Please contact support at DramaLlamaConsultancy@gmail.com');
  }
}

export async function deEscalateMessage(message: string, tier: string = 'free') {
  try {
    console.log('Attempting to use Anthropic for de-escalate mode analysis');
    
    let prompt = '';
    
    if (tier === 'pro' || tier === 'instant') {
      // Enhanced de-escalation with professional-level guidance
      prompt = `Provide a comprehensive professional-level transformation of this emotional message into a more effective communication.
      Return a JSON object with the following structure:
      {
        "original": "the original message",
        "rewritten": "professionally rewritten message that's strategic, constructive, and effective",
        "explanation": "detailed explanation of the communication issues and the psychological reasoning behind the changes",
        "additionalContextInsights": "analysis of potential underlying issues that may need addressing",
        "longTermStrategy": "suggestions for addressing the deeper pattern beyond this single message"
      }
      
      Focus on creating a message that maintains the author's core concerns while significantly improving tone, delivery, and likelihood of a positive outcome.
      
      Here's the message:
      ${message}`;
    } else if (tier === 'personal') {
      // Mid-level de-escalation with personalized guidance
      prompt = `Transform this emotional message into a more effective communication with personalized guidance.
      Return a JSON object with the following structure:
      {
        "original": "the original message",
        "rewritten": "thoughtfully rewritten message that's calmer and more constructive",
        "explanation": "clear explanation of the communication issues and improvements made",
        "alternativeOptions": "1-2 alternative approaches that could also work"
      }
      
      Focus on creating a message that addresses the author's concerns while improving tone and constructiveness.
      
      Here's the message:
      ${message}`;
    } else {
      // Basic de-escalation (free tier)
      prompt = prompts.deEscalate.free.replace('{message}', message);
    }
    
    // Make the API call with enhanced error handling
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 800,
      temperature: 0.1,
      system: `You are a communication expert who helps transform emotional messages into grounded, constructive ones that de-escalate conflict.
      
      IMPORTANT: You are currently operating at the ${tier.toUpperCase()} tier level. 
      ${tier === 'free' ? 'Provide basic message improvement with fundamental guidance only.' : 
      tier === 'personal' ? 'Provide moderate-depth message improvement with personalized options.' : 
      'Provide comprehensive professional-level message improvement with strategic insights and long-term guidance.'}
      
      CRITICAL OUTPUT FORMAT REQUIREMENTS:
      1. Respond ONLY with valid JSON
      2. Keep all text fields concise - max 100 words per field
      3. ALWAYS wrap your output in \`\`\`json and \`\`\` code block markers
      4. Every string must be properly escaped - use \\" for quotes inside strings
      5. All property names must be in double quotes
      6. Never use trailing commas
      7. Keep nested objects properly balanced with matching braces {}
      8. All text values must be in double quotes, not single quotes
      9. Never use special characters or line breaks inside property names
      10. Never use line returns inside string values - escape them with \\n
      11. Before submitting your response, check that it's valid JSON`,
      messages: [{ role: "user", content: prompt }],
    });
    
    // Safely get content text
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response for de-escalate mode');
    
    // Parse the JSON response with markdown code block handling
    try {
      return parseAnthropicJson(content);
    } catch (error) {
      console.error('JSON parsing failed in de-escalate mode, attempting fallback', error);
      
      // Fallback to a simplified response that maintains basic functionality
      return {
        original: message,
        rewritten: "We're sorry, we couldn't complete the rewriting of this message due to a technical issue. Please try again.",
        explanation: "There was an error processing your request. Please contact support if this issue persists."
      };
    }
  } catch (error: any) {
    // Log the specific error for debugging
    console.error('Error using Anthropic for de-escalate mode:', error);
    
    if (error.response) {
      console.error('Response status:', error.status);
      console.error('Response type:', error.type);
      console.error('Error message:', error.message);
    }
    
    // Throw error with support information instead of using fallback
    throw new Error('We apologize, but we are unable to process your request at this time. Please contact support at DramaLlamaConsultancy@gmail.com');
  }
}

export async function detectParticipants(conversation: string) {
  try {
    console.log('Attempting to use Anthropic for participant detection');
    
    // Prepare the prompt
    const prompt = prompts.detectNames.replace('{conversation}', conversation);
    
    // Make the API call with enhanced error handling
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 500,
      system: `You are a communication expert who identifies participants in conversations.
      
      When analyzing message logs from various platforms:
      1. Look for message patterns like "Name: message" or timestamp formats like "[time] Name:"
      2. For WhatsApp logs, extract names from patterns like "[MM/DD/YY, HH:MM:SS] Name:"
      3. For iMessage/SMS, look for patterns like "YYYY-MM-DD HH:MM:SS Name:"
      4. For Facebook Messenger, look for "Name at HH:MM MM" or "MM/DD/YYYY, HH:MM AM/PM - Name:"
      5. Always identify at most two primary participants, even if there are more names mentioned
      6. Return only the names, not titles or other text
      
      CRITICAL OUTPUT FORMAT:
      1. Return ONLY a JSON with exactly two keys: "me" and "them" 
      2. Format your response as a code block with \`\`\`json and \`\`\` markers
      3. Make sure your JSON is well-formed with proper quotes
      4. Do not add any text outside the JSON object
      5. Your response should look like:
      
      \`\`\`json
      {
        "me": "Jane",
        "them": "John"
      }
      \`\`\`
      
      Do not include any explanation or additional text.`,
      messages: [{ role: "user", content: prompt }],
    });
    
    // Safely get content text
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response for participant detection');
    
    try {
      // Parse the JSON response with markdown code block handling
      return parseAnthropicJson(content);
    } catch (error) {
      console.error('JSON parsing failed in participant detection, attempting fallback', error);
      
      try {
        // Try to directly extract the names using regex as a fallback
        const meMatch = content.match(/"me"\s*:\s*"([^"]*)"/);
        const themMatch = content.match(/"them"\s*:\s*"([^"]*)"/);
        
        if (meMatch && themMatch) {
          return {
            me: meMatch[1].trim(),
            them: themMatch[1].trim()
          };
        }
        
        // Simple name detection as last resort
        console.log('Performing simple name extraction from conversation');
        // Extract the first 500 characters to find common name patterns
        const excerpt = conversation.substring(0, 500);
        
        // Look for common patterns like "Name:" or "[timestamp] Name:"
        const namePatterns = excerpt.match(/(?:^|\n|\[)[^:[\]]*?([A-Z][a-z]+)(?::|:)/g);
        
        if (namePatterns && namePatterns.length >= 1) {
          const names = namePatterns
            .map(match => {
              // Extract just the name part
              const nameMatch = match.match(/([A-Z][a-z]+)(?::|:)/);
              return nameMatch ? nameMatch[1] : null;
            })
            .filter(Boolean)
            .filter((name, index, self) => self.indexOf(name) === index); // Unique names
          
          if (names.length >= 2) {
            return { me: names[0], them: names[1] };
          } else if (names.length === 1) {
            return { me: names[0], them: "Other Person" };
          }
        }
        
        // If no names found, provide generic names
        return { me: "User", them: "Contact" };
      } catch (fallbackError) {
        console.error('All name detection methods failed:', fallbackError);
        // Last resort default names
        return { me: "Me", them: "Them" };
      }
    }
  } catch (error: any) {
    // Log the specific error for debugging
    console.error('Error using Anthropic for participant detection:', error);
    
    if (error.response) {
      console.error('Response status:', error.status);
      console.error('Response type:', error.type);
      console.error('Error message:', error.message);
    }
    
    // Throw error with support information instead of using fallback
    throw new Error('We apologize, but we are unable to process your request at this time. Please contact support at DramaLlamaConsultancy@gmail.com');
  }
}

export async function processImageOcr(image: string): Promise<string> {
  try {
    // Anthropic Claude has multimodal capabilities
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all the text from this image. Return just the raw text."
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: image
              }
            }
          ]
        }
      ]
    });
    
    // Safely get content text
    return getTextFromContentBlock(response.content);
  } catch (error: any) {
    console.error('OCR Error:', error);
    throw new Error('We encountered an issue processing your image. Please contact support at DramaLlamaConsultancy@gmail.com');
  }
}

export async function getUserUsage(): Promise<{ used: number, limit: number, tier: string }> {
  // This is a placeholder. In a real app, we would query a database for the user's usage.
  return {
    used: 5,  // Number of analyses used
    limit: 10, // Monthly limit
    tier: 'free' // User's current tier
  };
}