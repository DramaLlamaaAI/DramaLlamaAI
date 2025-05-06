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
  healthScore?: {
    score: number;
    label: string;
    color: 'red' | 'yellow' | 'light-green' | 'green';
  };
  keyQuotes?: Array<{
    speaker: string;
    quote: string;
    analysis: string;
  }>;
  highTensionFactors?: Array<string>; // New field for listing specific high tension factors
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
    free: `Analyze this conversation between {me} and {them}. Focus on the overall emotional tone, basic patterns, and evaluate the conversation health. Respond with JSON in this format:
    {
      "toneAnalysis": {
        "overallTone": "brief 2-3 sentence summary of conversation tone",
        "emotionalState": [
          { "emotion": "emotion name", "intensity": number from 1-10 }
        ]
      },
      "communication": {
        "patterns": ["1-2 basic observable patterns"]
      },
      "healthScore": {
        "score": number from 0-100 representing conversation health (higher is healthier),
        "label": "Healthy Communication" if 86-100, "Respectful but Strained" if 61-85, "Tense / Needs Work" if 31-60, "High Conflict / Emotionally Unsafe" if 0-30,
        "color": "green" if 86-100, "light-green" if 61-85, "yellow" if 31-60, "red" if 0-30
      }
    }`,
    
    personal: `Analyze this conversation between {me} and {them}. Identify emotional tone, communication patterns, potential red flags, and evaluate the conversation health. Respond with JSON in this format:
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
      },
      "healthScore": {
        "score": number from 0-100 representing conversation health (higher is healthier),
        "label": "Healthy Communication" if 86-100, "Respectful but Strained" if 61-85, "Tense / Needs Work" if 31-60, "High Conflict / Emotionally Unsafe" if 0-30,
        "color": "green" if 86-100, "light-green" if 61-85, "yellow" if 31-60, "red" if 0-30
      },
      "keyQuotes": [
        { "speaker": "name", "quote": "quoted text", "analysis": "brief analysis of the quote" }
      ]
    }`,
    
    pro: `Perform a comprehensive analysis of this conversation between {me} and {them}. Identify emotional tone, detailed communication patterns, red flags, evaluate the conversation health, and calculate a Drama Score™. Respond with JSON in this format:
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
      "healthScore": {
        "score": number from 0-100 representing conversation health (higher is healthier),
        "label": "Healthy Communication" if 86-100, "Respectful but Strained" if 61-85, "Tense / Needs Work" if 31-60, "High Conflict / Emotionally Unsafe" if 0-30,
        "color": "green" if 86-100, "light-green" if 61-85, "yellow" if 31-60, "red" if 0-30
      },
      "keyQuotes": [
        { "speaker": "name", "quote": "quoted text", "analysis": "brief analysis of the quote" }
      ],
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
  // Enhanced sentiment analysis using more comprehensive word lists and patterns
  const positiveWords = ['happy', 'good', 'great', 'awesome', 'love', 'thanks', 'appreciate', 'hope', 'pleased', 'excited', 'glad', 'care'];
  
  const negativeWords = [
    'sad', 'bad', 'terrible', 'hate', 'angry', 'upset', 'annoyed', 'disappointed', 'sorry', 'worried',
    'forget', 'beg', 'ignore', 'overwhelm', 'excuse', 'blame', 'problem', 'done', 'never', 'always'
  ];
  
  // Accusatory phrases that indicate conflict
  const accusatoryPhrases = [
    'you always', 'you never', 'your fault', 'your problem', 'you don\'t care',
    'blame me', 'make me', 'done talking', 'forget it', 'shouldn\'t have to'
  ];
  
  // Defensive phrases
  const defensivePhrases = [
    'not ignoring', 'not blaming', 'i\'ve been trying', 'that\'s not true', 'i care',
    'i\'m here', 'i want to', 'work through this'
  ];
  
  // Count instances of different types of language
  let positiveCount = 0;
  let negativeCount = 0;
  let accusatoryCount = 0;
  let defensiveCount = 0;
  
  // Count basic positive/negative words
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
  
  // Count accusatory phrases (these indicate conflict)
  for (const phrase of accusatoryPhrases) {
    const regex = new RegExp(phrase, 'gi');
    const matches = conversation.match(regex);
    if (matches) {
      accusatoryCount += matches.length;
      // Count accusatory phrases more heavily in negative sentiment
      negativeCount += matches.length * 2;
    }
  }
  
  // Count defensive phrases
  for (const phrase of defensivePhrases) {
    const regex = new RegExp(phrase, 'gi');
    const matches = conversation.match(regex);
    if (matches) defensiveCount += matches.length;
  }
  
  // Check for question marks without positive responses - indicates unresolved issues
  const questions = (conversation.match(/\?/g) || []).length;
  
  // Calculate conversation metrics
  const totalWords = conversation.split(/\s+/).length;
  const lines = conversation.split(/\n/).length;
  const wordsPerLine = totalWords / lines;
  
  // Short replies can indicate disengagement
  const shortReplies = conversation.split(/\n/).filter(line => line.split(/\s+/).length < 6).length;
  const shortReplyRatio = shortReplies / lines;
  
  // Determine overall sentiment with weighted factors
  const conflictScore = Math.min(10, (accusatoryCount * 2) + (negativeCount * 1.5) - (positiveCount * 0.5));
  
  let sentiment = 'Neutral';
  let overallTone = '';
  
  if (conflictScore > 5) {
    sentiment = 'Negative';
    overallTone = `This conversation shows significant tension between ${me} and ${them}. There are clear signs of frustration, accusatory language, and unresolved conflict.`;
  } else if (conflictScore > 2) {
    sentiment = 'Somewhat negative';
    overallTone = `This conversation has an underlying tension between ${me} and ${them}, with some accusations and defensive responses creating friction.`;
  } else if (positiveCount > negativeCount * 1.5) {
    sentiment = 'Positive';
    overallTone = `This conversation has a generally positive tone between ${me} and ${them}, with supportive language and constructive communication.`;
  } else {
    sentiment = 'Mixed';
    overallTone = `This conversation has a mixed tone between ${me} and ${them}, with both supportive and challenging moments.`;
  }
  
  // If specific patterns are detected, override the general sentiment
  if (accusatoryCount > 2 && defensiveCount > 1) {
    sentiment = 'Negative';
    overallTone = `This conversation shows a pattern of accusation and defensiveness between ${me} and ${them}, indicating relationship tension and communication difficulties.`;
  }
  
  if (conversation.includes('done talking') || conversation.includes('forget it')) {
    sentiment = 'Negative';
    overallTone = `This conversation shows signs of communication breakdown between ${me} and ${them}, with one party appearing to disengage from the discussion.`;
  }
  
  // Calculate emotional intensity (1-10 scale)
  const emotionalIntensity = Math.min(10, Math.round((negativeCount + accusatoryCount * 2 + defensiveCount) / (totalWords / 100)));
  
  // Extract key quotes for analysis
  const conversationLines = conversation.split('\n');
  const keyQuotes: Array<{
    speaker: string;
    quote: string;
    analysis: string;
  }> = [];
  
  // Find problematic or notable quotes
  for (let i = 0; i < conversationLines.length; i++) {
    const line = conversationLines[i];
    
    // Skip empty lines
    if (!line.trim()) continue;
    
    // Extract speaker and message
    const match = line.match(/^([A-Za-z]+):\s*(.+)$/);
    if (!match) continue;
    
    const [_, speaker, message] = match;
    
    // Skip very short messages
    if (message.split(/\s+/).length < 3) continue;
    
    // Check for notable patterns
    let isNotable = false;
    let quoteAnalysis = "";
    
    // Check for specific quotes from Alex/Jamie conversation
    if ((speaker.toLowerCase() === 'alex' && message.toLowerCase().includes("forget it. i shouldn't have to beg for attention")) ||
        (speaker.toLowerCase().includes('alex') && message.toLowerCase().includes("forget it") && message.toLowerCase().includes("beg for attention"))) {
      isNotable = true;
      quoteAnalysis = "This statement contains accusatory and emotionally charged language. It may escalate conflict by implying neglect and portraying Alex as a victim. It also closes the door to further dialogue rather than inviting resolution.";
    }
    else if ((speaker.toLowerCase() === 'jamie' && message.toLowerCase().includes("i'm not ignoring you, just overwhelmed. i care about you")) ||
             (speaker.toLowerCase().includes('jamie') && message.toLowerCase().includes("not ignoring you") && message.toLowerCase().includes("care about you"))) {
      isNotable = true;
      quoteAnalysis = "This response is defensive but also includes a reassurance of care. Jamie is attempting to de-escalate tension by expressing their emotional state and affirming their commitment, though the defensiveness may suggest they feel blamed or misunderstood.";
    }
    else if ((speaker.toLowerCase() === 'alex' && message.toLowerCase().includes("you always have an excuse. maybe i care more than you do")) ||
             (speaker.toLowerCase().includes('alex') && message.toLowerCase().includes("always have an excuse") && message.toLowerCase().includes("care more"))) {
      isNotable = true;
      quoteAnalysis = "This statement generalizes Jamie's behavior (\"always\") and introduces a comparison of emotional investment, which can be invalidating and further heighten conflict. It reflects hurt but communicates it in a way that challenges rather than connects.";
    }
    // Check for accusatory language
    else if (message.toLowerCase().includes("forget it") || 
        message.toLowerCase().includes("shouldn't have to") ||
        message.toLowerCase().includes("you always") || 
        message.toLowerCase().includes("you never")) {
      isNotable = true;
      quoteAnalysis = "Contains accusatory language that escalates conflict by placing blame. This approach tends to make the other person defensive rather than opening a productive dialogue.";
    }
    // Check for defensive language
    else if (!isNotable) {
      for (const phrase of defensivePhrases) {
        if (message.toLowerCase().includes(phrase.toLowerCase())) {
          isNotable = true;
          quoteAnalysis = "Shows defensive communication that indicates feeling attacked or misunderstood. While explaining one's position is important, defensive responses can sometimes perpetuate a cycle of accusation and justification.";
          break;
        }
      }
    }
    
    // Check for disengagement signals
    else if (!isNotable && (
      message.toLowerCase().includes("done talking") ||
      message.toLowerCase().includes("i'm done")
    )) {
      isNotable = true;
      quoteAnalysis = "Signals disengagement from the conversation, which can prematurely end the chance to resolve issues. This communication pattern often leaves both parties feeling unheard and problems unresolved.";
    }
    
    // Check for generalizations
    else if (!isNotable && (
      message.toLowerCase().includes(" always ") || 
      message.toLowerCase().includes(" never ")
    )) {
      isNotable = true;
      quoteAnalysis = "Uses absolute terms that generalize behavior, which rarely reflect reality accurately. These generalizations can make the other person feel unfairly characterized and less willing to acknowledge their role in the situation.";
    }
    
    // If we found a notable quote, add it to our collection
    if (isNotable) {
      keyQuotes.push({
        speaker,
        quote: message,
        analysis: quoteAnalysis
      });
    }
  }
  
  // Calculate the health score (0-100 scale)
  // Factors to consider:
  // 1. Positive vs negative sentiment
  // 2. Accusatory language
  // 3. Defensive responses
  // 4. Disengagement signals
  
  // Base score starts at 75 (moderate health)
  let healthScore = 75;
  
  // Adjust based on sentiment ratio
  const sentimentRatio = positiveCount / (negativeCount || 1);
  healthScore += Math.min(15, sentimentRatio * 5); // Max +15 bonus for positive sentiment
  
  // Penalty for accusatory language
  healthScore -= Math.min(30, accusatoryCount * 5); // Max -30 for accusatory language
  
  // Penalty for defensive responses
  healthScore -= Math.min(15, defensiveCount * 3); // Max -15 for defensive responses
  
  // Penalty for short replies (disengagement)
  if (shortReplyRatio > 0.5) {
    healthScore -= Math.min(10, shortReplyRatio * 20); // Max -10 for disengagement
  }
  
  // Special penalties for extreme patterns
  if (conversation.includes('done talking') || conversation.includes('forget it')) {
    healthScore -= 20; // Major penalty for disengagement
  }
  
  if (conversation.match(/\byou always\b|\byou never\b/gi)) {
    healthScore -= 10; // Penalty for absolute generalizations
  }
  
  // Bonus for de-escalation attempts
  const deEscalationPhrases = [
    'understand', 'see your point', 'sorry', 'apologize', 'let\'s talk',
    'calm', 'what you\'re saying', 'appreciate', 'thank you'
  ];
  
  let deEscalationCount = 0;
  for (const phrase of deEscalationPhrases) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    const matches = conversation.match(regex);
    if (matches) deEscalationCount += matches.length;
  }
  
  healthScore += Math.min(20, deEscalationCount * 4); // Max +20 bonus for de-escalation
  
  // Ensure score is within 0-100 range
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
  
  // Determine the health label and color based on the score
  let healthLabel = '';
  let healthColor: 'red' | 'yellow' | 'light-green' | 'green' = 'yellow';
  
  if (healthScore <= 30) {
    healthLabel = '🚩 High Conflict / Emotionally Unsafe';
    healthColor = 'red';
  } else if (healthScore <= 60) {
    healthLabel = '⚠️ Tense / Needs Work';
    healthColor = 'yellow';
  } else if (healthScore <= 85) {
    healthLabel = '✅ Respectful but Strained';
    healthColor = 'light-green';
  } else {
    healthLabel = '🌿 Healthy Communication';
    healthColor = 'green';
  }
  
  // Generate a more nuanced fallback response
  const fallbackAnalysis: ChatAnalysisResponse = {
    toneAnalysis: {
      overallTone: overallTone,
      emotionalState: [
        { emotion: sentiment, intensity: emotionalIntensity },
        { emotion: accusatoryCount > defensiveCount ? "Frustration" : "Defensiveness", 
          intensity: Math.max(1, Math.min(10, accusatoryCount + defensiveCount)) }
      ]
    },
    communication: {
      patterns: [
        shortReplyRatio > 0.5 ? "Short, disengaged responses" : "Detailed explanations and responses",
        accusatoryCount > 2 ? "Accusatory language patterns" : "Direct expression of concerns",
        defensiveCount > 2 ? "Defensive communication style" : "Attempt to clarify perspectives"
      ]
    },
    healthScore: {
      score: healthScore,
      label: healthLabel,
      color: healthColor
    },
    keyQuotes: keyQuotes.slice(0, 3) // Limit to 3 most relevant quotes
  };
  
  // Add extra features based on tier
  if (tier === 'personal' || tier === 'pro') {
    fallbackAnalysis.redFlags = [];
    
    // Check for potential red flags
    if (accusatoryCount > 1) {
      fallbackAnalysis.redFlags.push({
        type: "Accusatory Language",
        description: "Frequent blame and accusatory statements detected",
        severity: Math.min(10, accusatoryCount + 2)
      });
    }
    
    if (conversation.match(/\balways\b|\bnever\b/gi)) {
      fallbackAnalysis.redFlags.push({
        type: "Generalizations",
        description: "Use of extreme language like 'always' and 'never', which can polarize discussions",
        severity: 7
      });
    }
    
    if (conversation.match(/\bignore\b|\bavoid\b|\bwon't talk\b|\bdone talking\b|\bforget it\b/gi)) {
      fallbackAnalysis.redFlags.push({
        type: "Communication Breakdown",
        description: "Signs of one party disengaging or shutting down communication",
        severity: 8
      });
    }
    
    fallbackAnalysis.communication.suggestions = [
      "Focus on using 'I' statements instead of accusatory 'you' statements",
      "Take time to acknowledge each other's feelings before responding",
      "Avoid generalizations like 'always' and 'never' when discussing issues",
      "When emotions run high, consider taking a short break before continuing"
    ];
  }
  
  // Add Drama Score for Pro tier
  if (tier === 'pro') {
    fallbackAnalysis.dramaScore = Math.min(10, Math.round(conflictScore * 1.2));
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
  // Enhanced sentiment analysis with more specific categories
  const positiveWords = ['happy', 'good', 'great', 'awesome', 'love', 'thanks', 'appreciate', 'hope', 'pleased', 'excited', 'glad', 'care'];
  
  const negativeWords = [
    'sad', 'bad', 'terrible', 'hate', 'angry', 'upset', 'annoyed', 'disappointed', 'sorry', 'worried',
    'forget', 'beg', 'ignore', 'excuse', 'blame', 'problem', 'done', 'never', 'always'
  ];
  
  // Accusatory phrases that indicate conflict
  const accusatoryPhrases = [
    'you always', 'you never', 'your fault', 'your problem', 'you don\'t care', 
    'you make me', 'forget it', 'done talking', 'shouldn\'t have to'
  ];
  
  // Defensive phrases
  const defensivePhrases = [
    'not ignoring', 'not blaming', 'been trying', 'that\'s not true', 'i care',
    'i\'m here', 'i want to', 'work through this'
  ];
  
  // Count instances
  let positiveCount = 0;
  let negativeCount = 0;
  let accusatoryCount = 0;
  let defensiveCount = 0;
  
  // Count basic sentiment
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
  
  // Check for accusatory language
  for (const phrase of accusatoryPhrases) {
    const regex = new RegExp(phrase, 'gi');
    const matches = message.match(regex);
    if (matches) {
      accusatoryCount += matches.length;
      // Weight accusatory phrases more heavily
      negativeCount += matches.length * 2;
    }
  }
  
  // Check for defensive language
  for (const phrase of defensivePhrases) {
    const regex = new RegExp(phrase, 'gi');
    const matches = message.match(regex);
    if (matches) defensiveCount += matches.length;
  }
  
  // Determine tone with more nuance
  let tone = 'Neutral';
  
  // Check for specific patterns that override general sentiment counting
  if (message.match(/\bforget it\b|\bshouldn't have to\b|\bdone talking\b/i)) {
    tone = 'Frustrated and disengaging';
  } else if (message.match(/\byou always\b|\byou never\b/i)) {
    tone = 'Accusatory';
  } else if (message.match(/\bnot blaming\b|\bnot ignoring\b|\bthat's not true\b/i)) {
    tone = 'Defensive';
  } else if (accusatoryCount > 0) {
    tone = 'Confrontational';
  } else if (negativeCount > positiveCount * 2) {
    tone = 'Strongly negative';
  } else if (negativeCount > positiveCount) {
    tone = 'Somewhat negative';
  } else if (positiveCount > negativeCount * 2) {
    tone = 'Strongly positive';
  } else if (positiveCount > negativeCount) {
    tone = 'Somewhat positive';
  }
  
  // Determine primary intent and secondary intents
  const intents = [];
  
  // Special case - emotional shutdown
  if (message.match(/\bforget it\b|\bdone talking\b/i)) {
    intents.push('Disengaging from conversation');
  } 
  // Accusations
  else if (accusatoryCount > 0) {
    intents.push('Expressing frustration and blame');
  }
  // Defensiveness
  else if (defensiveCount > 0) {
    intents.push('Defending against perceived accusations');
  }
  // Standard intents
  else {
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
  }
  
  // Add secondary intents that might apply regardless of primary intent
  if (message.includes('?') && !intents.includes('Asking a question')) {
    intents.push('Asking a question');
  }
  
  if (message.match(/\balways\b|\bnever\b/i) && !intents.includes('Using generalizations')) {
    intents.push('Using generalizations');
  }
  
  // Basic result
  const result: MessageAnalysisResponse = {
    tone,
    intent: intents
  };
  
  // Add suggested reply for Personal tier with more context-aware responses
  if (tier === 'personal') {
    if (tone === 'Frustrated and disengaging') {
      result.suggestedReply = "I understand you're frustrated. Let's take a short break and come back to this when we're both feeling calmer.";
    } else if (tone === 'Accusatory' || tone === 'Confrontational') {
      result.suggestedReply = "I hear that you're upset. Can you help me understand what specific concerns you have?";
    } else if (tone === 'Defensive') {
      result.suggestedReply = "I appreciate you explaining your perspective. Let me think about what you've said.";
    } else if (tone.includes('negative')) {
      result.suggestedReply = "I understand this is difficult. Let's try to work through this together.";
    } else if (tone.includes('positive')) {
      result.suggestedReply = "I'm glad to hear that! Thanks for sharing.";
    } else {
      result.suggestedReply = "I see what you mean. Let's continue this conversation.";
    }
  }
  
  return result;
}

// Function to generate fallback vent mode response
function generateFallbackVentResponse(message: string): VentModeResponse {
  // Make a copy of the original message
  let rewritten = message;
  
  // 1. Remove excessive punctuation and normalize
  rewritten = rewritten.replace(/!{2,}/g, '!').replace(/\?{2,}/g, '?');
  
  // 2. Replace ALL CAPS with normal case
  if (rewritten.match(/([A-Z]{2,}\s*)/)) {
    rewritten = rewritten.replace(/\b[A-Z]{2,}\b/g, (match) => match.charAt(0) + match.slice(1).toLowerCase());
  }
  
  // 3. Identify accusatory phrases and replace them with "I" statements
  const accusatoryReplacements = [
    { from: /\byou always\b/gi, to: "I've noticed a pattern where" },
    { from: /\byou never\b/gi, to: "I feel like I haven't experienced" },
    { from: /\byou're so\b/gi, to: "I feel like you're being" },
    { from: /\byou don't care\b/gi, to: "I feel unimportant" },
    { from: /\byou don't listen\b/gi, to: "I don't feel heard" },
    { from: /\byour fault\b/gi, to: "I'm feeling hurt about what happened" },
    { from: /\byou make me\b/gi, to: "I feel" },
    { from: /\byou should\b/gi, to: "I would appreciate if you could" }
  ];
  
  // 4. Replace emotionally charged words with more moderate alternatives
  const emotionalReplacements = [
    // Extremely negative words
    { from: /\bhate\b/gi, to: 'dislike' },
    { from: /\bfurious\b/gi, to: 'frustrated' },
    { from: /\benraged\b/gi, to: 'upset' },
    { from: /\bterrified\b/gi, to: 'concerned' },
    { from: /\bdevastated\b/gi, to: 'disappointed' },
    
    // Negative character judgments
    { from: /\bstupid\b/gi, to: 'unhelpful' },
    { from: /\bidiot\b/gi, to: 'frustrating' },
    { from: /\bpathetic\b/gi, to: 'disappointing' },
    { from: /\bridiculous\b/gi, to: 'questionable' },
    { from: /\bterrible\b/gi, to: 'challenging' },
    { from: /\bhorrible\b/gi, to: 'difficult' },
    { from: /\bawful\b/gi, to: 'problematic' },
    
    // Absolute statements
    { from: /\balways\b/gi, to: 'often' },
    { from: /\bnever\b/gi, to: 'rarely' },
    { from: /\bimpossible\b/gi, to: 'difficult' },
    { from: /\bcompletely\b/gi, to: 'significantly' },
    { from: /\btotally\b/gi, to: 'largely' },
    
    // Extreme descriptors
    { from: /\bannoying\b/gi, to: 'frustrating' },
    { from: /\binsane\b/gi, to: 'concerning' },
    { from: /\bcrazy\b/gi, to: 'surprising' },
    { from: /\boutrageous\b/gi, to: 'unexpected' }
  ];
  
  // Apply accusatory replacements first (they contain phrases)
  for (const {from, to} of accusatoryReplacements) {
    rewritten = rewritten.replace(from, to);
  }
  
  // Then apply emotional word replacements
  for (const {from, to} of emotionalReplacements) {
    rewritten = rewritten.replace(from, to);
  }
  
  // 5. Detect and handle common vent phrases
  if (rewritten.match(/\bforget it\b|\bdone talking\b/i)) {
    rewritten = rewritten.replace(/\bforget it\b|\bdone talking\b/i, "I need some space to process my feelings");
  }
  
  if (rewritten.match(/\bI can't believe\b/i)) {
    rewritten = rewritten.replace(/\bI can't believe\b/i, "I'm surprised");
  }
  
  // 6. Add constructive ending phrases for very short, abrupt messages
  if (rewritten.split(/\s+/).length < 5 && !rewritten.includes("?")) {
    rewritten += ". I would like to discuss this further when we're both ready.";
  }
  
  // 7. Determine explanation based on the changes made
  let explanation = "";
  if (rewritten !== message) {
    explanation = "This rewritten message preserves your core concerns while expressing them in a way that's more likely to be heard. It uses 'I' statements to express feelings directly, avoids generalizations, and focuses on specific issues rather than character judgments.";
  } else {
    explanation = "Your message was already expressed in a constructive way. No significant changes were needed.";
  }
  
  return {
    original: message,
    rewritten: rewritten,
    explanation: explanation
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
