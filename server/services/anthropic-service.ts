import Anthropic from '@anthropic-ai/sdk';
import { TIER_LIMITS } from "@shared/schema";
import { getTextFromContentBlock, parseAnthropicJson } from "./anthropic-helpers";

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
  tensionContributions?: {
    [participant: string]: string[];
  };
  tensionMeaning?: string;
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
    free: `Analyze this conversation between {me} and {them}. You're providing a basic free tier analysis.
    Return a JSON object with ONLY the following structure (do not include any fields not listed here):
    {
      "toneAnalysis": {
        "overallTone": "string describing the conversation's overall emotional tone",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
        "participantTones": {"participant name": "brief tone description focusing on communication style"}
      },
      "communication": {
        "patterns": ["string describing basic patterns observed (limit to 2-3 key unique patterns, NO duplications)"]
      },
      "healthScore": {
        "score": number between 0-100,
        "label": "Conflict/Tense/Neutral/Healthy/Very Healthy (choose one)",
        "color": "red/yellow/light-green/green (choose one)"
      },
      "keyQuotes": [
        {"speaker": "name", "quote": "brief message text", "analysis": "brief interpretation"}
      ]
    }
    
    FREE TIER GUIDELINES:
    1. Keep analysis concise and focused only on the most essential elements
    2. Limit keyQuotes to only 1-2 most important quotes
    3. Do NOT include redFlags, dramaScore, tensionContributions, or other advanced analysis
    4. Do NOT include personalized suggestions - only objective observations
    5. Keep all analysis brief and high-level
    6. When describing participant tones:
       - Distinguish between healthy expressions of appreciation and unhealthy dependency
       - Expressions of gratitude, thankfulness, and appreciation are generally HEALTHY patterns
       - Do not characterize these positive expressions as "dependency" or "seeking validation" unless truly excessive
       - Describe communication styles rather than making psychological assessments
    
    Here's the conversation:
    {conversation}`,

    personal: `Analyze this conversation between {me} and {them}. 
    Return a JSON object with the following structure:
    {
      "toneAnalysis": {
        "overallTone": "string describing the conversation's overall tone",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
        "participantTones": {"participant name": "tone description focusing on communication style"}
      },
      "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5}],
      "communication": {
        "patterns": ["string describing unique patterns observed (NO duplicated text or phrases, each pattern should be a COMPLETE SENTENCE)"],
        "suggestions": ["string with suggestions for improvement"]
      },
      "dramaScore": number between 0-100,
      "healthScore": {
        "score": number between 0-100,
        "label": "Conflict/Tense/Neutral/Healthy/Very Healthy",
        "color": "red/yellow/light-green/green"
      },
      "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "interpretation"}],
      "highTensionFactors": ["string with reason"],
      "participantConflictScores": {
        "participant name": {
          "score": number between 0-100,
          "label": "string describing style",
          "isEscalating": boolean
        }
      },
      "tensionContributions": {
        "participant name": ["specific ways this person contributes to tension"]
      },
      "tensionMeaning": "explanation of what the tension means for the relationship"
    }
    
    IMPORTANT GUIDELINES:
    1. Only include the "tensionContributions" and "tensionMeaning" fields if there is moderate to high tension in the conversation. If the conversation is relatively tension-free, omit these fields entirely.
    2. When describing participant tones, distinguish between healthy expressions of appreciation and unhealthy dependency:
       - Expressions of gratitude, thankfulness, appreciation for others, and acknowledgment of support are generally HEALTHY communication patterns
       - Do not characterize these positive expressions as "dependency," "neediness," or "seeking validation" unless they are excessive or manipulative
       - Reserve terms like "dependency needs" or "relying on external validation" for genuinely problematic patterns, not for normal appreciation
    3. Focus on describing each participant's communication style rather than making psychological assessments
    
    Here's the conversation:
    {conversation}`,

    pro: `Perform a comprehensive analysis of this conversation between {me} and {them}.
    Return a JSON object with the following structure:
    {
      "toneAnalysis": {
        "overallTone": "string describing the conversation's overall tone",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
        "participantTones": {"participant name": "tone description focusing on communication style"}
      },
      "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5}],
      "communication": {
        "patterns": ["string describing unique patterns observed (NO duplicated text or phrases, each pattern should be a COMPLETE SENTENCE)"],
        "suggestions": ["string with suggestions for improvement"]
      },
      "dramaScore": number between 0-100,
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
      },
      "tensionContributions": {
        "participant name": ["specific ways this person contributes to tension"]
      },
      "tensionMeaning": "detailed explanation of what the tension means for the relationship dynamic and potential long-term implications"
    }
    
    IMPORTANT GUIDELINES:
    1. Only include the "tensionContributions" and "tensionMeaning" fields if there is moderate to high tension in the conversation. If the conversation is relatively tension-free, omit these fields entirely.
    2. When describing participant tones, distinguish between healthy expressions of appreciation and unhealthy dependency:
       - Expressions of gratitude, thankfulness, appreciation for others, and acknowledgment of support are generally HEALTHY communication patterns
       - Do not characterize these positive expressions as "dependency," "neediness," or "seeking validation" unless they are excessive or manipulative
       - Reserve terms like "dependency needs" or "relying on external validation" for genuinely problematic patterns, not for normal appreciation
    3. Focus on describing each participant's communication style rather than making psychological assessments
    
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

export async function analyzeChatConversation(conversation: string, me: string, them: string, tier: string = 'free'): Promise<ChatAnalysisResponse> {
  try {
    console.log('Attempting to use Anthropic for chat analysis');
    
    // Select the prompt based on the tier
    const promptTemplate = tier === 'pro' ? prompts.chat.pro : 
                          tier === 'personal' ? prompts.chat.personal : 
                          prompts.chat.free;
    
    // Replace placeholders
    const prompt = promptTemplate
      .replace('{conversation}', conversation)
      .replace('{me}', me)
      .replace('{them}', them);
    
    // Make the API call with enhanced error handling
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2000,
      system: "You are a communication expert who analyzes tone, patterns, and dynamics in conversations. Provide insightful, specific feedback that's helpful but honest.",
      messages: [{ role: "user", content: prompt }],
    });
    
    // Get the response content using helper function
    const content = getTextFromContentBlock(response.content);
    console.log('Successfully received Anthropic response for chat analysis');
    
    // Parse the JSON response
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse Anthropic response as JSON:', content);
      throw new Error('Invalid response format from Anthropic API. Please contact support at DramaLlamaConsultancy@gmail.com');
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
      system: "You are a communication expert who analyzes messages to determine tone, intent, and subtext.",
      messages: [{ role: "user", content: prompt }],
    });
    
    // Get the response content using helper function
    const content = getTextFromContentBlock(response.content);
    console.log('Successfully received Anthropic response for message analysis');
    
    // Parse the JSON response
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse Anthropic response as JSON:', content);
      throw new Error('Invalid response format from Anthropic API. Please contact support at DramaLlamaConsultancy@gmail.com');
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
    
    // Get the response content using helper function
    const content = getTextFromContentBlock(response.content);
    console.log('Successfully received Anthropic response for vent mode');
    
    // Parse the JSON response
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse Anthropic response as JSON:', content);
      throw new Error('Invalid response format from Anthropic API. Please contact support at DramaLlamaConsultancy@gmail.com');
    }
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
      system: "You are a communication expert who identifies participants in conversations.",
      messages: [{ role: "user", content: prompt }],
    });
    
    // Get the response content using helper function
    const content = getTextFromContentBlock(response.content);
    console.log('Successfully received Anthropic response for participant detection');
    
    // Parse the JSON response
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse Anthropic response as JSON:', content);
      throw new Error('Invalid response format from Anthropic API. Please contact support at DramaLlamaConsultancy@gmail.com');
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