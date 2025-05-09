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
 * might be wrapped in markdown code blocks or have other formatting issues
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
    
    // Sometimes Claude might cut off JSON mid-response, try to complete it
    // Find the last complete object by finding the last balanced brackets
    if (jsonContent.includes('{') && !isBalanced(jsonContent)) {
      console.log('Attempting to fix unbalanced JSON');
      jsonContent = balanceJson(jsonContent);
    }
    
    // Fix any other common JSON issues
    jsonContent = fixCommonJsonIssues(jsonContent);
    
    // Log the JSON content before parsing for debugging
    console.log('Preprocessed JSON content (first 100 chars):', jsonContent.substring(0, 100));
    
    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      const initialParseError = error as Error;
      console.log('Initial parse failed:', initialParseError.message);
      // Try with a more aggressive cleaning approach
      console.log('Attempting more aggressive JSON cleaning');
      
      // Replace problematic patterns that often cause issues
      jsonContent = jsonContent
        // Fix incorrectly escaped quotes
        .replace(/\\"/g, '"').replace(/"{2,}/g, '"')
        // Fix possible line breaks in strings
        .replace(/"\s+"/g, ' ')
        // Remove potential comments
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
        // Fix potential trailing commas in objects and arrays
        .replace(/,(\s*[\]}])/g, '$1')
        // Handle quotes inside strings by escaping them
        .replace(/"([^"]*)"|'([^']*)'|`([^`]*)`/g, (match) => {
          return match.replace(/"/g, '\\"');
        })
        // Re-wrap the content in braces if stripped somehow
        .trim();
      
      if (!jsonContent.startsWith('{')) jsonContent = '{' + jsonContent;
      if (!jsonContent.endsWith('}')) jsonContent += '}';
      
      return JSON.parse(jsonContent);
    }
  } catch (parseError) {
    console.error('Failed to parse response as JSON:', parseError);
    
    // Fallback to a more lenient JSON parsing approach
    try {
      // Use Function constructor as a last resort to evaluate JSON-like content
      // with more tolerance for format errors (trailing commas, etc.)
      const sanitizedContent = content
        .replace(/```(?:json)?/g, '') // Remove code block markers
        .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes with straight quotes
        .replace(/(\w+)(?=\s*:)/g, '"$1"') // Ensure property names are quoted
        .replace(/,\s*}/g, '}')           // Remove trailing commas
        .replace(/,\s*]/g, ']');          // Remove trailing commas in arrays
        
      console.log('Attempting to parse with sanitized content');
      return JSON.parse(sanitizedContent);
    } catch (fallbackError) {
      console.error('Fallback parsing also failed:', fallbackError);
      throw new Error('Invalid response format from API. Please contact support at DramaLlamaConsultancy@gmail.com');
    }
  }
}

/**
 * Check if a string has balanced brackets
 */
function isBalanced(str: string): boolean {
  const stack: string[] = [];
  const map: Record<string, string> = {
    '}': '{',
    ']': '[',
  };
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '{' || char === '[') {
      stack.push(char);
    } else if (char === '}' || char === ']') {
      if (stack.pop() !== map[char]) {
        return false;
      }
    }
  }
  
  return stack.length === 0;
}

/**
 * Attempt to balance an unbalanced JSON string
 */
function balanceJson(str: string): string {
  // Count opening and closing brackets
  let openBraces = 0;
  let closeBraces = 0;
  let openBrackets = 0;
  let closeBrackets = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '{') openBraces++;
    if (char === '}') closeBraces++;
    if (char === '[') openBrackets++;
    if (char === ']') closeBrackets++;
  }
  
  // Add missing closing braces or brackets
  let result = str;
  for (let i = 0; i < openBraces - closeBraces; i++) {
    result += '}';
  }
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    result += ']';
  }
  
  return result;
}

/**
 * Fix common JSON issues like trailing commas, unquoted properties, etc.
 */
function fixCommonJsonIssues(str: string): string {
  return str
    // Fix quotes inside quotes issues
    .replace(/"([^"]*)"(?:\s*:\s*)"([^"]*)"([^,}]*)/g, (match, key, value, rest) => {
      // Properly escape quotes inside string values
      const fixedValue = value.replace(/"/g, '\\"');
      return `"${key}": "${fixedValue}"${rest}`;
    })
    // Fix unescaped quotes within JSON strings
    .replace(/:\s*"([^"]*?)\\?"([^"]*?)\\?"([^"]*?)"/g, (match, before, middle, after) => {
      return `: "${before}\\\"${middle}\\\"${after}"`;
    })
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure property names are quoted
    .replace(/\n/g, ' ') // Remove newlines
    .replace(/\t/g, ' ') // Remove tabs
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/"""/g, '"\\"') // Fix triple quotes
    .replace(/(['"])([^'"]*)(["'])(?!\s*[,}\]:])(\s*[,}\]:])/g, '$1$2$3$4') // Fix missing commas
    .trim();
}