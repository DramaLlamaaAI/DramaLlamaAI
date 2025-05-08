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
        "patterns": ["string describing patterns observed"],
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
    free: `Analyze this message sent by {author}. Focus on the tone and intent of the message.
    Return a JSON object with the following structure:
    {
      "tone": "string describing the tone",
      "intent": ["string array with likely intentions"]
    }
    
    Here's the message:
    {message}`,
    
    personal: `Analyze this message sent by {author}. Focus on the tone, intent, and suggest a possible reply.
    Return a JSON object with the following structure:
    {
      "tone": "string describing the tone",
      "intent": ["string array with likely intentions"],
      "suggestedReply": "string with a suggested response"
    }
    
    Here's the message:
    {message}`,
    
    pro: `Perform an in-depth analysis of this message sent by {author}. Examine tone, intent, and provide guidance.
    Return a JSON object with the following structure:
    {
      "tone": "string describing the tone",
      "intent": ["string array with likely intentions"],
      "suggestedReply": "string with a suggested response",
      "potentialResponse": "string describing how the other person might respond",
      "possibleReword": "string with a suggestion on how to reword the message if it could be improved"
    }
    
    Here's the message:
    {message}`
  },
  vent: {
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

export async function analyzeChatConversation(conversation: string, me: string, them: string, tier: string = 'free'): Promise<ChatAnalysisResponse> {
  try {
    console.log('Attempting to use Anthropic for chat analysis');
    
    // Create a custom enhanced prompt with improved communication pattern analysis
    let enhancedPrompt = '';
    
    if (tier === 'pro') {
      enhancedPrompt = `Perform a comprehensive analysis of this conversation between ${me} and ${them}.
      Return a JSON object with the following structure:
      {
        "toneAnalysis": {
          "overallTone": "string describing the conversation's overall tone",
          "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
          "participantTones": {"participant name": "tone description"}
        },
        "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5}],
        "communication": {
          "patterns": ["specific and varied interaction patterns - avoid repetitive descriptions like 'X attacks, Y defends'"],
          "dynamics": ["detailed analysis of how the conversation flow evolves and shifts"],
          "suggestions": ["specific tailored suggestions for improvement"]
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
      ${conversation}`;
    } else if (tier === 'personal') {
      enhancedPrompt = `Analyze this conversation between ${me} and ${them}. 
      Return a JSON object with the following structure:
      {
        "toneAnalysis": {
          "overallTone": "string describing the conversation's overall tone",
          "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
          "participantTones": {"participant name": "tone description"}
        },
        "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5}],
        "communication": {
          "patterns": ["specific and varied interaction patterns - avoid repetitive descriptions"],
          "dynamics": ["analysis of how the conversation flow changes and evolves"],
          "suggestions": ["specific tailored suggestions for improvement"]
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
      ${conversation}`;
    } else {
      enhancedPrompt = `Analyze this conversation between ${me} and ${them}. 
      Return a JSON object with the following structure:
      {
        "toneAnalysis": {
          "overallTone": "string describing the conversation's overall tone",
          "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
          "participantTones": {"participant name": "tone description"}
        },
        "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5}],
        "communication": {
          "patterns": ["specific and varied interaction patterns - avoid repetitive descriptions"],
          "dynamics": ["analysis of how the conversation flow changes and evolves"],
          "suggestions": ["specific tailored suggestions for improvement"]
        },
        "healthScore": {
          "score": number between 0-100,
          "label": "Troubled/Needs Work/Good/Excellent",
          "color": "red/yellow/light-green/green"
        },
        "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "interpretation", "improvement": "suggestion for how to reword this statement to be more constructive"}]
      }
      
      Here's the conversation:
      ${conversation}`;
    }
    
    // Make the API call with enhanced error handling
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2000,
      system: `You are a communication expert who analyzes tone, patterns, and dynamics in conversations. 
      
      When analyzing conversations:
      1. Identify different chat formats (WhatsApp, iMessage, Facebook, etc.) and adapt your analysis accordingly
      2. Look for timestamp patterns to properly segment messages between participants
      3. Focus on emotional tone and interaction patterns rather than repetitive descriptions
      4. When analyzing uploaded chat logs, be aware they may contain formatting artifacts or timestamps
      5. For each participant, identify their unique communication styles, varied emotional states, and notable quotes
      6. Provide specific and actionable recommendations for healthier communication
      7. When describing communication patterns, be specific and varied - avoid repetitive descriptions
      
      Always provide insightful, specific feedback that's helpful but honest.`,
      messages: [{ role: "user", content: enhancedPrompt }],
    });
    
    // Safely get content text using our helper function
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response for chat analysis');
    
    // Parse the JSON response with markdown code block handling
    return parseAnthropicJson(content);
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
      system: "You are a communication expert who analyzes messages to determine tone, intent, and subtext.",
      messages: [{ role: "user", content: prompt }],
    });
    
    // Safely get content text
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response for message analysis');
    
    // Parse the JSON response with markdown code block handling
    return parseAnthropicJson(content);
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

export async function ventMessage(message: string) {
  try {
    console.log('Attempting to use Anthropic for vent mode analysis');
    
    // Construct a proper prompt from our vent mode template
    const prompt = prompts.vent.free.replace('{message}', message);
    
    // Make the API call with enhanced error handling
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 800,
      system: "You are a communication expert who helps transform emotional messages into grounded, constructive ones that de-escalate conflict.",
      messages: [{ role: "user", content: prompt }],
    });
    
    // Safely get content text
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response for vent mode');
    
    // Parse the JSON response with markdown code block handling
    return parseAnthropicJson(content);
  } catch (error: any) {
    // Log the specific error for debugging
    console.error('Error using Anthropic for vent mode:', error);
    
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
      
      Return a simple JSON with just "me" and "them" keys.`,
      messages: [{ role: "user", content: prompt }],
    });
    
    // Safely get content text
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response for participant detection');
    
    // Parse the JSON response with markdown code block handling
    return parseAnthropicJson(content);
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