/**
 * Helper functions for working with Anthropic API
 */

/**
 * Safely extract text content from Anthropic response
 */
export function getTextFromContentBlock(content: any): string {
  if (!content || !Array.isArray(content) || content.length === 0) {
    throw new Error('Empty response from Anthropic API');
  }
  
  const firstBlock = content[0];
  if (firstBlock.type !== 'text' || typeof firstBlock.text !== 'string') {
    throw new Error('Invalid response format from Anthropic API');
  }
  
  return firstBlock.text;
}

/**
 * Safely parse JSON from Anthropic response, handling cases where the content
 * might be wrapped in markdown code blocks
 */
export function parseAnthropicJson(content: string): any {
  try {
    // First, try to extract JSON from markdown code blocks if present
    let jsonContent = content;
    
    // Check if response is wrapped in markdown code block and extract it
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonContent = codeBlockMatch[1].trim();
      console.log('Extracted JSON from markdown code block');
    }
    
    return JSON.parse(jsonContent);
  } catch (parseError) {
    console.error('Failed to parse response as JSON:', content);
    throw new Error('Invalid response format from API. Please contact support at DramaLlamaConsultancy@gmail.com');
  }
}