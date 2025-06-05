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

CRITICAL ANALYSIS GUIDELINES:
1. Analyze the COMPLETE conversation timeline to understand cause and effect
2. Identify WHO initiated concerning behavior vs WHO is responding protectively
3. RED FLAGS include: failing to return child, evasion about child welfare, manipulation, threats
4. PROTECTIVE RESPONSES include: police involvement for child safety, medical concerns (EpiPens), requesting child's return
5. Context matters: "I'll call the police" when child isn't returned = protective, not threatening
6. Look for patterns of control, manipulation, stonewalling, or child endangerment
7. Don't flag legitimate parental concerns or protective actions as red flags
8. Consider power dynamics and who has custody/responsibility`;

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