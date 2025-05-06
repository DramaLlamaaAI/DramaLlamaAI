import OpenAI from "openai";
import { TIER_LIMITS } from "@shared/schema";

// Define response types
interface ChatAnalysisResponse {
  toneAnalysis: {
    overallTone: string;
    emotionalState: Array<{
      emotion: string;
      intensity: number;
    }>;
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
}

interface MessageAnalysisResponse {
  tone: string;
  intent: string[];
  suggestedReply?: string;
}

interface VentModeResponse {
  original: string;
  rewritten: string;
  explanation: string;
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// Check if API key exists and initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is not set');
}

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

// Function to generate fallback analysis when OpenAI is unavailable
function generateFallbackAnalysis(conversation: string, me: string, them: string, tier: string): ChatAnalysisResponse {
  // Basic sentiment analysis using regex patterns
  const positiveWords = ['happy', 'good', 'great', 'awesome', 'love', 'thanks', 'appreciate', 'hope', 'please', 'excited'];
  const negativeWords = ['sad', 'bad', 'terrible', 'hate', 'angry', 'upset', 'annoyed', 'disappointed', 'sorry', 'worried'];
  
  // Count instances of positive and negative words
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of positiveWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = conversation.match(regex);
    if (matches) positiveCount += matches.length;
  }
  
  for (const word of negativeWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = conversation.match(regex);
    if (matches) negativeCount += matches.length;
  }
  
  // Determine overall sentiment
  const totalWords = conversation.split(/\s+/).length;
  const sentiment = positiveCount > negativeCount ? 'Positive' : 
                    negativeCount > positiveCount ? 'Negative' : 'Neutral';
  
  // Calculate emotional intensity (1-10 scale)
  const emotionalIntensity = Math.min(10, Math.round((positiveCount + negativeCount) / (totalWords / 100)));
  
  // Generate a basic fallback response
  const fallbackAnalysis: ChatAnalysisResponse = {
    toneAnalysis: {
      overallTone: `This conversation appears to have a ${sentiment.toLowerCase()} tone overall. The exchange between ${me} and ${them} shows a moderate level of emotional expression.`,
      emotionalState: [
        { emotion: sentiment, intensity: emotionalIntensity },
        { emotion: positiveCount > negativeCount ? "Optimism" : "Concern", intensity: Math.max(1, Math.min(10, Math.abs(positiveCount - negativeCount))) }
      ]
    },
    communication: {
      patterns: [
        "Regular back-and-forth exchange of messages",
        positiveCount > negativeCount ? "Generally positive language" : "Some concerning language"
      ]
    }
  };
  
  // Add extra features based on tier
  if (tier === 'personal' || tier === 'pro') {
    fallbackAnalysis.redFlags = [];
    
    // Check for potential red flags
    if (negativeCount > positiveCount * 2) {
      fallbackAnalysis.redFlags.push({
        type: "Negative Tone",
        description: "Conversation contains significantly more negative than positive language",
        severity: Math.min(8, Math.round(negativeCount / positiveCount))
      });
    }
    
    if (conversation.match(/\bignore\b|\bavoid\b|\bwon't talk\b/gi)) {
      fallbackAnalysis.redFlags.push({
        type: "Avoidance",
        description: "Possible communication avoidance patterns detected",
        severity: 6
      });
    }
    
    fallbackAnalysis.communication.suggestions = [
      "Consider focusing more on clear, direct communication",
      "Try acknowledging each other's feelings more explicitly"
    ];
  }
  
  // Add Drama Score for Pro tier
  if (tier === 'pro') {
    fallbackAnalysis.dramaScore = Math.min(10, Math.round((negativeCount * 2 + positiveCount) / 10));
  }
  
  return fallbackAnalysis;
}

// API function to analyze chat conversations
export async function analyzeChatConversation(conversation: string, me: string, them: string, tier: string = 'free') {
  const validTier = tier in TIER_LIMITS ? tier : 'free';
  let prompt = prompts.chat[validTier as keyof typeof prompts.chat] || prompts.chat.free;
  
  // Replace placeholders with actual names
  prompt = prompt.replace('{me}', me).replace('{them}', them);
  
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      console.warn('OpenAI API key not configured, using fallback analysis');
      return generateFallbackAnalysis(conversation, me, them, validTier);
    }
    
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
    
    // Use fallback analysis when API fails
    console.log('Using fallback analysis due to API error');
    return generateFallbackAnalysis(conversation, me, them, validTier);
  }
}

