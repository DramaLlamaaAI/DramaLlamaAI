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
    pattern: /(shouldn['']t have to|too busy for me|make me feel|always .* for you|guess you['']re too|you didn['']t even notice|you just don['']t care|i guess you just|you should already|if you really cared|after all I('ve| have) done|can['']t believe you would)/i,
    type: 'Guilt Tripping',
    description: 'Using guilt to control or manipulate the other person',
    severity: 7
  },
  // Stonewalling
  {
    pattern: /(not talking|done talking|whatever|forget it|not discussing this|don['']t want to talk|tired of explaining|feels pointless|i don['']t know anymore|silent treatment|shutting down|ignoring your|stop talking)/i,
    type: 'Emotional Withdrawal',
    description: 'Refusing to communicate or engage in discussion',
    severity: 6
  },
  // Blame-shifting
  {
    pattern: /(blame me|always my fault|make me the problem|always my problem|always your excuse|i['']m the only one|nothing changes|you made me|because of you|wouldn['']t have to if you|this is on you|your fault)/i,
    type: 'Blame Shifting',
    description: 'Avoiding responsibility by blaming the other person',
    severity: 7
  },
  // All-or-nothing statements
  {
    pattern: /(always|never|nothing ever|everything is|you never|you always|every single time|not once have you|absolutely nothing)/i,
    type: 'All-or-Nothing Thinking',
    description: 'Using absolutes to exaggerate situations',
    severity: 5
  },
  // Emotional manipulation
  {
    pattern: /(care more than you|care about you|love you more|show me you mean|just with words|if you loved me|prove it|leave you if|without me you|no one else would|look what you made me do)/i,
    type: 'Emotional Manipulation',
    description: 'Manipulating through emotional pressure, threats or excessive affection claims',
    severity: 8
  },
  // Gaslighting
  {
    pattern: /(that['']s not true|didn['']t happen|making things up|imagining things|being dramatic|making me feel crazy|like i['']m crazy|you['']re overreacting|you['']re too sensitive|that['']s not what I said|not what happened|misunderstood)/i,
    type: 'Gaslighting',
    description: 'Making someone question their own reality or experiences',
    severity: 8
  },
  // Victim mentality
  {
    pattern: /(i['']m invisible|nobody listens|nobody understands|always left out|never heard|always ignored|like i['']m invisible|everyone is against me|no one cares about|why does this always happen to me|trying my best but)/i,
    type: 'Victim Mentality',
    description: 'Constantly positioning oneself as a victim to gain sympathy or control',
    severity: 6
  },
  // Moving the goalposts
  {
    pattern: /(never enough|not good enough|do better|try harder|should already know|keep having to tell you|not what I wanted|still not right|that['']s not the point|missed the point|more than that)/i,
    type: 'Moving the Goalposts',
    description: 'Continuously changing expectations making it impossible to satisfy demands',
    severity: 7
  },
  // Love bombing
  {
    pattern: /(never loved anyone like|perfect for me|soulmate|destiny|meant to be|never felt this way|changed my life|complete me|no one compares|only you understand)/i,
    type: 'Love Bombing',
    description: 'Overwhelming affection used to manipulate or control',
    severity: 6
  },
  // Dismissive or invalidating
  {
    pattern: /(get over it|not a big deal|so dramatic|making a scene|calm down|overreacting|too sensitive|too emotional|it['']s just a joke|can['']t take a joke|why are you upset)/i,
    type: 'Dismissing/Invalidating',
    description: 'Minimizing or invalidating the other person\'s feelings or concerns',
    severity: 6
  },
  // Dominance/Control
  {
    pattern: /(do what I say|because I said so|my way or|in charge|not allowed to|permission|need to listen|disobey|do as I say|follow my rules|my house my rules)/i,
    type: 'Dominance/Control',
    description: 'Using commanding or controlling language to assert power',
    severity: 7
  },
  // Catastrophizing
  {
    pattern: /(everything is ruined|end of the world|disaster|never recover|worst thing|completely destroyed|ruined everything|can['']t bear it|nothing will ever|life is over)/i,
    type: 'Catastrophizing',
    description: 'Assuming worst-case scenarios and escalating minor issues',
    severity: 5
  },
  // Passive aggression
  {
    pattern: /(fine whatever|suit yourself|have it your way|if that['']s what you want|obviously you know best|must be nice|sure you are|not like I care|clearly I don['']t matter)/i,
    type: 'Passive Aggression',
    description: 'Indirect hostility or resistance disguised as compliance',
    severity: 6
  },
  // Emotional blackmail
  {
    pattern: /(if you don['']t|won['']t be responsible for|can['']t be with you if|have to choose|leave you if|won['']t love you if|make me do something|see what happens if)/i,
    type: 'Emotional Blackmail',
    description: 'Using threats or pressure to control another person\'s behavior',
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