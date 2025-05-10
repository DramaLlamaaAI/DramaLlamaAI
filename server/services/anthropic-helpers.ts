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
 * Extract red flags count from raw API response text
 * This avoids JSON parsing issues by using regex on the raw response
 */
export function extractRedFlagsCount(content: string): number {
  try {
    // Look for the redFlags array in the raw text
    const redFlagsSection = content.match(/redFlags["'\s:]+\[([\s\S]*?)\]/);
    
    if (redFlagsSection && redFlagsSection[1]) {
      // Count the number of "type" properties in the red flags section
      // Each red flag object has a type property
      const typeMatches = redFlagsSection[1].match(/type["'\s:]+/g);
      if (typeMatches) {
        return typeMatches.length;
      }
    }
    
    // As a backup check, look for severity fields which also indicate red flags
    const severityMatches = content.match(/severity["'\s:]+\d+/g);
    if (severityMatches) {
      return severityMatches.length;
    }
    
    // No red flags found
    return 0;
  } catch (error) {
    console.error('Error extracting red flags count:', error);
    return 0;
  }
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
      // Try a direct parse first
      try {
        return JSON.parse(jsonContent);
      } catch (error) {
        const initialParseError = error as Error;
        console.log('Initial parse failed:', initialParseError.message);
        
        // Check if this is the special case with the participant detection
        if (jsonContent.includes('"me":') && jsonContent.includes('"them":')) {
          const meMatch = jsonContent.match(/"me"\s*:\s*"([^"]*)"/);
          const themMatch = jsonContent.match(/"them"\s*:\s*"([^"]*)"/);
          
          if (meMatch && themMatch) {
            console.log('Detected participant data, using regex extraction');
            return {
              me: meMatch[1].trim(),
              them: themMatch[1].trim()
            };
          }
        }
        
        // Try with a more aggressive cleaning approach
        console.log('Attempting more aggressive JSON cleaning');
        
        // Replace problematic patterns that often cause issues
        jsonContent = jsonContent
          // Fix incorrectly escaped quotes
          .replace(/\\"/g, '"').replace(/"{2,}/g, '"')
          // Fix backslash escaping issues
          .replace(/([^\\])\\([^"\\])/g, '$1\\\\$2')
          // Fix quotes inside property values
          .replace(/"([^"]*)":\s*"([^"]*)"/g, (match, key, value) => {
            const fixedValue = value.replace(/"/g, '\\"');
            return `"${key}":"${fixedValue}"`;
          })
          // Fix possible line breaks in strings
          .replace(/"\s+"/g, ' ')
          // Remove potential comments
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
          // Fix potential trailing commas in objects and arrays
          .replace(/,(\s*[\]}])/g, '$1')
          // Fix missing commas between properties
          .replace(/}(\s*){/g, '},{')
          .replace(/"([^"]*)"(\s*)"/g, '"$1","')
          // Re-wrap the content in braces if stripped somehow
          .trim();
        
        if (!jsonContent.startsWith('{')) jsonContent = '{' + jsonContent;
        if (!jsonContent.endsWith('}')) jsonContent += '}';
        
        // Handle the specific common errors we're seeing in the logs
        jsonContent = jsonContent
          // Fix the common pattern where a quote is incorrectly escaped inside a string value
          .replace(/"([^"]+)\\"([^"]+)"/g, '"$1\\\\"$2"')
          // Fix specifically for participant detection
          .replace(/"me"\s*:\s*"([^"]*)\\",\s*\\"them"\s*:\s*"([^"]*)"/g, '"me":"$1","them":"$2"')
          // Fix the specific issue seen in current testing
          .replace(/"overallTone"\s*:\s*"([^"]*?)\\"/g, '"overallTone":"$1 "');
        
        return JSON.parse(jsonContent);
      }
    } catch (error) {
      const parseError = error as Error;
      console.log('Advanced parse failed:', parseError.message);
      
      // Last resort - try regex extraction for bare minimum chat analysis
      try {
        if (jsonContent.includes('"overallTone"')) {
          const toneMatch = jsonContent.match(/"overallTone"\s*:\s*"([^"]*)"/);
          const tone = toneMatch ? toneMatch[1] : "Unknown tone";
          
          console.log('Extracted tone via regex:', tone.substring(0, 30) + '...');
          
          // Create a minimal valid object that matches what the app expects
          // Instead of providing fallback data, throw an error to be handled by the controller
          throw new Error("Unable to extract complete analysis data");
        } else if (jsonContent.includes('"tone"')) {
          // For message analysis
          const toneMatch = jsonContent.match(/"tone"\s*:\s*"([^"]*)"/);
          return {
            tone: toneMatch ? toneMatch[1] : "Unable to analyze tone",
            intent: ["Analysis partially recovered"]
          };
        }
        
        throw new Error("Cannot extract meaningful data from response");
      } catch (finalError) {
        throw new Error("Invalid JSON format that could not be repaired automatically");
      }
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