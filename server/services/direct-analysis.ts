import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeWhatsAppScreenshot(base64Image: string) {
  try {
    console.log('Starting direct WhatsApp screenshot analysis with Claude Vision...');
    
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Please analyze this WhatsApp conversation screenshot. Extract all messages and identify who said what. 

For each message, provide:
1. The speaker (try to identify from the message position and name/contact)
2. The full message text
3. Whether it's sent (right side) or received (left side)

Be extremely accurate with attribution - this is critical for safety reasons. If you cannot clearly identify who said something, mark it as "unclear" rather than guessing.

Format your response as JSON:
{
  "conversation": [
    {
      "speaker": "Person Name or unclear",
      "message": "exact message text",
      "type": "sent" or "received",
      "timestamp": "if visible"
    }
  ],
  "participants": ["list of identified participants"],
  "confidence": "high/medium/low based on image clarity"
}`
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      }]
    });

    console.log('Claude Vision analysis completed successfully');
    
    const resultText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Try to parse JSON response
    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          analysis: analysis,
          rawResponse: resultText
        };
      } else {
        return {
          success: true,
          analysis: { error: 'Could not parse structured response' },
          rawResponse: resultText
        };
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      return {
        success: true,
        analysis: { error: 'Response format issue' },
        rawResponse: resultText
      };
    }

  } catch (error) {
    console.error('Claude Vision analysis failed:', error);
    throw new Error(`Screenshot analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}