import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  AlertTriangle, 
  XCircle, 
  Share2, 
  Save, 
  HelpCircle,
  MessageSquareQuote
} from "lucide-react";

interface SelfReflectionProps {
  tier: string;
  me: string;
  them: string;
  conversation: string;
  keyQuotes?: Array<{
    speaker: string;
    quote: string;
    analysis: string;
    improvement?: string;
  }>;
}

interface CommunicationMetric {
  trait: string;
  value: number; // 0-100
  level: 'positive' | 'caution' | 'needs-work';
  emoji: string;
}

export function SelfReflection({ tier, me, them, conversation, keyQuotes }: SelfReflectionProps) {
  // Only show for personal and pro tiers
  if (tier !== 'personal' && tier !== 'pro' && tier !== 'instant') {
    return null;
  }
  
  const [reflectionNote, setReflectionNote] = useState<string>('');
  
  // Extract self-communication patterns
  const extractCommunicationPatterns = () => {
    const selfMessages = extractMessagesForSelf(conversation, me);
    
    const patterns = {
      empathy: analyzeEmpathy(selfMessages, conversation),
      defensiveness: analyzeDefensiveness(selfMessages),
      accountability: analyzeAccountability(selfMessages),
      curiosity: analyzeCuriosity(selfMessages),
      validation: analyzeValidation(selfMessages, them)
    };
    
    return patterns;
  };
  
  // Helper function to extract messages from a user
  const extractMessagesForSelf = (text: string, speaker: string): string[] => {
    // Look for patterns like "Speaker: message" or "[Time] Speaker: message"
    const lines = text.split('\n');
    const messages: string[] = [];
    
    for (const line of lines) {
      const timestampMatch = line.match(new RegExp(`\\[([^\\]]+)\\]\\s*${speaker}:\\s*(.+)`, 'i'));
      const simpleMatch = line.match(new RegExp(`^${speaker}:\\s*(.+)`, 'i'));
      
      if (timestampMatch) {
        messages.push(timestampMatch[2].trim());
      } else if (simpleMatch) {
        messages.push(simpleMatch[1].trim());
      }
    }
    
    return messages;
  };
  
  // Analyze for empathy in messages
  const analyzeEmpathy = (messages: string[], fullText: string): CommunicationMetric => {
    const empathyPatterns = [
      /understand/i, 
      /see how you feel/i, 
      /that must be/i, 
      /I can imagine/i,
      /you're feeling/i,
      /sounds like/i,
      /appreciate/i,
      /thank you for/i
    ];
    
    let count = 0;
    for (const message of messages) {
      for (const pattern of empathyPatterns) {
        if (pattern.test(message)) {
          count++;
          break; // Only count once per message
        }
      }
    }
    
    // Also check if the conversation as a whole demonstrates understanding
    const overallEmpathyScore = fullText.toLowerCase().includes('understand') ||
                               fullText.toLowerCase().includes('see your point') ? 10 : 0;
    
    // Scale from 0-100
    const value = Math.min(100, (count / Math.max(messages.length, 1)) * 100 + overallEmpathyScore);
    
    return {
      trait: 'Empathy',
      value,
      level: value >= 70 ? 'positive' : value >= 40 ? 'caution' : 'needs-work',
      emoji: '✅'
    };
  };
  
  // Analyze for defensiveness in messages
  const analyzeDefensiveness = (messages: string[]): CommunicationMetric => {
    const defensivePatterns = [
      /I didn't/i,
      /that's not/i,
      /you always/i,
      /not my fault/i,
      /you never/i,
      /but I/i,
      /you're the one/i,
      /whatever/i,
      /if you would just/i
    ];
    
    let count = 0;
    for (const message of messages) {
      for (const pattern of defensivePatterns) {
        if (pattern.test(message)) {
          count++;
          break; // Only count once per message
        }
      }
    }
    
    // For defensiveness, higher count means worse score
    const value = Math.min(100, (count / Math.max(messages.length, 1)) * 100);
    
    // Reverse the scale for defensiveness (higher value = more defensive = worse)
    return {
      trait: 'Defensiveness',
      value,
      level: value <= 30 ? 'positive' : value <= 60 ? 'caution' : 'needs-work',
      emoji: '⚠️'
    };
  };
  
  // Analyze for accountability in messages
  const analyzeAccountability = (messages: string[]): CommunicationMetric => {
    const accountabilityPatterns = [
      /I'm sorry/i,
      /my mistake/i,
      /I apologize/i,
      /you're right/i,
      /I should/i,
      /my fault/i,
      /I messed up/i,
      /I'll try to/i
    ];
    
    const blameShiftingPatterns = [
      /you made me/i,
      /because you/i,
      /if you hadn't/i,
      /you started/i,
      /not my problem/i
    ];
    
    let accountabilityCount = 0;
    let blameShiftingCount = 0;
    
    for (const message of messages) {
      for (const pattern of accountabilityPatterns) {
        if (pattern.test(message)) {
          accountabilityCount++;
          break;
        }
      }
      
      for (const pattern of blameShiftingPatterns) {
        if (pattern.test(message)) {
          blameShiftingCount++;
          break;
        }
      }
    }
    
    // Calculate score: more accountability and less blame shifting = higher score
    const value = Math.min(100, (accountabilityCount / Math.max(messages.length, 1)) * 100 - 
                         (blameShiftingCount / Math.max(messages.length, 1)) * 50);
    
    return {
      trait: 'Accountability',
      value: Math.max(0, value), // Ensure not negative
      level: value >= 70 ? 'positive' : value >= 40 ? 'caution' : 'needs-work',
      emoji: '🛑'
    };
  };
  
  // Analyze for curiosity in messages
  const analyzeCuriosity = (messages: string[]): CommunicationMetric => {
    const curiosityPatterns = [
      /\?$/,
      /what do you think/i,
      /how do you feel/i,
      /tell me more/i,
      /could you explain/i,
      /I'm curious/i,
      /I'd like to understand/i
    ];
    
    let count = 0;
    for (const message of messages) {
      for (const pattern of curiosityPatterns) {
        if (pattern.test(message)) {
          count++;
          break; // Only count once per message
        }
      }
    }
    
    const value = Math.min(100, (count / Math.max(messages.length, 1)) * 100);
    
    return {
      trait: 'Curiosity',
      value,
      level: value >= 70 ? 'positive' : value >= 40 ? 'caution' : 'needs-work',
      emoji: '❓'
    };
  };
  
  // Analyze for validation in messages
  const analyzeValidation = (messages: string[], otherPerson: string): CommunicationMetric => {
    const validationPatterns = [
      /I can see why/i,
      /that makes sense/i,
      /you have a point/i,
      /your feelings are valid/i,
      /I hear you/i,
      new RegExp(`I get why you(\\s|'re)`, 'i'),
      /I understand/i
    ];
    
    let count = 0;
    for (const message of messages) {
      for (const pattern of validationPatterns) {
        if (pattern.test(message)) {
          count++;
          break; // Only count once per message
        }
      }
    }
    
    const value = Math.min(100, (count / Math.max(messages.length, 1)) * 100);
    
    return {
      trait: 'Validation',
      value,
      level: value >= 70 ? 'positive' : value >= 40 ? 'caution' : 'needs-work',
      emoji: '👂'
    };
  };
  
  // Find relevant quotes that demonstrate the metrics
  const findDemonstrativeQuotes = (metrics: Record<string, CommunicationMetric>) => {
    const results: Record<string, {quote: string, context: string}[]> = {};
    
    // Start with quotes from keyQuotes if available
    if (keyQuotes && keyQuotes.length > 0) {
      for (const metric of Object.keys(metrics)) {
        results[metric] = [];
        
        for (const quote of keyQuotes) {
          if (quote.speaker === me) {
            // Check if quote analysis contains keywords related to the metric
            if (
              (metric === 'empathy' && quote.analysis.match(/empathy|understanding|compassion/i)) ||
              (metric === 'defensiveness' && quote.analysis.match(/defensive|justify|excuse/i)) ||
              (metric === 'accountability' && quote.analysis.match(/accountability|responsibility|blame/i)) ||
              (metric === 'curiosity' && quote.analysis.match(/curious|question|inquiry/i)) ||
              (metric === 'validation' && quote.analysis.match(/validation|acknowledge|recognize/i))
            ) {
              results[metric].push({
                quote: quote.quote,
                context: quote.analysis
              });
            }
          }
        }
      }
    }
    
    // If we don't have quotes from keyQuotes, extract from conversation
    if (Object.values(results).every(arr => arr.length === 0)) {
      const messages = extractMessagesForSelf(conversation, me);
      
      // Find quotes for empathy
      results.empathy = [];
      for (const message of messages) {
        if (/understand|see how you feel|that must be|I can imagine/i.test(message)) {
          results.empathy.push({
            quote: message,
            context: "Shows empathy by acknowledging feelings or perspective"
          });
          break;
        }
      }
      
      // Find quotes for defensiveness
      results.defensiveness = [];
      for (const message of messages) {
        if (/I didn't|that's not|but I|you always|you never/i.test(message)) {
          results.defensiveness.push({
            quote: message,
            context: "Shows defensiveness through justification or counter-accusations"
          });
          break;
        }
      }
      
      // Find quotes for accountability
      results.accountability = [];
      for (const message of messages) {
        if (/you made me|because you|if you hadn't|not my problem/i.test(message)) {
          results.accountability.push({
            quote: message,
            context: "Shows potential blame-shifting"
          });
          break;
        } else if (/I'm sorry|my mistake|I apologize|I should/i.test(message)) {
          results.accountability.push({
            quote: message,
            context: "Shows accountability by taking responsibility"
          });
          break;
        }
      }
    }
    
    return results;
  };
  
  // Generate patterns
  const communicationMetrics = extractCommunicationPatterns();
  const demonstrativeQuotes = findDemonstrativeQuotes(communicationMetrics);
  
  // Select key metrics to focus on
  const keyMetrics = Object.values(communicationMetrics)
    .sort((a, b) => {
      // Prioritize the most notable metrics - extreme values (very high or low)
      const aPriority = Math.abs(a.value - 50);
      const bPriority = Math.abs(b.value - 50);
      return bPriority - aPriority;
    })
    .slice(0, 3); // Take top 3 most notable metrics
  
  // Generate reflection prompts based on metrics
  const generateReflectionPrompt = (): string => {
    const lowestMetric = Object.values(communicationMetrics)
      .sort((a, b) => a.value - b.value)[0];
      
    if (lowestMetric.trait === 'Empathy') {
      return "How might you show more understanding of the other person's perspective in future conversations?";
    } else if (lowestMetric.trait === 'Accountability') {
      return "If you could take more responsibility in this conversation, what might you say differently?";
    } else if (lowestMetric.trait === 'Defensiveness' && lowestMetric.value > 50) {
      return "If you were on the receiving end of these messages, how might they feel to you?";
    } else if (lowestMetric.trait === 'Curiosity') {
      return "What questions could you ask to better understand the other person's perspective?";
    } else if (lowestMetric.trait === 'Validation') {
      return "How might you validate the other person's feelings even if you disagree with them?";
    } else {
      return "What's one thing you'd change about how you communicated in this conversation?";
    }
  };
  
  // Generate next step suggestions
  const generateNextStepSuggestion = (): string => {
    const lowestMetric = Object.values(communicationMetrics)
      .sort((a, b) => a.value - b.value)[0];
      
    if (lowestMetric.trait === 'Empathy') {
      return "Try rephrasing one statement to acknowledge how the other person might be feeling.";
    } else if (lowestMetric.trait === 'Accountability') {
      return "Consider taking ownership of one part of the issue without qualification.";
    } else if (lowestMetric.trait === 'Defensiveness' && lowestMetric.value > 50) {
      return "Consider rephrasing one defensive message into a curious question or validating statement.";
    } else if (lowestMetric.trait === 'Curiosity') {
      return "Try asking an open-ended question to better understand their perspective.";
    } else if (lowestMetric.trait === 'Validation') {
      return "Look for an opportunity to acknowledge the validity of their feelings, even if you see things differently.";
    } else {
      return "Consider practicing active listening by summarizing what you hear before responding.";
    }
  };
  
  // Generate status meter colors
  const getStatusColor = (level: string): string => {
    switch (level) {
      case 'positive':
        return 'bg-emerald-500';
      case 'caution':
        return 'bg-amber-500';
      case 'needs-work':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Generate text status indicators
  const getStatusText = (level: string): JSX.Element => {
    switch (level) {
      case 'positive':
        return <span className="text-emerald-700 font-medium">Strong</span>;
      case 'caution':
        return <span className="text-amber-700 font-medium">Moderate</span>;
      case 'needs-work':
        return <span className="text-red-700 font-medium">Needs Work</span>;
      default:
        return <span className="text-gray-700">Unknown</span>;
    }
  };
  
  // Generate status emoji
  const getStatusEmoji = (level: string): string => {
    switch (level) {
      case 'positive':
        return '🟢';
      case 'caution':
        return '🟡';
      case 'needs-work':
        return '🔴';
      default:
        return '⚪';
    }
  };
  
  // Save reflection note (would connect to backend in a real implementation)
  const handleSaveNote = () => {
    // This would save to backend in real implementation
    alert("Reflection note saved!");
  };
  
  // Share reflection (stub - would implement sharing functionality)
  const handleShareNote = () => {
    // This would implement sharing in real implementation
    alert("Sharing functionality would be implemented here");
  };
  
  const reflectionPrompt = generateReflectionPrompt();
  const nextStepSuggestion = generateNextStepSuggestion();
  
  return (
    <div className="mt-6">
      <div className="flex items-center mb-3">
        <HelpCircle className="h-5 w-5 text-blue-500 mr-2" />
        <h3 className="text-lg font-semibold">🪞 Self-Reflection: How Did You Show Up in This Conversation?</h3>
      </div>
      
      <Card>
        <CardContent className="p-4 space-y-6">
          <div>
            <p className="text-sm mb-4">Based on your messages, you showed signs of:</p>
            
            <div className="space-y-4">
              {keyMetrics.map((metric, idx) => {
                const quotes = demonstrativeQuotes[metric.trait.toLowerCase()] || [];
                
                return (
                  <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-2">
                        {metric.level === 'positive' ? (
                          <Check className="h-5 w-5 text-emerald-500" />
                        ) : metric.level === 'caution' ? (
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium">
                          <span className="mr-2">{metric.emoji}</span>
                          {metric.trait}: 
                          <span className="ml-1 font-normal">
                            {metric.level === 'positive' && 'You demonstrated this well in your messages.'}
                            {metric.level === 'caution' && 'Some of your responses showed this quality.'}
                            {metric.level === 'needs-work' && metric.trait === 'Defensiveness' ? 
                              'Several messages showed a defensive tone.' : 
                              'This was less evident in your communication.'}
                          </span>
                        </p>
                        
                        {/* Status meter */}
                        <div className="mt-2 mb-3">
                          <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
                            <span>{metric.trait === 'Defensiveness' ? 'High' : 'Low'}</span>
                            <span>{getStatusText(metric.level)}</span>
                            <span>{metric.trait === 'Defensiveness' ? 'Low' : 'High'}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getStatusColor(metric.level)}`}
                              style={{ 
                                width: `${metric.trait === 'Defensiveness' ? (100 - metric.value) : metric.value}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                        
                        {/* Example quotes if available */}
                        {quotes.length > 0 && (
                          <div className="mt-2 border-t border-gray-200 pt-2">
                            <div className="flex items-center text-xs text-gray-700 mb-1">
                              <MessageSquareQuote className="h-3 w-3 mr-1" />
                              <span>Example:</span>
                            </div>
                            <div className="text-xs bg-gray-100 p-2 rounded">
                              <p className="italic">"{quotes[0].quote}"</p>
                              <p className="text-gray-600 mt-1">{quotes[0].context}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Reflection prompts */}
          <div className="bg-blue-50 p-3 rounded border border-blue-100">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Reflection Prompt:</h4>
            <p className="text-sm text-blue-700 mb-4">{reflectionPrompt}</p>
            
            <h4 className="text-sm font-medium text-blue-800 mb-2">Suggested Next Step:</h4>
            <p className="text-sm text-blue-700">{nextStepSuggestion}</p>
          </div>
          
          {/* Reflection note area */}
          <div>
            <label htmlFor="reflection-note" className="block text-sm font-medium text-gray-700 mb-1">
              Your Reflection Notes:
            </label>
            <Textarea
              id="reflection-note"
              placeholder="Write your thoughts and insights here..."
              className="min-h-[100px]"
              value={reflectionNote}
              onChange={(e) => setReflectionNote(e.target.value)}
            />
            
            <div className="mt-2 flex space-x-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleSaveNote}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareNote}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
          
          {/* Summary of all metrics (only in Pro tier) */}
          {(tier === 'pro' || tier === 'instant') && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium mb-3">All Communication Metrics:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.values(communicationMetrics).map((metric, idx) => (
                  <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">{metric.trait}</span>
                      <span className="text-xs">{getStatusEmoji(metric.level)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full ${getStatusColor(metric.level)}`}
                        style={{ 
                          width: `${metric.trait === 'Defensiveness' ? (100 - metric.value) : metric.value}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="bg-blue-50 p-3 rounded border border-blue-100 mt-4">
        <p className="text-sm text-blue-700">
          <span className="font-medium">{tier === 'personal' ? 'Personal' : 'Pro'} tier feature:</span> Self-reflection helps you understand your own communication patterns and offers guidance for more effective interactions.
        </p>
      </div>
    </div>
  );
}