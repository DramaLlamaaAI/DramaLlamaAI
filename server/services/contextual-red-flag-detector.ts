import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ContextualRedFlag {
  type: string;
  description: string;
  participant: string;
  severity: number;
  evidence: string[];
  context: string;
  isProtectiveResponse: boolean;
}

export interface ConversationAnalysis {
  summary: string;
  participants: string[];
  situationContext: string;
  concerningBehaviors: string[];
  protectiveResponses: string[];
  redFlags: ContextualRedFlag[];
}

/**
 * Analyze entire conversation with AI to understand context before flagging issues
 */
export async function analyzeConversationContext(
  conversationText: string,
  participants: string[]
): Promise<ConversationAnalysis> {
  try {
    const prompt = `You are an expert in analyzing interpersonal communication for concerning patterns. Analyze this entire conversation to understand the full context before identifying any red flags.

CONVERSATION PARTICIPANTS: ${participants.join(', ')}

CONVERSATION TEXT:
${conversationText}

Please provide a comprehensive analysis in the following JSON format:

{
  "summary": "Brief summary of what happened in this conversation",
  "participants": ["participant1", "participant2"],
  "situationContext": "What is the underlying situation or conflict?",
  "concerningBehaviors": [
    "List specific concerning behaviors, who did them, and why they're concerning"
  ],
  "protectiveResponses": [
    "List responses that are protective/appropriate reactions to concerning behavior"
  ],
  "redFlags": [
    {
      "type": "Type of concerning behavior",
      "description": "Detailed description of the issue",
      "participant": "Who is exhibiting the concerning behavior",
      "severity": 1-10,
      "evidence": ["Specific quotes or patterns that support this flag"],
      "context": "Why this is concerning in the context of the full conversation",
      "isProtectiveResponse": false
    }
  ]
}

IMPORTANT ANALYSIS GUIDELINES:
1. Consider the ENTIRE conversation flow and context
2. Distinguish between concerning behavior and appropriate protective responses
3. If someone fails to return a child or communicate about child welfare, that's a red flag
4. If someone responds with police involvement due to child safety concerns, that's protective, not a red flag
5. Look for patterns of evasion, control, manipulation, or child welfare violations
6. Don't flag protective parenting responses as threats
7. Consider who initiated concerning behavior vs who is responding to it`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    // Extract JSON from response
    let jsonText = content.text;
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const analysis = JSON.parse(jsonText) as ConversationAnalysis;
    
    console.log('CONTEXTUAL ANALYSIS COMPLETE:', {
      summary: analysis.summary,
      redFlagCount: analysis.redFlags.length,
      concerningBehaviors: analysis.concerningBehaviors.length,
      protectiveResponses: analysis.protectiveResponses.length
    });

    return analysis;

  } catch (error) {
    console.error('Error in contextual analysis:', error);
    // Fallback to empty analysis
    return {
      summary: 'Unable to analyze conversation context',
      participants,
      situationContext: 'Analysis failed',
      concerningBehaviors: [],
      protectiveResponses: [],
      redFlags: []
    };
  }
}

/**
 * Convert contextual red flags to the format expected by the rest of the system
 */
export function convertContextualFlags(contextualFlags: ContextualRedFlag[]): any[] {
  return contextualFlags
    .filter(flag => !flag.isProtectiveResponse)
    .map(flag => ({
      type: flag.type,
      description: flag.description,
      participant: flag.participant,
      severity: flag.severity,
      evidence: flag.evidence.join('; '),
      context: flag.context,
      quote: flag.evidence[0] || '',
      speaker: flag.participant
    }));
}