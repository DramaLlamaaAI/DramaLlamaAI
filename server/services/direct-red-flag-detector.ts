/**
 * Direct Red Flag Detector
 * 
 * This service detects red flags directly from conversation text, serving as a backup
 * when the AI model doesn't detect them. It looks for common patterns of manipulative,
 * abusive or unhealthy communication.
 */

interface RedFlag {
  type: string;
  description: string;
  severity: number;
  examples?: any[];
  participant?: string;
}

/**
 * Patterns for detecting specific types of red flags
 */
const redFlagPatterns = [
  // Guilt-tripping
  {
    pattern: /(shouldn['']t have to|too busy for me|make me feel|always .* for you|guess you['']re too)/i,
    type: 'Emotional Manipulation',
    description: 'Using guilt to control or manipulate the other person',
    severity: 7
  },
  // Stonewalling
  {
    pattern: /(not talking|done talking|whatever|forget it|not discussing this|don['']t want to talk)/i,
    type: 'Stonewalling',
    description: 'Refusing to communicate or engage in discussion',
    severity: 6
  },
  // Blame-shifting
  {
    pattern: /(blame me|always my fault|make me the problem|always my problem)/i,
    type: 'Blame Shifting',
    description: 'Avoiding responsibility by blaming the other person',
    severity: 7
  },
  // All-or-nothing statements
  {
    pattern: /(always|never|nothing ever|everything is)/i,
    type: 'All-or-Nothing Thinking',
    description: 'Using absolutes to exaggerate situations',
    severity: 5
  },
  // Love bombing or controlling withdrawal of affection
  {
    pattern: /(care more than you|care about you|love you more)/i,
    type: 'Affection Manipulation',
    description: 'Manipulating through withdrawal or excessive affection claims',
    severity: 6
  },
  // Gaslighting
  {
    pattern: /(that['']s not true|didn['']t happen|making things up|imagining things|being dramatic)/i,
    type: 'Gaslighting',
    description: 'Making someone question their own reality or experiences',
    severity: 8
  }
];

/**
 * Detect red flags directly from conversation text
 */
export function detectRedFlagsDirectly(conversation: string): RedFlag[] {
  // If no conversation, return empty array
  if (!conversation) {
    return [];
  }
  
  const lines = conversation.split('\n');
  const redFlags: RedFlag[] = [];
  const foundPatterns = new Set<string>(); // To avoid duplicate flag types
  
  // Process each line
  lines.forEach(line => {
    // Skip empty lines or non-dialogue lines
    if (!line.includes(':')) return;
    
    // Extract speaker and message
    const [speaker, message] = line.split(':', 2);
    if (!speaker || !message) return;
    
    const speakerName = speaker.trim();
    const messageText = message.trim();
    
    // Check for red flag patterns
    redFlagPatterns.forEach(pattern => {
      if (pattern.pattern.test(messageText) && !foundPatterns.has(pattern.type)) {
        foundPatterns.add(pattern.type);
        
        redFlags.push({
          type: pattern.type,
          description: pattern.description,
          severity: pattern.severity,
          examples: [{
            text: messageText,
            from: speakerName
          }],
          participant: speakerName
        });
      }
    });
  });
  
  return redFlags;
}

/**
 * Enhance analysis with directly detected red flags
 */
export function enhanceWithDirectRedFlags(analysis: any, conversation: string): any {
  // Create deep copy of the analysis to avoid mutations
  const enhancedAnalysis = JSON.parse(JSON.stringify(analysis));
  
  // Detect red flags directly from conversation
  const directRedFlags = detectRedFlagsDirectly(conversation);
  
  // If we have directly detected red flags
  if (directRedFlags.length > 0) {
    // If no red flags were detected by the AI, add our directly detected ones
    if (!enhancedAnalysis.redFlags || enhancedAnalysis.redFlags.length === 0) {
      enhancedAnalysis.redFlags = directRedFlags;
    } 
    // Otherwise merge with existing red flags (avoiding duplicates)
    else {
      const existingTypes = new Set(enhancedAnalysis.redFlags.map((flag: any) => flag.type));
      
      directRedFlags.forEach(flag => {
        if (!existingTypes.has(flag.type)) {
          enhancedAnalysis.redFlags.push(flag);
          existingTypes.add(flag.type);
        }
      });
    }
    
    // Add red flag count
    enhancedAnalysis.redFlagsCount = enhancedAnalysis.redFlags.length;
    
    // Set detected flag
    enhancedAnalysis.redFlagsDetected = true;
  }
  
  return enhancedAnalysis;
}