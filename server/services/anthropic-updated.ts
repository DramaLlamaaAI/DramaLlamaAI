import Anthropic from '@anthropic-ai/sdk';
import { TIER_LIMITS } from "@shared/schema";
import { getTextFromContentBlock, parseAnthropicJson } from './anthropic-helpers';

// Function for getting tier-specific system prompt
const getTierSpecificSystemPrompt = (tier: string, me: string, them: string): string => {
  return `You are a communication expert who analyzes conversations.

For this ${tier.toUpperCase()} tier analysis, examine the conversation between ${me} and ${them}.

CRITICAL ACCURACY REQUIREMENT: You must ONLY reference text that exists verbatim in the provided conversation. 
- NEVER create, paraphrase, or modify quotes
- NEVER generate example quotes that don't exist in the original text
- If you cannot find exact quotes for red flags or examples, omit the quote fields entirely
- All quotes must be exact word-for-word matches from the conversation

ENHANCED EMOTIONAL TONE ANALYSIS REQUIREMENTS:
For toneAnalysis.participantTones, provide detailed analysis including:
- Emotional state and underlying feelings
- Communication ability score (1-5 scale)
- Specific behavioral insights
- Key strengths and growth areas

COMMUNICATION ABILITY SCORING (1-5 scale):
5 = Excellent: Uses empathetic language, actively listens, collaborates on solutions, takes responsibility
4 = Good: Generally constructive, shows some empathy, willing to engage positively
3 = Average: Mixed communication, some positive and negative patterns
2 = Poor: Often defensive, dismissive, or accusatory with limited empathy
1 = Very Poor: Highly problematic communication, manipulative, or destructive patterns

Consider these factors for scoring:
- Use of empathetic language ("I understand", "I hear you")
- Willingness to collaborate or find solutions
- Directness vs. evasiveness
- Use of accusatory or defensive statements
- Active listening phrases and validation
- Taking responsibility vs. blame-shifting

SEVERITY SCORING GUIDELINES (1-10 scale):
CRITICAL (9-10): Self-harm threats, suicide threats, physical violence threats, child endangerment, stalking behavior
HIGH RISK (7-8): Emotional manipulation with threats, gaslighting, financial abuse, isolation tactics, threatening escalation
SERIOUS (5-6): Guilt-tripping, emotional blackmail, blame-shifting, controlling behavior, intimidation without direct threats
MODERATE (3-4): Passive aggression, dismissive language, minor manipulation, moving goalposts, victim mentality
LOW (1-2): Poor communication habits, minor insensitivity, occasional defensive responses

CRITICAL: DO NOT flag healthy responses as red flags. However, DO flag problematic communication accurately:

HEALTHY responses that should NOT be flagged:
- "I didn't realize it bothered you" (shows awareness)
- "I can try harder" (shows willingness to improve)
- Apologizing or taking responsibility
- Asking for clarification or feedback
- Expressing genuine care or concern

PROBLEMATIC patterns that MUST be flagged appropriately:
- Absolute statements like "You never..." or "You always..." (score 5-7)
- Dismissive responses like "Not when it mattered" (score 5-6)
- Accusations without specifics when used to attack character (score 4-6)
- Invalidating partner's efforts or perspective (score 5-7)

Do NOT mislabel accusatory or dismissive statements as "lack of specific examples" when they are clearly meant to attack or invalidate.

IMPORTANT: Return ONLY JSON wrapped in code block markers (\`\`\`json). NEVER include ANY explanatory text outside the JSON code block.

All JSON values MUST be in "double quotes" without special characters. Do NOT use single quotes or line breaks within values.

Your analysis MUST be concise - no field should exceed 25 words.

The JSON structure should include only the required fields for ${tier.toUpperCase()} tier:
- toneAnalysis (overallTone, emotionalState, participantTones with enhanced details)
- communication (patterns, dynamics, suggestions) 
- healthScore (score from 0-100, label, color)
${tier === 'personal' || tier === 'pro' || tier === 'beta' ? '- participantAnalysis (for each participant: emotionalTone, communicationScore, insights, recommendations)' : ''}
${tier === 'personal' || tier === 'pro' ? '- redFlags (if applicable - NO QUOTES unless exact matches found)' : ''}
${tier === 'personal' || tier === 'pro' || tier === 'beta' ? '- empatheticSummary (for each participant: summary, insights, growthAreas, strengths)' : ''}
${tier === 'pro' ? '- keyQuotes (ONLY if exact quotes can be verified), dramaScore, and other advanced analysis components' : ''}`;
};

