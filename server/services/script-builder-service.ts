import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface ScriptResponse {
  firm: string;
  neutral: string;
  empathic: string;
  situationAnalysis: string;
}

export async function generateConversationScripts(
  situation: string, 
  message: string, 
  tier: string = 'free'
): Promise<ScriptResponse> {
  
  // Check if API key is available
  if (!process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-')) {
    // Return mock response for development
    return generateMockScripts(situation, message);
  }

  try {
    const prompt = `You are a communication expert helping someone prepare for a difficult conversation. 

SITUATION: ${situation}

WHAT THEY WANT TO SAY: ${message}

Please provide:

1. SITUATION ANALYSIS: A brief analysis of the communication challenge and key considerations (2-3 sentences)

2. THREE SCRIPT OPTIONS in different tones:

**FIRM & DIRECT**: A clear, assertive script that sets boundaries and communicates the message directly without being aggressive. Use "I" statements and be specific about expectations.

**NEUTRAL & BALANCED**: A professional, objective approach that presents the issue calmly and seeks constructive dialogue. Focus on facts and solutions.

**EMPATHIC & UNDERSTANDING**: A compassionate approach that acknowledges the other person's perspective while still maintaining your position. Show understanding but don't compromise your needs.

Each script should be 2-4 sentences long and ready to use in conversation. Make them natural and conversational, not formal or scripted-sounding.

Format your response as JSON:
{
  "situationAnalysis": "Your analysis here",
  "firm": "Your firm script here",
  "neutral": "Your neutral script here", 
  "empathic": "Your empathic script here"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from AI');
    }

    // Parse the JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    
    // Validate the response has all required fields
    if (!parsedResponse.situationAnalysis || !parsedResponse.firm || 
        !parsedResponse.neutral || !parsedResponse.empathic) {
      throw new Error('Incomplete response from AI');
    }

    return {
      situationAnalysis: parsedResponse.situationAnalysis.trim(),
      firm: parsedResponse.firm.trim(),
      neutral: parsedResponse.neutral.trim(),
      empathic: parsedResponse.empathic.trim()
    };

  } catch (error) {
    console.error('Error generating scripts with Anthropic:', error);
    
    // Fallback to basic script generation
    return generateBasicScripts(situation, message);
  }
}

function generateMockScripts(situation: string, message: string): ScriptResponse {
  const situationWords = situation.toLowerCase();
  const messageWords = message.toLowerCase();
  
  // Determine context-aware responses
  const isWorkRelated = situationWords.includes('work') || situationWords.includes('colleague') || 
                       situationWords.includes('boss') || situationWords.includes('job');
  const isRelationship = situationWords.includes('partner') || situationWords.includes('relationship') ||
                        situationWords.includes('spouse') || situationWords.includes('dating');
  const isFamilyRelated = situationWords.includes('family') || situationWords.includes('parent') ||
                         situationWords.includes('sibling') || situationWords.includes('mother') ||
                         situationWords.includes('father');

  let context = 'personal';
  if (isWorkRelated) context = 'professional';
  else if (isRelationship) context = 'relationship';
  else if (isFamilyRelated) context = 'family';

  return {
    situationAnalysis: `This appears to be a ${context} communication challenge that requires clear, respectful dialogue. The key is balancing assertiveness with empathy to achieve understanding.`,
    firm: `I need to be direct about this. ${message.replace(/^I\s+/i, '')}. This is important to me and I need you to understand my position on this matter.`,
    neutral: `I'd like to discuss something with you. ${message}. I think it would be helpful if we could find a way to address this together.`,
    empathic: `I understand this might be difficult to hear, but I care about our ${context === 'professional' ? 'working relationship' : 'relationship'} and need to share something. ${message}. I hope we can work through this together.`
  };
}

function generateBasicScripts(situation: string, message: string): ScriptResponse {
  // Simple template-based fallback
  return {
    situationAnalysis: "This conversation requires careful communication to ensure your message is heard while maintaining a positive relationship.",
    firm: `I need to be clear about something. ${message}. This is important to me and I need you to respect this boundary going forward.`,
    neutral: `I wanted to talk to you about something. ${message}. I think it would be good for us to discuss how we can handle this better.`,
    empathic: `I know this might be hard to hear, but I value our relationship and need to share something. ${message}. I'm hoping we can understand each other better.`
  };
}