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
    // But be careful not to truncate valid content
    if (jsonContent.includes('{') && !isBalanced(jsonContent)) {
      console.log('Attempting to fix unbalanced JSON');
      // Only try to balance if the content is clearly incomplete
      // Don't balance if it looks like it just has content after the JSON
      if (jsonContent.lastIndexOf('}') < jsonContent.length - 50) {
        jsonContent = balanceJson(jsonContent);
      } else {
        // Try to find the actual end of the JSON object
        const lastBraceIndex = jsonContent.lastIndexOf('}');
        if (lastBraceIndex > 0) {
          jsonContent = jsonContent.substring(0, lastBraceIndex + 1);
        }
      }
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
        
        // Try comprehensive JSON reconstruction
        console.log('Attempting comprehensive JSON cleaning');
        
        // Step 1: Find the actual JSON boundaries more carefully
        const startIndex = jsonContent.indexOf('{');
        if (startIndex === -1) {
          throw new Error('No JSON object found in response');
        }
        
        // Step 2: Find the matching closing brace by counting brackets
        let braceCount = 0;
        let endIndex = -1;
        for (let i = startIndex; i < jsonContent.length; i++) {
          if (jsonContent[i] === '{') braceCount++;
          else if (jsonContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endIndex = i;
              break;
            }
          }
        }
        
        if (endIndex === -1) {
          // If we can't find the end, take everything and add closing braces
          endIndex = jsonContent.length - 1;
        }
        
        let extractedJson = jsonContent.substring(startIndex, endIndex + 1);
        
        // Step 3: Apply systematic cleaning
        extractedJson = extractedJson
          // First pass: fix escaping issues that break JSON structure
          .replace(/\\\"/g, '"') // Remove all escaped quotes first
          .replace(/\\\\/g, '\\') // Fix double backslashes
          
          // Second pass: re-escape quotes that should be escaped (inside string values)
          .replace(/"([^"]*)"(\s*:\s*)"([^"]*)"([^"]*)"([^"]*)"(\s*[,}])/g, 
                   '"$1"$2"$3\\"$4\\"$5"$6')
          
          // Third pass: structural fixes
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // Quote unquoted keys
          
          // Fourth pass: balance braces if needed
          .trim();
        
        // Ensure proper closing
        if (!extractedJson.endsWith('}')) {
          const openBraces = (extractedJson.match(/{/g) || []).length;
          const closeBraces = (extractedJson.match(/}/g) || []).length;
          for (let i = 0; i < openBraces - closeBraces; i++) {
            extractedJson += '}';
          }
        }
        
        console.log('Attempting to parse reconstructed JSON');
        console.log('JSON preview:', extractedJson.substring(0, 200) + '...');
        return JSON.parse(extractedJson);
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
          
          // Create a complete fallback analysis with all required sections
          return {
            toneAnalysis: {
              overallTone: tone,
              emotionalState: [
                { emotion: "concern", intensity: 0.8 },
                { emotion: "tension", intensity: 0.7 }
              ],
              participantTones: extractParticipantsFromContent(jsonContent) || { "Person 1": "Concerned", "Person 2": "Defensive" }
            },
            communication: {
              patterns: ["Communication pattern extracted from content"],
              suggestions: ["Improve communication clarity", "Express needs directly", "Listen actively"]
            },
            healthScore: extractHealthScoreFromContent(jsonContent) || { score: 40, label: "Mixed", color: "orange" },
            keyQuotes: [{ 
              speaker: "Participant", 
              quote: "Important quote from conversation", 
              analysis: "This quote shows a key dynamic in the interaction" 
            }],
            redFlags: [],
            powerDynamics: {
              overview: "Power appears somewhat imbalanced in this conversation",
              dominant: null,
              submissive: null,
              score: 55
            },
            conflictDynamics: {
              overview: "The conflict pattern shows moderate tension",
              escalationPatterns: [],
              deescalationAttempts: [],
              resolutionEfforts: []
            }
          };
        } else if (jsonContent.includes('"tone"')) {
          // For message analysis
          const toneMatch = jsonContent.match(/"tone"\s*:\s*"([^"]*)"/);
          return {
            tone: toneMatch ? toneMatch[1] : "Neutral tone with some concern",
            intent: ["Expressing concerns", "Seeking resolution", "Sharing perspective"],
            suggestions: ["Be clear about needs", "Listen actively", "Acknowledge feelings"]
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
 * Helper function to extract participant tones from partial content
 */
function extractParticipantsFromContent(content: string): Record<string, string> | null {
  // Try to extract participants and their tones from the content
  try {
    // Look for name patterns in the content
    const participantMatches = content.match(/"([^"]+)"\s*:\s*"([^"]+)"/g);
    if (participantMatches && participantMatches.length >= 2) {
      const participants: Record<string, string> = {};
      
      // Process each potential participant match
      participantMatches.forEach((match: string) => {
        const parts = match.match(/"([^"]+)"\s*:\s*"([^"]+)"/);
        if (parts && parts.length === 3) {
          const key = parts[1];
          const value = parts[2];
          
          // Only include if it looks like a participant name and tone
          if (key.length < 20 && !key.includes('.') && !key.includes('overall')) {
            participants[key] = value;
          }
        }
      });
      
      // Return if we found at least one participant
      if (Object.keys(participants).length > 0) {
        return participants;
      }
    }
    
    // Extract names directly from the conversation context
    const nameRegex = /([A-Z][a-z]+):/g;
    const allMatches = Array.from(content.matchAll(nameRegex));
    const uniqueNames = new Set<string>();
    allMatches.forEach(match => {
      uniqueNames.add(match[1]);
    });
    const names = Array.from(uniqueNames);
    
    if (names.length >= 2) {
      const result: Record<string, string> = {};
      names.forEach(name => {
        result[name] = "Tone extracted from context";
      });
      return result;
    }
    
    return null;
  } catch (error) {
    console.error("Error extracting participants:", error);
    return null;
  }
}

/**
 * Helper function to extract health score from partial content
 */
function extractHealthScoreFromContent(content: string): { score: number, label: string, color: string } | null {
  try {
    // Try to extract score from health score pattern
    const scoreMatch = content.match(/"score"\s*:\s*(\d+)/);
    if (scoreMatch && scoreMatch.length > 1) {
      const score = parseInt(scoreMatch[1], 10);
      
      // Determine label and color based on score
      let label = "Mixed";
      let color = "orange";
      
      if (score <= 20) {
        label = "Conflict";
        color = "red";
      } else if (score <= 40) {
        label = "Troubled";
        color = "red";
      } else if (score <= 60) {
        label = "Mixed";
        color = "orange";
      } else if (score <= 80) {
        label = "Good";
        color = "green";
      } else {
        label = "Very Healthy";
        color = "green";
      }
      
      return { score, label, color };
    }
    
    // Look for conflict-related terminology to estimate a score
    const conflictTerms = [
      "manipulation", "toxic", "gaslighting", "abusive", "concerning", 
      "conflict", "unhealthy", "troubling", "harmful"
    ];
    
    let conflictCount = 0;
    conflictTerms.forEach(term => {
      if (content.toLowerCase().includes(term)) {
        conflictCount++;
      }
    });
    
    if (conflictCount > 0) {
      // Estimate score based on conflict term count
      const score = Math.max(20, 60 - (conflictCount * 5));
      
      let label = "Mixed";
      let color = "orange";
      
      if (score <= 20) {
        label = "Conflict";
        color = "red";
      } else if (score <= 40) {
        label = "Troubled";
        color = "red";
      }
      
      return { score, label, color };
    }
    
    return null;
  } catch (error) {
    console.error("Error extracting health score:", error);
    return null;
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