// Function for direct group chat analysis with Anthropic
export async function analyzeChatWithAnthropicAI(conversation: string, me: string, them: string, tier: string, additionalInstructions: string = ''): Promise<any> {
  // Validate API key format
  if (!process.env.ANTHROPIC_API_KEY || 
     !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    console.error('Invalid Anthropic API key format');
    throw new Error('Invalid Anthropic API key format. Please check your API key.');
  }
  
  // Define Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  // Use the actual tier for proper tier-specific analysis
  const effectiveTier = tier;
  console.log(`Using Anthropic for ${effectiveTier} tier analysis (original: ${tier}) with additional context: ${additionalInstructions.slice(0, 50)}...`);
  
  // Get the base prompt for this tier
  const basePrompt = getTierSpecificSystemPrompt(effectiveTier, me, them);
  
  // Add any additional instructions for special cases like group chats
  const systemPrompt = additionalInstructions ? 
    `${basePrompt}\n\n${additionalInstructions}` : 
    basePrompt;
  
  try {
    // Make the API request
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", // the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
      system: systemPrompt,
      max_tokens: 4000,
      messages: [
        { role: "user", content: conversation }
      ]
    });
    
    // Safely get content text
    const content = getTextFromContentBlock(response.content);
    
    console.log('Successfully received Anthropic response');
    
    // Parse the JSON response
    try {
      const result = parseAnthropicJson(content);
      
      // If this is a group chat (indicated by additionalInstructions),
      // ensure the result has proper group chat metadata
      if (additionalInstructions.includes('GROUP CHAT')) {
        // Extract participant names from the additionalInstructions
        const participantMatch = additionalInstructions.match(/participants: ([^.]+)/);
        if (participantMatch && participantMatch[1]) {
          const participants = participantMatch[1].split(',').map(p => p.trim());
          
          // Add group chat metadata
          result.isGroupChat = true;
          result.groupParticipants = participants;
          
          // Ensure all participants have tone descriptions
          if (result.toneAnalysis && result.toneAnalysis.participantTones) {
            for (const participant of participants) {
              if (!result.toneAnalysis.participantTones[participant]) {
                result.toneAnalysis.participantTones[participant] = 
                  "Group participant (tone not individually analyzed)";
              }
            }
          }
        }
      }
      
      return result;
    } catch (parseError) {
      console.error('JSON parsing failed, attempting direct extraction fallback', parseError);
      
      // Use specialized extraction for direct parsing
      const extractedResult = extractRawChatAnalysis(content, me, them);
      
      // Add group chat metadata if relevant
      if (additionalInstructions.includes('GROUP CHAT')) {
        const participantMatch = additionalInstructions.match(/participants: ([^.]+)/);
        if (participantMatch && participantMatch[1]) {
          const participants = participantMatch[1].split(',').map(p => p.trim());
          extractedResult.isGroupChat = true;
          extractedResult.groupParticipants = participants;
        }
      }
      
      return extractedResult;
    }
  } catch (error) {
    console.error('Error in analyzeChatWithAnthropicAI:', error);
    throw error;
  }
}

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
  participantAnalysis?: {
    [participant: string]: {
      emotionalTone: string;
      communicationScore: number;
      insights: string;
      recommendations: string;
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
  empatheticSummary?: {
    [participant: string]: {
      summary: string;
      insights: string;
      growthAreas: string[];
      strengths: string[];
      attachmentStyle?: string;
      triggerPatterns?: string[];
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
    free: `Analyze this conversation between {me} and {them} with enhanced nuance detection.

    🔍 CONTEXT-AWARE FLAGGING RULES:
    - Do NOT flag emotionally vulnerable or explanatory language unless followed by coercion, guilt-tripping, threats, or blame
    - "I'm overwhelmed" = Defensive reassurance, NOT manipulation
    - "I care about you" = Genuine concern, NOT red flag
    - "I really needed you" = Vulnerable honesty, NOT communication breakdown
    - "I really appreciated" + positive response = Genuine gratitude, NOT guilt tripping
    
    🔒 SAFE EXPRESSION LIBRARY (Never flag these):
    - "I'm feeling really overwhelmed"
    - "I care about you" 
    - "This is hard, but I want to understand"
    - "I didn't mean to upset you"
    - "I'm not trying to ignore you"
    - "I really appreciated your help"
    - "You made a difference"
    - "Thank you for" + positive reciprocal response
    
    🧠 INTENT CLASSIFICATION: For key quotes, classify intent:
    - Defensive reassurance: Attempting to calm tension
    - Accountability: Taking responsibility 
    - Minimizing: Dismissing concerns
    - Redirecting: Deflecting blame
    - Genuine concern: Showing care
    
    Return a JSON object:
    {
      "toneAnalysis": {
        "overallTone": "string describing the conversation's overall tone",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
        "participantTones": {"participant name": "tone description"}
      },
      "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5}],
      "communication": {
        "patterns": ["string describing specific communication patterns"],
        "dynamics": ["string describing relationship dynamics"],
        "suggestions": ["string with suggestions for improvement"]
      },
      "healthScore": {
        "score": number between 0-100,
        "label": "Troubled/Needs Work/Good/Excellent", 
        "color": "red/yellow/light-green/green"
      }
    }
    
    Here's the conversation:
    {conversation}`,

    beta: `Analyze this conversation between {me} and {them} with comprehensive Beta-level insights.

🔍 RED FLAG DETECTION RULES:
- Look for manipulation tactics: guilt-tripping, emotional blackmail, threats, blame-shifting
- Identify gaslighting: denying reality, making someone question their memory/perception
- Spot controlling behavior: isolation attempts, monitoring, restrictions
- Detect stonewalling: silent treatment, emotional withdrawal as punishment
- Flag verbal abuse: name-calling, insults, degrading language

🔒 CONTEXT SENSITIVITY (These alone are NOT red flags):
- Expressing vulnerability: "I'm feeling overwhelmed"
- Genuine apologies: "I didn't mean to upset you"
- Seeking resolution: "Let's talk about this calmly"

Return a JSON object with the following structure:
    {
      "toneAnalysis": {
        "overallTone": "string describing the conversation's overall tone",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1}],
        "participantTones": {"participant name": "tone description that clearly distinguishes between participants"}
      },
      "redFlags": [{"type": "string", "description": "string", "severity": number between 1-5, "participant": "name of participant showing this behavior", "examples": [{"text": "exact quote", "from": "participant name"}], "impact": "string", "recommendedAction": "string"}],
      "communication": {
        "patterns": ["string describing specific patterns observed for each participant"],
        "dynamics": ["string describing relationship dynamics"],
        "suggestions": ["string with suggestions for improvement"]
      },
      "healthScore": {
        "score": number between 0-100,
        "label": "Troubled/Needs Work/Good/Excellent",
        "color": "red/yellow/light-green/green"
      },
      "empatheticSummary": {
        "participant name": {
          "summary": "brief overview of communication style",
          "insights": "key behavioral insights",
          "growthAreas": ["specific areas for improvement"],
          "strengths": ["positive communication traits"]
        }
      },
      "keyQuotes": [{"speaker": "name", "quote": "message text", "analysis": "interpretation", "improvement": "suggestion for rewording"}]
    }
    
    Here's the conversation:
    {conversation}`,

    personal: `Analyze this conversation between {me} and {them} with comprehensive Personal tier analysis.

🔍 PERSONAL TIER RED FLAG DETECTION:
- Look for manipulation tactics: guilt-tripping, emotional blackmail, threats, blame-shifting
- Identify gaslighting: denying reality, making someone question their memory/perception
- Spot controlling behavior: isolation attempts, monitoring, restrictions
- Detect stonewalling: silent treatment, emotional withdrawal as punishment
- Flag verbal abuse: name-calling, insults, degrading language
- Notice power imbalances: intimidation, coercion, financial control
- Rate severity on scale of 1-10 (not 1-5)
- Provide EXACT quotes with participant attribution
- Calculate individual manipulation scores per participant

🎯 INDIVIDUAL MANIPULATION SCORE DETECTION:
For each participant, calculate manipulation score (0-100) based on:
- Frequency of manipulative statements
- Severity of manipulation tactics used
- Impact on conversation dynamics
- Include specific quotes as evidence

💬 INDIVIDUAL COMMUNICATION STYLE ANALYSIS:
For each participant, analyze:
- Primary communication patterns
- Emotional regulation style
- Conflict response mechanisms
- Relationship dynamics contribution
- Strengths and areas for improvement

🔒 CONTEXT SENSITIVITY (These alone are NOT red flags):
- Expressing vulnerability: "I'm feeling overwhelmed"
- Genuine apologies: "I didn't mean to upset you"
- Seeking resolution: "Let's talk about this calmly"
- Sharing feelings: "I felt alone" (unless used to guilt-trip)

🧠 INTENT CLASSIFICATION: For key quotes, classify intent as:
- Defensive reassurance: Attempting to calm tension without escalation
- Accountability: Taking responsibility ("That's on me")
- Minimizing: Dismissing concerns ("You're overreacting")
- Redirecting: Deflecting blame ("What about when you...")
- Genuine concern: Showing care ("How can I help?")

Carefully distinguish between participants and their behaviors. Be precise about which participant exhibits which behaviors.
EXTREMELY IMPORTANT: Each red flag should be clearly associated with the specific participant who exhibits the behavior.
DO NOT label a behavior as present in both participants unless you have clear evidence from multiple messages.

Return a JSON object with the following PERSONAL TIER structure:
    {
      "toneAnalysis": {
        "overallTone": "comprehensive analysis of conversation's emotional atmosphere",
        "emotionalState": [{"emotion": "string", "intensity": number between 0-1, "participant": "who exhibits this emotion"}],
        "participantTones": {"participant name": "detailed individual communication style analysis"}
      },
      "redFlags": [
        {
          "type": "specific red flag category",
          "description": "detailed explanation of the behavior",
          "severity": number between 1-10,
          "participant": "name of participant exhibiting this behavior",
          "examples": [{"text": "exact quote from conversation", "from": "participant name"}],
          "impact": "how this affects the relationship",
          "recommendedAction": "specific support recommendation"
        }
      ],
      "manipulationScores": {
        "participant name": {
          "score": number between 0-100,
          "behaviors": ["specific manipulative behaviors detected"],
          "examples": [{"text": "exact quote", "from": "participant", "manipulationType": "type of manipulation"}],
          "frequency": "how often this occurs in conversation"
        }
      },
      "individualCommunicationStyles": {
        "participant name": {
          "primaryStyle": "main communication approach",
          "emotionalRegulation": "how they handle emotions",
          "conflictResponse": "their conflict management style",
          "strengths": ["positive communication traits"],
          "improvementAreas": ["areas needing development"],
          "relationshipContribution": "how they impact the dynamic"
        }
      },
      "communication": {
        "patterns": ["detailed patterns for each participant"],
        "suggestions": ["specific improvement recommendations"],
        "supportRecommendations": ["professional support suggestions if needed"]
      },
      "healthScore": {
        "score": number between 0-100,
        "label": "Troubled/Needs Work/Good/Excellent",
        "color": "red/yellow/light-green/green",
        "factors": ["specific elements affecting the score"]
      },
      "keyQuotes": [
        {
          "speaker": "participant name",
          "quote": "exact message text",
          "analysis": "behavioral interpretation",
          "improvement": "constructive alternative phrasing"
        }
      ],
      "empatheticSummary": {
        "participant name": {
          "summary": "empathetic understanding of their communication and emotional state",
          "insights": "deeper behavioral insights and motivations",
          "growthAreas": ["specific development opportunities"],
          "strengths": ["positive aspects of their communication or coping mechanisms"]
        }
      }
    }
    
    Here's the conversation:
    {conversation}`,

    pro: `Perform an EXPERT-LEVEL comprehensive analysis of this conversation between {me} and {them} with advanced psychological insights.

🔬 ADVANCED RED FLAG DETECTION & BEHAVIORAL ANALYSIS:
- Manipulation tactics: guilt-tripping, emotional blackmail, threats, blame-shifting, DARVO (Deny, Attack, Reverse Victim & Offender)
- Gaslighting patterns: reality denial, memory questioning, sanity undermining, historical revisionism
- Control mechanisms: isolation attempts, monitoring, financial control, social manipulation, information control
- Emotional abuse: stonewalling, silent treatment, emotional withdrawal, intermittent reinforcement
- Verbal aggression: name-calling, insults, degrading language, threats, intimidation
- Power dynamics: coercion, intimidation, exploitation of vulnerabilities, authority abuse
- Narcissistic behaviors: love-bombing, devaluation, hoovering, triangulation, scapegoating
- Trauma bonding indicators: hot/cold treatment, unpredictable responses, dependency creation
- Codependent patterns: enabling, people-pleasing, boundary violations, enmeshment
- Communication sabotage: deflection, projection, circular arguments, topic shifting

🧠 PSYCHOLOGICAL PATTERN RECOGNITION:
- Attachment styles and their manifestations in conflict
- Defense mechanisms and their relationship impact
- Emotional regulation patterns and dysregulation triggers
- Communication schemas and underlying belief systems
- Relationship scripts and unconscious role-playing
- Conflict escalation patterns and de-escalation opportunities
- Power struggle dynamics and control competitions
- Intimacy patterns and vulnerability responses

🔒 CONTEXT SENSITIVITY (These alone are NOT red flags):
- Expressing vulnerability: "I'm feeling overwhelmed"
- Genuine apologies: "I didn't mean to upset you"
- Seeking resolution: "Let's talk about this calmly"
- Sharing feelings: "I felt alone" (unless used to guilt-trip)
- "I really needed you this week" / "I felt completely alone"
- "I'm trying to understand, but this hurts"

🧠 INTENT CLASSIFICATION: For key quotes, classify intent as:
- Defensive reassurance: Attempting to calm tension without escalation
- Accountability: Taking responsibility ("That's on me", "I should have")
- Minimizing: Dismissing concerns ("You're overreacting", "This isn't a big deal")
- Redirecting: Deflecting blame ("What about when you...", "Well, you're not perfect")
- Genuine concern: Showing care ("How can I help?", "I want to understand")
- Vulnerable honesty: Expressing needs/feelings directly

⚠️ FALLBACK FOR UNCLEAR NUANCE:
If tone is complex or context insufficient, note: "Nuance Detected: Some statements may carry multiple interpretations depending on relationship history and tone of voice."

Carefully distinguish between participants and their behaviors. Be precise and accurate.
EXTREMELY IMPORTANT: Each red flag should be clearly associated with the specific participant who exhibits the behavior.
DO NOT label a behavior as present in both participants unless you have clear evidence from multiple messages.
Analyze quotes and exact wording to determine which participant is exhibiting each behavior.

CRITICAL RED FLAG GUIDANCE:
- Only flag genuinely harmful behaviors: manipulation, gaslighting, attacks, contempt
- Do NOT flag emotional vulnerability, expressing needs, or sharing feelings
- "I really needed you" = HEALTHY vulnerability, not a red flag
- "I felt alone" = HEALTHY emotional expression, not a problem
- Be extremely conservative with red flag identification

Return a JSON object with the following EXPERT-LEVEL structure:
    {
      "toneAnalysis": {
        "overallTone": "comprehensive analysis of conversational atmosphere and emotional climate",
        "emotionalState": [{"emotion": "specific emotion", "intensity": number between 0-1, "triggers": "what caused this emotion", "participant": "who exhibits this"}],
        "participantTones": {"participant name": "detailed psychological profile of communication style and emotional regulation patterns"}
      },
      "redFlags": [
        {
          "type": "specific psychological term for the behavior pattern",
          "description": "detailed analysis with psychological context and evidence",
          "severity": number between 1-5,
          "participant": "name of participant exhibiting behavior",
          "examples": [{"text": "exact quote", "from": "participant", "context": "situational context"}],
          "impact": "immediate conversational impact and relationship consequences",
          "recommendedAction": "evidence-based therapeutic intervention or boundary setting",
          "behavioralPattern": "recurring pattern analysis across the conversation",
          "progression": "how this behavior escalates or de-escalates over time"
        }
      ],
      "communication": {
        "patterns": ["detailed analysis of each participant's communication schemas and attachment responses"],
        "dynamics": ["power dynamics, role assignments, and unconscious relationship scripts"],
        "suggestions": ["therapeutic-level communication improvements with specific techniques"]
      },
      "healthScore": {
        "score": number between 0-100,
        "label": "comprehensive relationship health assessment",
        "color": "red/yellow/light-green/green",
        "factors": ["specific elements contributing to score"],
        "trajectory": "relationship direction based on current patterns"
      },
      "empatheticSummary": {
        "participant name": {
          "summary": "psychological profile and communication assessment",
          "insights": "deep behavioral insights and motivational analysis",
          "growthAreas": ["specific therapeutic growth opportunities"],
          "strengths": ["psychological strengths and positive coping mechanisms"],
          "attachmentStyle": "likely attachment style manifestation",
          "triggerPatterns": ["emotional triggers and defensive responses"]
        }
      },
      "keyQuotes": [{"speaker": "name", "quote": "exact text", "analysis": "psychological interpretation", "improvement": "therapeutic reframing", "underlyingNeed": "unmet need being expressed"}],
      "highTensionFactors": ["detailed analysis of escalation triggers and participant contributions"],
      "participantConflictScores": {
        "participant name": {
          "score": number between 0-100,
          "label": "conflict management style assessment",
          "isEscalating": boolean,
          "defensePatterns": ["specific defense mechanisms used"],
          "emotionalRegulation": "assessment of emotional management skills"
        }
      },
      "powerDynamics": {
        "overall": "comprehensive power balance analysis",
        "shifts": ["moments where power dynamics change"],
        "controlPatterns": ["who attempts control and how"],
        "vulnerabilityExploitation": ["if/how vulnerabilities are used for power"]
      },
      "psychologicalPatterns": {
        "triangulation": "any third-party involvement or manipulation",
        "projection": "instances of psychological projection",
        "gaslightingIndicators": ["specific reality distortion attempts"],
        "traumaBonding": "signs of unhealthy attachment cycles",
        "codependencyMarkers": ["enabling or boundary violation patterns"]
      },
      "therapeuticRecommendations": [
        "specific therapeutic interventions based on observed patterns"
      ]
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
    free: `You are an empathetic communication coach helping someone express their feelings in a healthier way. Your job is to rewrite emotionally charged messages so they sound natural and human - like how a caring friend or partner might actually say it in real life.

    Guidelines for rewriting:
    - Use everyday, conversational language - avoid sounding stiff or robotic
    - Keep it genuine and authentic - like you're talking to someone you care about
    - Make it calm and constructive, but still emotionally honest
    - Sound like a real person would say it, not a corporate email
    - Keep the core message but express it more thoughtfully

    Return a JSON object with this structure:
    {
      "original": "the original message",
      "rewritten": "rewritten message that sounds natural and human",
      "explanation": "brief explanation of how you made it more authentic"
    }
    
    Here's the message to rewrite:
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
// Validate quotes against original conversation to prevent fabrication
function validateQuotesAgainstConversation(analysis: any, originalConversation: string): any {
  if (!analysis || !originalConversation) return analysis;
  
  const conversationText = originalConversation.toLowerCase();
  
  // Validate red flag examples
  if (analysis.redFlags && Array.isArray(analysis.redFlags)) {
    analysis.redFlags = analysis.redFlags.map((flag: any) => {
      if (flag.examples && Array.isArray(flag.examples)) {
        flag.examples = flag.examples.filter((example: any) => {
          if (!example.text || typeof example.text !== 'string') return false;
          
          const quoteText = example.text.toLowerCase().trim();
          if (quoteText.length < 3) return false;
          
          // Check for exact match first
          if (conversationText.includes(quoteText)) {
            return true;
          }
          
          // For longer quotes, check word match percentage
          const words = quoteText.split(' ').filter((word: string) => word.length > 2);
          if (words.length === 0) return false;
          
          const matchedWords = words.filter((word: string) => conversationText.includes(word));
          const matchPercentage = matchedWords.length / words.length;
          
          // Require 70% word match for validation
          return matchPercentage >= 0.7;
        });
        
        // If no valid examples remain, remove the examples field
        if (flag.examples.length === 0) {
          delete flag.examples;
        }
      }
      return flag;
    });
  }
  
  // Validate key quotes
  if (analysis.keyQuotes && Array.isArray(analysis.keyQuotes)) {
    analysis.keyQuotes = analysis.keyQuotes.filter((quoteObj: any) => {
      if (!quoteObj.quote || typeof quoteObj.quote !== 'string') return false;
      
      const quoteText = quoteObj.quote.toLowerCase().trim();
      if (quoteText.length < 3) return false;
      
      // Check for exact match first
      if (conversationText.includes(quoteText)) {
        return true;
      }
      
      // For longer quotes, check word match percentage
      const words = quoteText.split(' ').filter((word: string) => word.length > 2);
      if (words.length === 0) return false;
      
      const matchedWords = words.filter((word: string) => conversationText.includes(word));
      const matchPercentage = matchedWords.length / words.length;
      
      // Require 70% word match for validation
      return matchPercentage >= 0.7;
    });
    
    // If no valid quotes remain, remove the keyQuotes field
    if (analysis.keyQuotes.length === 0) {
      delete analysis.keyQuotes;
    }
  }
  
  return analysis;
}

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
    // Convert Beta tier to Pro for complete analysis
    const effectiveTier = tier === 'beta' ? 'pro' : tier;
    console.log(`Attempting to use Anthropic for chat analysis with ${effectiveTier} tier (original: ${tier})`);
    
    // Create a custom enhanced prompt with improved communication pattern analysis
    let enhancedPrompt = '';
    
    if (effectiveTier === 'pro' || effectiveTier === 'instant') {
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
    } else if (effectiveTier === 'personal') {
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
      max_tokens: 6000,
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

For the ${effectiveTier.toUpperCase()} tier, include only the fields specified in the prompt. Keep all analysis brief and concise.

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
    
    // Apply quote validation to ensure accuracy
    result = validateQuotesAgainstConversation(result, conversation);
    console.log('Applied quote validation to prevent fabricated quotes');
    
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
    
    // Check for specific API overload condition
    const isOverloaded = error?.error?.error?.type === 'overloaded_error' || 
                         error?.status === 529;
    
    if (isOverloaded) {
      throw new Error('We are experiencing high demand. Please try again in a few minutes or contact support at DramaLlamaConsultancy@gmail.com');
    }
    
    // For all other errors, provide standard error message
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
    
    // Check for specific API overload condition
    const isOverloaded = error?.error?.error?.type === 'overloaded_error' || 
                         error?.status === 529;
    
    if (isOverloaded) {
      throw new Error('We are experiencing high demand. Please try again in a few minutes or contact support at DramaLlamaConsultancy@gmail.com');
    }
    
    // Throw error with support information for other types of errors
    throw new Error('We apologize, but we are unable to process your request at this time. Please contact support at DramaLlamaConsultancy@gmail.com');
  }
}

export async function generateFollowUpSuggestions(situation: string, originalMessage: string, receivedReply: string) {
  try {
    console.log('Generating follow-up suggestions using Anthropic');
    
    const prompt = `You are a communication expert helping someone navigate a conversation. Based on the original situation, their message, and the response they received, provide thoughtful follow-up suggestions.

Context:
- Original situation: ${situation}
- Their message: ${originalMessage}
- Reply they received: ${receivedReply}

Return a JSON object with this structure:
{
  "analysis": "Brief analysis of how the reply went and what it reveals",
  "suggestions": [
    {
      "type": "immediate",
      "title": "Quick Response Option",
      "message": "A suggested immediate response",
      "reasoning": "Why this approach works"
    },
    {
      "type": "thoughtful",
      "title": "Thoughtful Follow-up",
      "message": "A more considered response option",
      "reasoning": "When and why to use this approach"
    },
    {
      "type": "strategic",
      "title": "Long-term Strategy",
      "message": "A strategic response for bigger picture goals",
      "reasoning": "How this helps the relationship long-term"
    }
  ],
  "nextSteps": "Practical advice for moving forward"
}

Make suggestions sound natural and authentic, not scripted.`;

    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      temperature: 0.2,
      system: `You are a wise communication coach helping someone navigate relationship conversations. Provide practical, authentic advice that helps people communicate more effectively while staying true to themselves.

TECHNICAL FORMAT REQUIREMENTS:
1. Return ONLY clean JSON wrapped in \`\`\`json code blocks
2. Use double quotes for all strings and property names
3. No special characters, line breaks in values, or trailing commas
4. Keep suggestions conversational and authentic

This is a TECHNICAL INTEGRATION - your JSON MUST be machine-parseable.`,
      messages: [{ role: "user", content: prompt }],
    });

    const content = getTextFromContentBlock(response.content);
    console.log('Successfully received follow-up suggestions from Anthropic');

    try {
      return parseAnthropicJson(content);
    } catch (error) {
      console.error('JSON parsing failed for follow-up suggestions:', error);
      
      // Return a basic fallback structure
      return {
        analysis: "Unable to analyze the response at this time.",
        suggestions: [
          {
            type: "immediate",
            title: "Acknowledge the Response",
            message: "Thank you for sharing that with me.",
            reasoning: "Shows you heard what they said."
          }
        ],
        nextSteps: "Consider your goals for this conversation and respond when you're ready."
      };
    }
  } catch (error: any) {
    console.error('Error generating follow-up suggestions:', error);
    
    // Return basic structure for error cases
    return {
      analysis: "Unable to generate suggestions at this time.",
      suggestions: [
        {
          type: "immediate",
          title: "Take Time",
          message: "Let me think about this and get back to you.",
          reasoning: "Gives you space to consider your response."
        }
      ],
      nextSteps: "Take time to process their response before deciding how to proceed."
    };
  }
}

export async function deEscalateMessage(message: string, tier: string = 'free') {
  try {
    console.log('Attempting to use Anthropic for de-escalate mode analysis');
    
    let prompt = '';
    
    if (tier === 'pro' || tier === 'instant') {
      // Enhanced de-escalation with professional-level guidance
      prompt = `Help someone rewrite this emotional message so it sounds natural and genuine while being more effective. Think like you're helping a friend communicate better with someone they care about.

      Return a JSON object with this structure:
      {
        "original": "the original message",
        "rewritten": "rewritten message that sounds authentic and human while being calmer and more constructive",
        "explanation": "conversational explanation of what was changed and why it works better",
        "additionalContextInsights": "deeper insights about what might be going on beneath the surface",
        "longTermStrategy": "practical suggestions for improving communication patterns going forward"
      }
      
      Make the rewritten message sound like how a real person would actually say it - genuine, thoughtful, but still emotionally honest. Avoid corporate or therapy-speak.
      
      Here's the message to rewrite:
      ${message}`;
    } else if (tier === 'personal') {
      // Mid-level de-escalation with personalized guidance
      prompt = `Help rewrite this emotional message so it sounds more natural and gets better results. Think about how you'd want someone to talk to you when emotions are running high.

      Return a JSON object with this structure:
      {
        "original": "the original message",
        "rewritten": "rewritten message that sounds genuine and human while being calmer and more constructive",
        "explanation": "friendly explanation of what was changed and why it works better",
        "alternativeOptions": "1-2 other ways they could say this that might also work well"
      }
      
      Make it sound like how a real person would actually say it - authentic and caring, not like a script or formal letter.
      
      Here's the message to rewrite:
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
      system: `You are an empathetic communication coach helping someone express their feelings in a healthier way. Your job is to rewrite emotionally charged messages so they sound natural and human - like how a caring friend or partner might actually say it in real life.

Guidelines for rewriting:
- Use everyday, conversational language - avoid sounding stiff or robotic
- Keep it genuine and authentic - like you're talking to someone you care about
- Make it calm and constructive, but still emotionally honest
- Sound like a real person would say it, not a corporate email
- Keep the core message but express it more thoughtfully

TECHNICAL FORMAT REQUIREMENTS:
1. Return ONLY clean JSON wrapped in \`\`\`json code blocks
2. Use double quotes for all strings and property names
3. No special characters, line breaks in values, or trailing commas
4. Keep explanations conversational but concise
5. Make rewritten messages sound genuinely human

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
    
    // Check for specific API overload condition
    const isOverloaded = error?.error?.error?.type === 'overloaded_error' || 
                         error?.status === 529;
    
    if (isOverloaded) {
      throw new Error('We are experiencing high demand. Please try again in a few minutes or contact support at DramaLlamaConsultancy@gmail.com');
    }
    
    // For all other errors, provide standard error message
    throw new Error('We apologize, but we are unable to process your request at this time. Please contact support at DramaLlamaConsultancy@gmail.com');
  }
}

export async function detectParticipants(conversation: string) {
  try {
    console.log('Attempting to use Anthropic for participant detection');
    
    // Make sure conversation is a string and extract the first 1000 characters for better name detection
    const excerptText = typeof conversation === 'string' ? conversation : JSON.stringify(conversation);
    const excerpt = excerptText.substring(0, 1000);
    
    // Enhanced direct pattern matching for WhatsApp and other chat formats
    const whatsappPatterns = [
      // Standard WhatsApp format: DD/MM/YYYY, HH:MM - Name: message
      /\d{1,2}\/\d{1,2}\/\d{4},\s+\d{1,2}:\d{2}\s+-\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*:/g,
      // WhatsApp format with brackets: [date, time] Name: message  
      /\[\d+[\/-]\d+[\/-]\d+[,\s]+\d+:\d+[:\d]*\s*[AP]?M?\]\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*:/g,
      // Alternative format: date, time - Name: message
      /\d+[\/-]\d+[\/-]\d+[,\s]+\d+:\d+[:\d]*\s*[AP]?M?\s*-\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*:/g,
      // Simple format: Name: message (at start of line)
      /^([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*:/gm,
      // Format with line breaks: Name: message
      /(?:^|\n)([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*:/g
    ];
    
    const detectedNames = new Set<string>();
    
    console.log('Participant detection - excerpt first 200 chars:', excerpt.substring(0, 200));
    
    for (const pattern of whatsappPatterns) {
      let match;
      let patternMatches = 0;
      while ((match = pattern.exec(excerpt)) !== null) {
        const rawName = match[1].trim();
        patternMatches++;
        
        // Clean up the name - remove any trailing spaces or special characters
        const name = rawName.replace(/[^\w\s]/g, '').trim();
        
        console.log(`Pattern match ${patternMatches}: raw="${rawName}" cleaned="${name}"`);
        
        // Filter out system messages, short names, and common non-names
        if (name.length >= 2 && 
            !name.toLowerCase().includes('changed') && 
            !name.toLowerCase().includes('added') && 
            !name.toLowerCase().includes('left') &&
            !name.toLowerCase().includes('joined') &&
            !name.toLowerCase().includes('created') &&
            !name.toLowerCase().includes('messages') &&
            !name.toLowerCase().includes('calls') &&
            name !== 'You' && name !== 'Me' && name !== 'Them' &&
            name !== 'Media omitted' && name !== 'null' &&
            !/^\d+$/.test(name) && // Not just numbers
            name.length <= 50) { // Reasonable name length
          detectedNames.add(name);
          console.log(`Added participant: "${name}"`);
        } else {
          console.log(`Filtered out: "${name}" (failed validation)`);
        }
      }
      if (patternMatches > 0) {
        console.log(`Pattern found ${patternMatches} matches`);
      }
    }
    
    const names = Array.from(detectedNames);
    console.log('All detected participants:', names);
    
    if (names.length >= 2) {
      console.log('Direct pattern matching found participants:', names[0], 'and', names[1]);
      return { me: names[0], them: names[1] };
    } else if (names.length === 1) {
      console.log('Found one participant:', names[0], 'using generic name for second');
      return { me: names[0], them: 'Contact' };
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

// Function to analyze WhatsApp screenshots using Claude's vision capabilities
export async function analyzeImageWithClaude(base64Image: string, userInstruction: string): Promise<string> {
  try {
    console.log('Starting Claude vision analysis for WhatsApp screenshot');
    
    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      throw new Error('Invalid Anthropic API key format');
    }
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    // Remove data URL prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      temperature: 0.1,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: userInstruction
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: cleanBase64
            }
          }
        ]
      }]
    });

    const content = getTextFromContentBlock(response.content);
    console.log('Claude vision analysis completed successfully');
    
    return content;
  } catch (error: any) {
    console.error('Claude vision analysis error:', error);
    throw new Error(`Vision analysis failed: ${error.message}`);
  }
}