import OpenAI from "openai";
import { TIER_LIMITS } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Prompts for different tiers and analysis types
const prompts = {
  chat: {
    free: `Analyze this conversation between {me} and {them}. Focus only on the overall emotional tone and basic patterns. Respond with JSON in this format:
    {
      "toneAnalysis": {
        "overallTone": "brief 2-3 sentence summary of conversation tone",
        "emotionalState": [
          { "emotion": "emotion name", "intensity": number from 1-10 }
        ]
      },
      "communication": {
        "patterns": ["1-2 basic observable patterns"]
      }
    }`,
    
    personal: `Analyze this conversation between {me} and {them}. Identify emotional tone, communication patterns, and potential red flags. Respond with JSON in this format:
    {
      "toneAnalysis": {
        "overallTone": "detailed analysis of conversation tone",
        "emotionalState": [
          { "emotion": "emotion name", "intensity": number from 1-10 }
        ]
      },
      "redFlags": [
        { "type": "type of flag", "description": "description", "severity": number from 1-10 }
      ],
      "communication": {
        "patterns": ["3-5 observable patterns"],
        "suggestions": ["2-3 communication improvement suggestions"]
      }
    }`,
    
    pro: `Perform a comprehensive analysis of this conversation between {me} and {them}. Identify emotional tone, detailed communication patterns, red flags, and calculate a Drama Score™. Respond with JSON in this format:
    {
      "toneAnalysis": {
        "overallTone": "comprehensive analysis of conversation dynamics",
        "emotionalState": [
          { "emotion": "emotion name", "intensity": number from 1-10 }
        ]
      },
      "redFlags": [
        { "type": "type of flag", "description": "description", "severity": number from 1-10 }
      ],
      "communication": {
        "patterns": ["4-6 detailed observable patterns"],
        "suggestions": ["3-5 personalized communication improvement suggestions"]
      },
      "dramaScore": number from 1-10 representing overall drama level
    }`
  },
  
  message: {
    free: `Analyze this single message: "{message}". It was written by {author}. Provide a brief tone analysis. Respond with JSON in this format:
    {
      "tone": "description of tone",
      "intent": ["possible intents"]
    }`,
    
    personal: `Analyze this single message: "{message}". It was written by {author}. Provide tone analysis, possible intents, and suggestion. Respond with JSON in this format:
    {
      "tone": "detailed description of tone",
      "intent": ["list of possible intents"],
      "suggestedReply": "suggested response"
    }`
  },
  
  vent: {
    free: `Rewrite this emotional message in a calmer, more effective way while preserving the core intent: "{message}". Respond with JSON in this format:
    {
      "original": "the original message",
      "rewritten": "calmer rewritten version",
      "explanation": "brief explanation of changes"
    }`
  },
  
  detectNames: `Identify the two main participants in this conversation. Respond with JSON in this format:
  {
    "me": "name of first person",
    "them": "name of second person"
  }`
};

// API function to analyze chat conversations
export async function analyzeChatConversation(conversation: string, me: string, them: string, tier: string = 'free') {
  const validTier = tier in TIER_LIMITS ? tier : 'free';
  let prompt = prompts.chat[validTier as keyof typeof prompts.chat] || prompts.chat.free;
  
  // Replace placeholders with actual names
  prompt = prompt.replace('{me}', me).replace('{them}', them);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in analyzing communication dynamics and emotional patterns in conversations."
        },
        {
          role: "user",
          content: `${prompt}\n\nHere is the conversation:\n\n${conversation}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error: any) {
    console.error('OpenAI API Error:', error?.message || error);
    throw new Error('Failed to analyze conversation');
  }
}

// API function to analyze a single message
export async function analyzeMessage(message: string, author: 'me' | 'them', tier: string = 'free') {
  const validTier = (tier in TIER_LIMITS && tier !== 'pro') ? tier : 'free';
  let prompt = prompts.message[validTier as keyof typeof prompts.message] || prompts.message.free;
  
  // Replace placeholders
  prompt = prompt.replace('{message}', message).replace('{author}', author);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in analyzing communication tone and intent."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error: any) {
    console.error('OpenAI API Error:', error?.message || error);
    throw new Error('Failed to analyze message');
  }
}

// API function to rewrite an emotional message in a calmer way
export async function ventMessage(message: string) {
  let prompt = prompts.vent.free;
  
  // Replace placeholder
  prompt = prompt.replace('{message}', message);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in de-escalating emotional communication while preserving intent."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error: any) {
    console.error('OpenAI API Error:', error?.message || error);
    throw new Error('Failed to rewrite message');
  }
}

// API function to detect participant names
export async function detectParticipants(conversation: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in analyzing conversations and identifying participants."
        },
        {
          role: "user",
          content: `${prompts.detectNames}\n\nHere is the conversation:\n\n${conversation}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      me: result.me || "Me",
      them: result.them || "Them"
    };
  } catch (error: any) {
    console.error('OpenAI API Error:', error?.message || error);
    throw new Error('Failed to detect participants');
  }
}
