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
    participant?: string;
    examples?: Array<{
      text: string;
      from: string;
    }>;
    impact?: string;
    recommendedAction?: string;
    behavioralPattern?: string;
    progression?: string;
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

Carefully distinguish between participants and their behaviors. Be precise about which participant exhibits which behaviors.
EXTREMELY IMPORTANT: Each red flag should be clearly associated with the specific participant who exhibits the behavior.
DO NOT label a behavior as present in both participants unless you have clear evidence from multiple messages.

Return a JSON object with the following structure:
    {
      "toneAnalysis": {
        "overallTone": "string describing the conversation's overall tone",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
        "participantTones": {"participant name": "tone description that clearly distinguishes between participants"}
      },
      "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5, "participant": "name of participant showing this behavior"}],
      "communication": {
        "patterns": ["string describing specific patterns observed for each participant"],
        "suggestions": ["string with suggestions for improvement"]
      },
      "healthScore": {
        "score": number between 0-100,
        "label": "Troubled/Needs Work/Good/Excellent",
        "color": "red/yellow/light-green/green"
      },
      "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "interpretation that identifies specific behaviors", "improvement": "suggestion for how to reword this statement to be more constructive"}],
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

Carefully distinguish between participants and their behaviors. Be precise and accurate.
EXTREMELY IMPORTANT: Each red flag should be clearly associated with the specific participant who exhibits the behavior.
DO NOT label a behavior as present in both participants unless you have clear evidence from multiple messages.
Analyze quotes and exact wording to determine which participant is exhibiting each behavior.

IMPORTANT RED FLAG GUIDANCE:
1. Only identify GENUINE red flags based on clear patterns of problematic behavior.
2. Use specific quotes from the conversation as evidence for each red flag.
3. Do not over-interpret single messages - look for consistent patterns.
4. Rate severity accurately - don't inflate minor issues to severe red flags.
5. ONLY identify a red flag if it's clearly demonstrated in multiple messages.
6. Be extremely discerning - do not label normal communication as red flags.
7. For each red flag, provide concrete examples from the text.
8. Never invent red flags that aren't explicitly supported by the conversation text.
9. When providing "impact" analysis, make it specific to what's in the conversation, not generic.

Return a JSON object with the following structure:
    {
      "toneAnalysis": {
        "overallTone": "string describing the conversation's overall tone",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
        "participantTones": {"participant name": "tone description that clearly distinguishes from other participant"}
      },
      "redFlags": [
        {
          "type": "string - specific name of the red flag",
          "description": "detailed description with evidence from the conversation",
          "severity": number between 1-5,
          "participant": "name of participant showing this behavior",
          "examples": [{"text": "exact quote from conversation", "from": "participant name"}],
          "impact": "specific impact seen in THIS conversation, not general consequences",
          "recommendedAction": "specific action based on the actual conversation context"
        }
      ],
      "communication": {
        "patterns": ["string describing specific patterns observed for each participant"],
        "suggestions": ["string with suggestions for improvement"]
      },
      "healthScore": {
        "score": number between 0-100,
        "label": "Troubled/Needs Work/Good/Excellent",
        "color": "red/yellow/light-green/green"
      },
      "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "interpretation that identifies specific behaviors", "improvement": "suggestion for improvement"}],
      "highTensionFactors": ["string with reason and which participant contributes more to this factor"],
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
      enhancedPrompt = `Provide a detailed professional analysis of conversation between ${me} and ${them}.

Pay very close attention to clearly distinguishing between participants and attributing behaviors correctly.
EXTREMELY IMPORTANT: Each red flag should be clearly associated with the specific participant who exhibits the behavior.
DO NOT label a behavior as present in both participants unless you have clear evidence from multiple messages.

Focus on SPECIFIC EXAMPLES and QUOTES from the conversation to support your analysis.

For each red flag detected:
1. Include at least 2 direct quotes that demonstrate the issue
2. Clearly identify which participant (${me} or ${them}) is exhibiting the behavior
3. Provide impact analysis explaining how this affects the relationship
4. Recommend specific actions to address the issue
5. Identify larger behavioral patterns this connects to
6. Explain how this type of behavior typically progresses over time

Return ONLY a JSON object with this EXACT structure:

{
  "toneAnalysis": {
    "overallTone": "brief professional assessment",
    "emotionalState": [
      {"emotion": "primary", "intensity": 0.8},
      {"emotion": "secondary", "intensity": 0.6}
    ],
    "participantTones": {
      "${me}": "concise tone description",
      "${them}": "concise tone description"
    }
  },
  "redFlags": [
    {
      "type": "issue", 
      "description": "brief description", 
      "severity": 3,
      "participant": "name of participant",
      "examples": [
        {"text": "exact quote from conversation", "from": "participant name"},
        {"text": "another relevant quote", "from": "participant name"}
      ],
      "impact": "how this behavior affects the relationship",
      "recommendedAction": "specific action to address this issue",
      "behavioralPattern": "how this connects to larger patterns",
      "progression": "how this behavior typically develops over time"
    }
  ],
  "communication": {
    "patterns": ["key pattern one", "key pattern two"],
    "dynamics": ["relationship dynamic one", "relationship dynamic two"],
    "suggestions": ["improvement suggestion one", "improvement suggestion two"]
  },
  "healthScore": {
    "score": 65,
    "label": "Category",
    "color": "yellow"
  },
  "keyQuotes": [
    {
      "speaker": "${me}",
      "quote": "example quote text",
      "analysis": "brief interpretation",
      "improvement": "constructive reframe suggestion"
    }
  ],
  "participantConflictScores": {
    "${me}": {
      "score": 45,
      "label": "Brief description",
      "isEscalating": false
    },
    "${them}": {
      "score": 65,
      "label": "Brief description",
      "isEscalating": true
    }
  },
  "tensionContributions": {
    "${me}": ["specific action one", "specific action two"],
    "${them}": ["specific action one", "specific action two"]
  },
  "tensionMeaning": "brief explanation of what the tension means"
}

STRICT RULES:
- ALL descriptions must be 10 words or less
- ALL text values must use only ASCII characters
- NEVER use single quotes or escaped quotes
- NEVER use characters that would break JSON
- Keep pattern descriptions under 10 words each
- Label must be one of: Conflict, Tension, Stable, Healthy
- Color must be one of: red, yellow, light-green, green
- Severity must be number 1-5
- All scores must be 0-100
- ALWAYS include at least 2 examples with direct quotes for each red flag
- Each example must include the exact text from the conversation
- Set "from" field in examples to either "${me}" or "${them}"
- Set "participant" field to either "${me}" or "${them}" based on who exhibits the behavior
- Examples must clearly demonstrate the red flag issue
- Include specific impact analysis for each red flag
- Provide actionable recommendations for each issue
- Connect each red flag to larger behavioral patterns
- Include progression analysis for each concerning behavior

Here's the conversation:
${conversation}`;
    } else if (tier === 'personal') {
      enhancedPrompt = `Analyze this conversation between ${me} and ${them} with a personal-level depth.
      
Pay close attention to clearly distinguishing between participants and attributing behaviors correctly.
IMPORTANT: Each red flag should be clearly associated with the specific participant who exhibits the behavior.
DO NOT label a behavior as present in both participants unless you have clear evidence from multiple messages.

Include SPECIFIC QUOTES from the conversation for each red flag.

Return a JSON object with the following structure:
      {
        "toneAnalysis": {
          "overallTone": "detailed description of the conversation's overall tone",
          "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
          "participantTones": {"participant name": "personalized tone description"}
        },
        "redFlags": [
          {
            "type": "string", 
            "description": "clear description", 
            "severity": number between 1-5,
            "participant": "name of participant showing this behavior",
            "examples": [
              {"text": "exact quote from conversation", "from": "participant name"}
            ]
          }
        ],
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
      - Participant-specific red flag attribution
      - Supporting quotes for each red flag
      
RULES FOR RED FLAGS:
- Each red flag must identify the specific participant exhibiting the behavior
- Include at least one direct quote from the conversation for each red flag
- Quote text should be exact words from the conversation
- Set "from" field in examples to either "${me}" or "${them}" 
- Set "participant" field to either "${me}" or "${them}" based on who exhibits the behavior
      
      Here's the conversation:
      ${conversation}`;
    } else {
      enhancedPrompt = `Provide a basic tone analysis of conversation between ${me} and ${them}.

Return ONLY a JSON object with this EXACT structure:

{
  "toneAnalysis": {
    "overallTone": "simple description",
    "emotionalState": [
      {"emotion": "primary", "intensity": 0.7},
      {"emotion": "secondary", "intensity": 0.4}
    ],
    "participantTones": {
      "${me}": "brief tone",
      "${them}": "brief tone"
    }
  },
  "communication": {
    "patterns": ["pattern one", "pattern two", "pattern three"]
  },
  "redFlags": [
    {"type": "issue type", "description": "brief description", "severity": 3}
  ],
  "healthScore": {
    "score": 50,
    "label": "Category",
    "color": "yellow"
  }
}

STRICT RULES:
- Each description must be 5 words or less
- Emotions must be single words (frustrated, angry, happy)
- Intensity values between 0.1 and 1.0
- NO quotation marks in any text value
- NO special characters
- NO duplicated content in patterns
- Each pattern must be unique and distinct
- Score must be a number between 0-100
- Label must be one of: Conflict, Tension, Stable, Healthy
- Color must be one of: red, yellow, light-green, green

Here's the conversation:
${conversation}`;
    }
    
    // Make the API call with enhanced error handling
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2000,
      temperature: 0.1, // Lower temperature for more consistent responses
      system: `You are a communication expert who analyzes tone and patterns in conversations.

EXTREMELY CRITICAL: You MUST follow these output format requirements EXACTLY:
1. You MUST ONLY return clean, syntactically perfect JSON with NO explanations outside the JSON
2. You MUST wrap your output in code block markers: \`\`\`json at start and \`\`\` at end 
3. DO NOT use special characters inside the JSON values - ONLY use ASCII characters
4. NEVER use single quotes ' anywhere in the JSON - ONLY use double quotes "
5. AVOID using quotes within text values - rephrase to not need quotation marks
6. ALL property names MUST be in "double quotes"
7. DO NOT use trailing commas at the end of arrays or objects
8. KEEP all text extremely concise - 25 words maximum for any field
9. NEVER use line returns inside string values - use spaces instead
10. ALL text values MUST be in "double quotes"
11. DO NOT include any text outside the JSON code block

This is a TECHNICAL INTEGRATION - your JSON MUST be machine-parseable. The app will break if you don't follow these rules exactly.

REPEAT: This is not a general conversation. You are generating structured data that will be directly consumed by a program. Any text not formatted as perfect JSON will cause errors.

For the ${tier.toUpperCase()} tier, include only the fields specified in the prompt. Keep all analysis brief and concise.

When analyzing conversations:
- Keep descriptions SHORT and SPECIFIC (max 25 words)
- Avoid repetitive descriptions
- Use simple, direct language
- NEVER use quotation marks inside text values
- Double-check that your JSON is valid before submitting`,
      messages: [{ role: "user", content: enhancedPrompt }],
    });
    
    // Safely get content text using our helper function
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response for chat analysis');
    
    // Store result with raw response for later extraction if needed
    let result;
    
    // Parse the JSON response with markdown code block handling
    try {
      result = parseAnthropicJson(content);
    } catch (error) {
      console.error('JSON parsing failed in chat analysis, attempting direct extraction fallback', error);
      
      // Use the specialized raw extraction function that works directly on the raw text
      result = extractRawChatAnalysis(content, me, them);
    }
    
    // Add raw response as a non-enumerable property for direct extraction later
    // This is critical for free tier to extract red flags data from personal tier analysis
    Object.defineProperty(result, '_rawResponse', {
      value: content,
      enumerable: false,
      writable: false,
      configurable: true
    });
    
    return result;
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
      system: `You are a communication expert who analyzes messages to determine tone and intent.

EXTREMELY CRITICAL: You MUST follow these output format requirements EXACTLY:
1. You MUST ONLY return clean, syntactically perfect JSON with NO explanations outside the JSON
2. You MUST wrap your output in code block markers: \`\`\`json at start and \`\`\` at end 
3. DO NOT use special characters inside the JSON values - ONLY use ASCII characters
4. NEVER use single quotes ' anywhere in the JSON - ONLY use double quotes "
5. AVOID using quotes within text values - rephrase to not need quotation marks
6. ALL property names MUST be in "double quotes"
7. DO NOT use trailing commas at the end of arrays or objects
8. KEEP all text extremely concise - 25 words maximum for any field
9. NEVER use line returns inside string values - use spaces instead
10. ALL text values MUST be in "double quotes"
11. DO NOT include any text outside the JSON code block

This is a TECHNICAL INTEGRATION - your JSON MUST be machine-parseable. The app will break if you don't follow these rules exactly.

REPEAT: This is not a general conversation. You are generating structured data that will be directly consumed by a program. Any text not formatted as perfect JSON will cause errors.`,
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
      system: `You are a communication expert who transforms emotional messages into constructive ones.

EXTREMELY CRITICAL: You MUST follow these output format requirements EXACTLY:
1. You MUST ONLY return clean, syntactically perfect JSON with NO explanations outside the JSON
2. You MUST wrap your output in code block markers: \`\`\`json at start and \`\`\` at end 
3. DO NOT use special characters inside the JSON values - ONLY use ASCII characters
4. NEVER use single quotes ' anywhere in the JSON - ONLY use double quotes "
5. AVOID using quotes within text values - rephrase to not need quotation marks
6. ALL property names MUST be in "double quotes"
7. DO NOT use trailing commas at the end of arrays or objects
8. KEEP all text extremely concise - 25 words maximum for any field
9. NEVER use line returns inside string values - use spaces instead
10. ALL text values MUST be in "double quotes"
11. DO NOT include any text outside the JSON code block

This is a TECHNICAL INTEGRATION - your JSON MUST be machine-parseable. The app will break if you don't follow these rules exactly.

REPEAT: This is not a general conversation. You are generating structured data that will be directly consumed by a program. Any text not formatted as perfect JSON will cause errors.`,
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
    
    // Make sure conversation is a string and extract the first 500 characters for a faster name detection
    const excerptText = typeof conversation === 'string' ? conversation : JSON.stringify(conversation);
    const excerpt = excerptText.substring(0, 500);
    
    // Direct pattern matching approach first
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
        console.log('Direct pattern matching found participants:', names[0], 'and', names[1]);
        return { me: names[0], them: names[1] };
      }
    }
    
    // If direct pattern fails, try AI-based detection
    // Prepare the prompt, but use a simplified one now
    const prompt = `Identify the two main names in this conversation, showing them in this simple JSON format:
    {
      "me": "Name1",
      "them": "Name2"
    }
    
    First few lines of conversation:
    ${excerpt}`;
    
    // Make the API call with enhanced error handling
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 100, // Reduced tokens for a simpler response
      temperature: 0.1, // Lower temperature for more consistent output
      system: `You are a name extraction system. ONLY respond with a simple JSON object with "me" and "them" fields.

NO explanations. NO markdown. JUST a JSON object like this:
{"me":"Name1","them":"Name2"}

That's it. Nothing else.`,
      messages: [{ role: "user", content: prompt }],
    });
    
    // Safely get content text
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response for participant detection');
    
    // Try more specific regex patterns to match the exact output format problems we're seeing
    // Various formats we've observed:
    // 1. Standard format: {"me":"Jamie","them":"Alex"}
    // 2. Escaped quotes: {"me":"Jamie\","them":"Alex"} - the backslash prevents proper parsing
    
    // Helper function to sanitize a name by removing any non-letter characters
    const sanitizeName = (name: string): string => {
      // Remove any backslashes, quote marks, or other non-letter characters
      return name.replace(/[^A-Za-z]/g, '');
    };

    // Direct pattern match approach looking for {"me":"Name","them":"Name"} pattern or variations
    const namePattern = content.match(/{.*?"me"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*).*?"them"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)/);
    if (namePattern && namePattern[1] && namePattern[2]) {
      const firstName = sanitizeName(namePattern[1]);
      const secondName = sanitizeName(namePattern[2]);
      
      console.log('Extracted names using pattern matching:', firstName, 'and', secondName);
      
      if (firstName && secondName) {
        return {
          me: firstName,
          them: secondName
        };
      }
    }
    
    // More aggressive approach - just look for any "me" and "them" keys anywhere
    const meMatch = content.match(/"me"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
    const themMatch = content.match(/"them"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
    
    if (meMatch && themMatch) {
      const firstName = sanitizeName(meMatch[1]);
      const secondName = sanitizeName(themMatch[1]);
      
      console.log('Extracted individual names:', firstName, 'and', secondName);
      
      if (firstName && secondName) {
        return {
          me: firstName,
          them: secondName
        };
      }
    }
    
    // Last resort fallback to generic names
    console.log('All name detection methods failed, using generic names');
    return { me: "User", them: "Contact" };
  } catch (error: any) {
    // Log the error
    console.error('Error in participant detection:', error);
    
    // Return generic participant names as a failsafe
    return { me: "Me", them: "Them" };
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