// Function to generate fallback message analysis
function generateFallbackMessageAnalysis(message: string, author: 'me' | 'them', tier: string): MessageAnalysisResponse {
  // Basic sentiment analysis
  const positiveWords = ['happy', 'good', 'great', 'awesome', 'love', 'thanks', 'appreciate', 'hope', 'please', 'excited'];
  const negativeWords = ['sad', 'bad', 'terrible', 'hate', 'angry', 'upset', 'annoyed', 'disappointed', 'sorry', 'worried'];
  
  // Count instances
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of positiveWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = message.match(regex);
    if (matches) positiveCount += matches.length;
  }
  
  for (const word of negativeWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = message.match(regex);
    if (matches) negativeCount += matches.length;
  }
  
  // Determine tone
  let tone = 'Neutral';
  if (positiveCount > negativeCount) {
    tone = positiveCount > 2 ? 'Very positive' : 'Somewhat positive';
  } else if (negativeCount > positiveCount) {
    tone = negativeCount > 2 ? 'Very negative' : 'Somewhat negative';
  }
  
  // Determine intent
  const intents = [];
  
  if (message.includes('?')) {
    intents.push('Asking a question');
  }
  
  if (message.match(/\bcan you\b|\bcould you\b|\bwill you\b|\bwould you\b/i)) {
    intents.push('Making a request');
  }
  
  if (message.match(/\bi feel\b|\bi am\b|\bi'm\b/i)) {
    intents.push('Expressing personal feelings');
  }
  
  if (message.match(/\bthanks\b|\bthank you\b|\bappreciate\b/i)) {
    intents.push('Expressing gratitude');
  }
  
  if (message.match(/\bsorry\b|\bapologize\b/i)) {
    intents.push('Apologizing');
  }
  
  // Default intent if none found
  if (intents.length === 0) {
    intents.push('Sharing information');
  }
  
  // Basic result
  const result: MessageAnalysisResponse = {
    tone,
    intent: intents
  };
  
  // Add suggested reply for Personal tier
  if (tier === 'personal') {
    if (tone.includes('negative')) {
      result.suggestedReply = "I understand you might be feeling frustrated. Let's discuss this calmly.";
    } else if (tone.includes('positive')) {
      result.suggestedReply = "I'm glad to hear that! Thanks for sharing.";
    } else {
      result.suggestedReply = "I see what you mean. Let me think about that.";
    }
  }
  
  return result;
}

// Function to generate fallback vent mode response
function generateFallbackVentResponse(message: string): VentModeResponse {
  // Remove excessive punctuation
  let rewritten = message.replace(/!{2,}/g, '!').replace(/\?{2,}/g, '?');
  
  // Replace ALL CAPS with normal case (if there are 3+ consecutive capital words)
  if (message.match(/([A-Z]{2,}\s+){2,}/)) {
    rewritten = rewritten.replace(/([A-Z]{2,})/g, (match) => match.charAt(0) + match.slice(1).toLowerCase());
  }
  
  // Replace emotionally charged words
  const replacements = [
    { from: /\bhate\b/gi, to: 'dislike' },
    { from: /\bfurious\b/gi, to: 'upset' },
    { from: /\bterrible\b/gi, to: 'challenging' },
    { from: /\bstupid\b/gi, to: 'unhelpful' },
    { from: /\bawful\b/gi, to: 'difficult' },
    { from: /\bannoying\b/gi, to: 'frustrating' }
  ];
  
  for (const {from, to} of replacements) {
    rewritten = rewritten.replace(from, to);
  }
  
  return {
    original: message,
    rewritten: rewritten,
    explanation: "The rewritten message maintains your core point while using more constructive language. This approach can lead to more productive conversations."
  };
}

// API function to analyze a single message
export async function analyzeMessage(message: string, author: 'me' | 'them', tier: string = 'free') {
  const validTier = (tier in TIER_LIMITS && tier !== 'pro') ? tier : 'free';
  let prompt = prompts.message[validTier as keyof typeof prompts.message] || prompts.message.free;
  
  // Replace placeholders
  prompt = prompt.replace('{message}', message).replace('{author}', author);
  
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      console.warn('OpenAI API key not configured, using fallback message analysis');
      return generateFallbackMessageAnalysis(message, author, validTier);
    }
    
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
    // Use fallback when API fails
    console.log('Using fallback message analysis due to API error');
    return generateFallbackMessageAnalysis(message, author, validTier);
  }
}

// API function to rewrite an emotional message in a calmer way
export async function ventMessage(message: string) {
  let prompt = prompts.vent.free;
  
  // Replace placeholder
  prompt = prompt.replace('{message}', message);
  
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      console.warn('OpenAI API key not configured, using fallback vent response');
      return generateFallbackVentResponse(message);
    }
    
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
    // Use fallback when API fails
    console.log('Using fallback vent response due to API error');
    return generateFallbackVentResponse(message);
  }
}

// Fallback function to detect participant names using regex patterns
function detectParticipantsLocally(conversation: string): { me: string, them: string } {
  try {
    // Simple regex pattern to identify common chat format: "Name: Message"
    const namePattern = /^([A-Za-z]+):/gm;
    let match;
    const names: string[] = [];
    
    // Manually collect matches
    while ((match = namePattern.exec(conversation)) !== null) {
      names.push(match[1]);
    }
    
    // Get unique names
    const uniqueNames: string[] = [];
    for (const name of names) {
      if (!uniqueNames.includes(name)) {
        uniqueNames.push(name);
      }
    }
    
    if (uniqueNames.length >= 2) {
      return {
        me: uniqueNames[0],
        them: uniqueNames[1]
      };
    }
    
    // If we couldn't find patterns, look for common names in the text
    const commonNames = ['Alex', 'Jamie', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery'];
    const foundNames: string[] = [];
    
    for (const name of commonNames) {
      const regex = new RegExp(`\\b${name}\\b`, 'gi');
      if (conversation.match(regex)) {
        foundNames.push(name);
      }
    }
    
    if (foundNames.length >= 2) {
      return {
        me: foundNames[0],
        them: foundNames[1]
      };
    }
    
    // Default fallback
    return {
      me: "Me",
      them: "Them"
    };
  } catch (error) {
    console.error('Error in local name detection:', error);
    return {
      me: "Me",
      them: "Them"
    };
  }
}

// API function to detect participant names
export async function detectParticipants(conversation: string) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      console.warn('OpenAI API key not configured, using local name detection');
      return detectParticipantsLocally(conversation);
    }
    
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
    // Use local detection as fallback
    console.log('Using local name detection due to API error');
    return detectParticipantsLocally(conversation);
  }
}
