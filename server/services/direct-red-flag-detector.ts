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
  // Guilt-tripping - very specific patterns to avoid false positives
  {
    pattern: /(shouldn['']t have to tell you that|too busy for me when I need|guess you['']re too busy to|you didn['']t even notice when I|you just don['']t care about me|i guess you just don['']t care|you should already know how|if you really cared you would have|after all I('ve| have) done for you and|can['']t believe you would do this to me|you never appreciate what I|don['']t even care that I)/i,
    type: 'Guilt Tripping',
    description: 'Using guilt to control or manipulate the other person',
    severity: 7
  },
  // Stonewalling - with improved pattern detection
  {
    pattern: /(not talking|done talking|whatever\.|forget it\.|not discussing this|silent treatment|shutting down completely|ignoring you|stop talking about this|i['']m done\.|talk to the hand|end of discussion|not having this conversation|walk away|leaving now)/i,
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
  // All-or-nothing statements (very specific to avoid flagging supportive language)
  {
    pattern: /(you never listen|you always do this|you don['']t care at all|everything is ruined|nothing ever changes|not once have you helped|every single time you)/i,
    type: 'All-or-Nothing Thinking',
    description: 'Using absolutes to exaggerate situations',
    severity: 5
  },
  // Emotional manipulation - refined to avoid flagging genuine expressions of care or being overwhelmed
  {
    pattern: /(if you really loved me|show me you mean it|just empty words|if you loved me|prove it|leave you if|without me you|no one else would|look what you made me do|guilt you|you owe me|after everything i did|you should feel bad)/i,
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
  },
  // Passivity - refined to distinguish neutral awareness from dismissive patterns
  {
    pattern: /(it['']s not a big deal|I didn['']t think it mattered|you['']re overreacting|it['']s not that important|I don['']t see why|you['']re being too sensitive|how was I supposed to know|you never said it was important|I can['']t read your mind|that['']s not my fault|not my problem|you['']re making too much of this)/i,
    type: 'Passivity',
    description: 'Avoiding responsibility or minimizing impact of actions',
    severity: 6
  },
  // Custody Violations - failure to return child as expected
  {
    pattern: /(bring.*back|bring.*home|return.*child|where.*is.*child|child.*not.*returned|police.*looking|missing.*child|hasn['']t.*been.*returned|didn['']t.*return|failed.*to.*return)/i,
    type: 'Custody Violation',
    description: 'Failure to return child as expected or agreed',
    severity: 10
  },
  // Actual Child Welfare Violations (not protective responses)
  {
    pattern: /(taking.*child.*without.*permission|keeping.*child.*from|hiding.*child|child.*as.*weapon|child.*as.*leverage|punish.*through.*child|hurt.*child.*to.*hurt)/i,
    type: 'Child Welfare Violations',
    description: 'Using or endangering a child to control or manipulate the other parent',
    severity: 10
  },
  // Actual Legal Threats (not factual reporting)
  {
    pattern: /(i['']ll take you to court|you['']ll lose custody|i['']ll make sure you never see|i['']ll report you to|i['']ll call social services on you|you['']ll be sorry when the court|i['']ll destroy you in court|you won['']t win in court)/i,
    type: 'Legal Intimidation',
    description: 'Using legal threats to control or intimidate',
    severity: 9
  },
  // Medical Withholding (not safety reminders)
  {
    pattern: /(i['']m not giving.*medication|you can['']t have.*medication|withholding.*medicine|refusing.*treatment|i won['']t let.*see.*doctor|no medication until)/i,
    type: 'Medical Control',
    description: 'Deliberately withholding essential medical care or medication',
    severity: 10
  },
  // Child as Weapon (actual manipulation, not protective concern)
  {
    pattern: /(using.*child.*to.*hurt|child.*as.*weapon|punish.*you.*through.*child|hurt.*you.*by.*taking|make.*you.*suffer.*through.*child|child.*will.*hate.*you|turn.*child.*against)/i,
    type: 'Child as Weapon',
    description: 'Deliberately using the child to hurt or manipulate the other parent',
    severity: 10
  },
  // Threatening Escalation (not factual reporting)
  {
    pattern: /(i['']ll escalate this|things will escalate|you['']ll be sorry|this will get worse|i['']ll make this worse|you forced me to escalate|now you['']ve done it)/i,
    type: 'Threatening Escalation',
    description: 'Threatening to make situations worse as intimidation',
    severity: 8
  },
  // Self-harm threats (extremely serious)
  {
    pattern: /(i['']ll hurt myself|hurt myself if|kill myself if|end it all if|take my own life|do something to myself|harm myself if|won['']t be here if|you['']ll regret it when i['']m gone|find me dead)/i,
    type: 'Self-harm Threats',
    description: 'Threatening self-harm to control or manipulate behavior',
    severity: 10
  },
  // Suicide threats or references
  {
    pattern: /(commit suicide|kill myself|end my life|take my life|you['']ll be sorry when i['']m dead|won['']t be alive|better off dead|world without me)/i,
    type: 'Suicide Threats',
    description: 'Making threats or references to suicide',
    severity: 10
  },
  // Self-harm manipulation
  {
    pattern: /(cutting myself|overdose|pills|jump off|crash the car|hurt myself because|self-harm|self harm|cutting because of you)/i,
    type: 'Self-harm Manipulation',
    description: 'Using specific self-harm methods to control or manipulate',
    severity: 10
  }
];

/**
 * Detect red flags directly from conversation text
 */
export function detectRedFlagsDirectly(conversation: string, healthScore?: number): RedFlag[] {
  console.log(`DIRECT RED FLAG DETECTION: Starting with health score ${healthScore}`);
  console.log(`DIRECT RED FLAG DETECTION: Conversation length ${conversation?.length} chars`);
  
  // If no conversation, return empty array
  if (!conversation) {
    console.log('DIRECT RED FLAG DETECTION: No conversation provided');
    return [];
  }
  
  // If health score is provided and conversation is healthy (85+), skip red flag detection
  if (healthScore && healthScore >= 85) {
    console.log(`Skipping red flag detection for healthy conversation (health score: ${healthScore})`);
    return [];
  }
  
  const lines = conversation.split('\n');
  const redFlags: RedFlag[] = [];
  const foundPatterns = new Set<string>(); // To avoid duplicate flag types
  
  // Context tracking
  const cancellationMentions = new Set<string>();
  const allMessages: {speaker: string, text: string}[] = [];
  const nuancedLanguage = new Set<string>(); // Track speakers who use nuanced language
  
  // Extract all messages first for context analysis
  lines.forEach(line => {
    // Handle WhatsApp format: "DD/MM/YYYY, HH:MM - Speaker: Message"
    const whatsAppMatch = line.match(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2} - ([^:]+): (.+)$/);
    
    let speakerName: string;
    let messageText: string;
    
    if (whatsAppMatch) {
      // WhatsApp format
      speakerName = whatsAppMatch[1].trim();
      messageText = whatsAppMatch[2].trim();
    } else if (line.includes(':')) {
      // Simple format: "Speaker: Message"
      const [speaker, message] = line.split(':', 2);
      if (!speaker || !message) return;
      speakerName = speaker.trim();
      messageText = message.trim();
    } else {
      return; // Skip lines that don't match expected formats
    }
    
    allMessages.push({speaker: speakerName, text: messageText});
    
    // Track mentions of cancellations
    if (messageText.toLowerCase().includes('cancel') || 
        messageText.toLowerCase().includes('missed') || 
        messageText.toLowerCase().includes('didn\'t show')) {
      cancellationMentions.add(speakerName);
    }
    
    // Track nuanced language that indicates non-absolutist thinking
    if (messageText.match(/(a little|felt like|maybe|try again|i felt|i was hoping|seems like)/i)) {
      nuancedLanguage.add(speakerName);
    }
  });
  
  // More robust detection of healthy conversation patterns
  
  // Check for resolution of cancellation issues
  const cancellationResolved = allMessages.some(msg => 
    msg.text.match(/(sorry|apologize|make it up|next time|reschedule)/i) &&
    cancellationMentions.size <= 2 // Allow up to two people to mention cancellation in a resolved way
  );
  
  // Only skip detection if health score indicates genuinely healthy conversation (85+)
  const isHealthyConversation = false; // Rely solely on health score, not pattern matching
  const isAppreciationConversation = false; // Rely solely on health score, not pattern matching
  
  // Process each message with context awareness
  allMessages.forEach(({speaker: speakerName, text: messageText}) => {
    // Check for red flag patterns with context awareness
    redFlagPatterns.forEach(pattern => {
      if (pattern.pattern.test(messageText) && !foundPatterns.has(pattern.type)) {
        // Apply error detection logic to prevent false positives
        let isValidFlag = true;
        
        // RULE 0: Skip all red flags for conversations that are clearly healthy
        // EXCEPT for critical safety issues that override healthy classification
        const isCriticalSafetyFlag = pattern.severity >= 9 || 
          pattern.type === 'Child Welfare Threats' || 
          pattern.type === 'Medical Control' || 
          pattern.type === 'Legal Intimidation';
        
        if ((isHealthyConversation || isAppreciationConversation) && !isCriticalSafetyFlag) {
          // This is a demonstrably healthy conversation, no red flags needed (except critical safety)
          console.log(`Skipping red flag for healthy conversation: "${messageText}"`);
          isValidFlag = false;
        } else if (isCriticalSafetyFlag) {
          console.log(`CRITICAL SAFETY FLAG DETECTED - overriding healthy conversation filter: "${pattern.type}"`);
        }
        
        // RULE 0.5: Never flag clearly supportive statements (applies regardless of conversation health)
        if (messageText.match(/(always here for you|i'm always here|of course|i'd love that|happy to help|glad I could help|here for you|made a difference|appreciate|thank you|grateful)/i)) {
          console.log(`Preventing false positive: "${messageText}" is clearly supportive`);
          isValidFlag = false;
        } 
        
        // If flag is still valid, apply specific rules
        if (isValidFlag) {
          // RULE 1: Prevent false positives for All-or-Nothing Thinking
          if (pattern.type === 'All-or-Nothing Thinking' && nuancedLanguage.has(speakerName)) {
            // Skip if this speaker uses nuanced language elsewhere in the conversation
            isValidFlag = false;
          }
          
          // RULE 2: Prevent false positives for Cancellation Patterns
          if ((messageText.toLowerCase().includes('cancel') || messageText.toLowerCase().includes('missed')) && 
              cancellationResolved && 
              cancellationMentions.size <= 2) {
            // Skip if this is a cancellation that was resolved
            isValidFlag = false;
          }
          
          // RULE 3: Prevent false positives for Stonewalling/Emotional Withdrawal
          if (pattern.type === 'Emotional Withdrawal') {
            // Check if this speaker continues to engage in the conversation after this message
            const speakerIndex = allMessages.findIndex(msg => msg.speaker === speakerName && msg.text === messageText);
            const laterMessages = allMessages.slice(speakerIndex + 1);
            
            // Count how many more times this speaker responds after the potential stonewalling message
            const laterResponses = laterMessages.filter(msg => msg.speaker === speakerName);
            const continuesResponding = laterResponses.length > 0;
            
            console.log(`Checking stonewalling for "${messageText}" by ${speakerName}: continues responding? ${continuesResponding} (${laterResponses.length} later messages)`);
            
            // If they continue responding, this isn't true stonewalling
            if (continuesResponding) {
              console.log(`Preventing stonewalling false positive: ${speakerName} continues conversation after "${messageText}"`);
              isValidFlag = false;
            }
            
            // Also check if the message actually indicates disengagement rather than just expressing frustration
            const isExpressionOfFrustration = messageText.match(/(don't have the energy|exhausting|tired of explaining)/i);
            const isStillEngaging = messageText.match(/(not trying to|want us to|understand each other)/i);
            
            if (isExpressionOfFrustration && !messageText.match(/(not talking|done talking|whatever\.|forget it\.)/i)) {
              console.log(`Preventing stonewalling false positive: "${messageText}" expresses frustration but not disengagement`);
              isValidFlag = false;
            }
            
            if (isStillEngaging) {
              console.log(`Preventing stonewalling false positive: "${messageText}" shows continuing engagement`);
              isValidFlag = false;
            }
          }
          
          // RULE 4: Prevent false positives for Emotional Manipulation
          if (pattern.type === 'Emotional Manipulation') {
            // Check if this is a genuine expression of being overwhelmed or caring
            const isReassurance = messageText.match(/(I care about you|I'm just overwhelmed|I didn't mean to upset you|I'm trying my best)/i);
            const isFollowedByEmotionalLeverage = messageText.match(/(but you|if you|you should|you need to|you always|you never)/i);
            
            // If it's a reassurance without emotional leverage, it's not manipulation
            if (isReassurance && !isFollowedByEmotionalLeverage) {
              console.log(`Preventing emotional manipulation false positive: "${messageText}" is reassurance without leverage`);
              isValidFlag = false;
            }
            
            // Check if it's part of a reconciliation attempt
            const isReconciliationAttempt = messageText.match(/(I'm sorry|let's talk|can we|we can work|I understand)/i);
            if (isReconciliationAttempt && !messageText.match(/(if you|unless you|you need to prove)/i)) {
              console.log(`Preventing emotional manipulation false positive: "${messageText}" is a reconciliation attempt`);
              isValidFlag = false;
            }
            
            // Special case for "I care about you" - this needs context to be manipulative
            if (messageText.match(/I care about you/i) && !messageText.match(/(if you|but you|you should|after all I've done)/i)) {
              console.log(`Preventing emotional manipulation false positive: "I care about you" without manipulation context`);
              isValidFlag = false;
            }
          }
          
          // RULE 5: Prevent false positives for Guilt Tripping - distinguish genuine appreciation from manipulation
          if (pattern.type === 'Guilt Tripping') {
            // Check if this is a supportive response
            const isSupportiveResponse = messageText.match(/(of course|always here for you|happy to help|glad I could|you're welcome|i'd love that|that means a lot)/i);
            
            // Check if this is genuine appreciation without manipulation
            const isGenuineAppreciation = messageText.match(/(really appreciated|thank you|made a difference|means a lot|grateful for)/i);
            const hasManipulativeContext = messageText.match(/(but you|if you|you should|you never|you always|after all I|you owe me)/i);
            
            // Check if the conversation contains reciprocal positive responses
            const hasPositiveReciprocity = allMessages.some(msg => 
              msg.text.match(/(of course|always here|happy to|glad I could|you're welcome|love that|i'd love)/i)
            );
            
            // Never flag supportive responses as guilt tripping
            if (isSupportiveResponse) {
              console.log(`Preventing guilt tripping false positive: "${messageText}" is a supportive response`);
              isValidFlag = false;
            }
            // If it's genuine appreciation without manipulative context and there's positive reciprocity, don't flag
            else if (isGenuineAppreciation && !hasManipulativeContext && hasPositiveReciprocity) {
              console.log(`Preventing guilt tripping false positive: "${messageText}" is genuine appreciation with positive reciprocity`);
              isValidFlag = false;
            }
          }
          
          // RULE 6: Prevent false positives for protective parenting responses
          if (pattern.type === 'Custody Violation' || pattern.type === 'Legal Intimidation' || pattern.type === 'Crisis Escalation') {
            // Check if this is a protective response to someone else's concerning behavior
            const isProtectiveResponse = messageText.match(/(police.*looking|bring.*back|return.*child|where.*is|epipen|medical.*needs|safety|welfare)/i);
            const isFactualReporting = messageText.match(/(the police are|they are looking|feel free to update|if you don't want to update me)/i);
            
            // Check if this speaker is responding to concerning behavior (lack of communication/return)
            const otherSpeakerMessages = allMessages.filter(msg => msg.speaker !== speakerName);
            const hasLimitedResponse = otherSpeakerMessages.length < 3; // Very few responses from the other party
            const hasEvasiveResponses = otherSpeakerMessages.some(msg => 
              msg.text.match(/(busy|can't talk|later|not now|gtg|gotta go)/i) && msg.text.length < 50
            );
            
            // If this is a protective/factual response to concerning behavior, don't flag it
            if ((isProtectiveResponse || isFactualReporting) && (hasLimitedResponse || hasEvasiveResponses)) {
              console.log(`Preventing false positive for protective parenting: "${messageText}" is appropriate response to concerning behavior`);
              isValidFlag = false;
            }
          }
          
          // RULE 7: Prevent false positives for Passivity - distinguish neutral awareness from dismissive patterns
          if (pattern.type === 'Passivity') {
            // Neutral awareness statements that should NOT be flagged as passivity
            const isNeutralAwareness = messageText.match(/(I didn['']t realize|didn['']t know|you should['']ve told me|wish you had told me|would have|if I had known)/i);
            
            // Check if it's followed by dismissive language or repeated behavior pattern
            const isDismissive = messageText.match(/(but it['']s not|not a big deal|you['']re overreacting|too sensitive|making too much)/i);
            
            // Check for patterns of avoiding responsibility (multiple indicators)
            const responsibilityAvoidance = messageText.match(/(not my fault|not my problem|how was I supposed|can['']t read your mind)/i);
            
            // Check for minimizing impact
            const minimizingImpact = messageText.match(/(it['']s not that important|I don['']t see why|not a big deal|you['']re making too much)/i);
            
            // Only flag if there's a clear pattern of avoiding responsibility or minimizing impact
            // Do NOT flag neutral awareness statements unless they're combined with dismissive language
            if (isNeutralAwareness && !isDismissive && !responsibilityAvoidance && !minimizingImpact) {
              console.log(`Preventing passivity false positive: "${messageText}" is neutral awareness, not dismissive`);
              isValidFlag = false;
            }
            
            // Also check if the message shows willingness to improve or understand
            const showsWillingness = messageText.match(/(next time|in future|will try|want to understand|help me understand)/i);
            if (showsWillingness) {
              console.log(`Preventing passivity false positive: "${messageText}" shows willingness to improve`);
              isValidFlag = false;
            }
          }
        }
        
        // If the flag passes our error detection rules, add it
        if (isValidFlag) {
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
  
  // Check health score - if conversation is healthy (85+), don't add any red flags
  const healthScore = enhancedAnalysis.healthScore?.score || 0;
  if (healthScore >= 85) {
    console.log(`Skipping red flag detection for healthy conversation (health score: ${healthScore})`);
    return enhancedAnalysis;
  }
  
  // Detect red flags directly from conversation
  const directRedFlags = detectRedFlagsDirectly(conversation, healthScore);
  
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