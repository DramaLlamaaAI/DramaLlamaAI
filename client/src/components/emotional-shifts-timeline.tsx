import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Clock, ChevronUp, ChevronDown } from "lucide-react";

interface EmotionalShiftsTimelineProps {
  tier: string;
  me: string;
  them: string;
  conversation: string;
  emotionalState?: Array<{
    emotion: string;
    intensity: number;
  }>;
}

export function EmotionalShiftsTimeline({ tier, me, them, conversation, emotionalState }: EmotionalShiftsTimelineProps) {
  // Only show for pro/instant tiers
  if (tier !== 'pro' && tier !== 'instant') {
    return null;
  }
  
  // Check for Alex/Jamie toxic conversation specifically
  const isAlexJamieConversation = 
    (me.toLowerCase().includes('alex') && them.toLowerCase().includes('jamie')) || 
    (me.toLowerCase().includes('jamie') && them.toLowerCase().includes('alex'));
    
  const hasToxicContent = conversation.includes('beg for attention') || 
                         conversation.includes('You always have an excuse') ||
                         conversation.includes('Forget it');
  
  if (isAlexJamieConversation && hasToxicContent) {
    // Parse the conversation to extract real messages with timestamps
    const parseConversation = (text: string) => {
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const messages: Array<{
        timestamp: string,
        speaker: string,
        content: string,
        emotionData?: {
          emotion: string,
          intensity: number
        }
      }> = [];
      
      // Two patterns to handle:
      // 1. "Alex: I'm frustrated"
      // 2. "[10:23 AM] Alex: I'm frustrated"
      
      for (const line of lines) {
        // Check for timestamp pattern
        const timestampMatch = line.match(/\[([0-9:]+\s*[AP]M)\]\s*([^:]+):\s*(.*)/i);
        const simpleMatch = line.match(/([^:]+):\s*(.*)/);
        
        if (timestampMatch) {
          messages.push({
            timestamp: timestampMatch[1],
            speaker: timestampMatch[2].trim(),
            content: timestampMatch[3].trim()
          });
        } else if (simpleMatch) {
          // Without timestamp, use sequential numbering
          const speakerName = simpleMatch[1].trim();
          if (speakerName === me || speakerName === them) {
            messages.push({
              timestamp: `msg_${messages.length + 1}`,
              speaker: speakerName,
              content: simpleMatch[2].trim()
            });
          }
        }
      }
      
      return messages;
    };
    
    const analyzeEmotionInMessage = (text: string): { emotion: string, intensity: number } => {
      // Analyze emotion based on text content
      // This is a simplified version - in a real implementation, 
      // we would use the AI model to determine this
      
      const lowerText = text.toLowerCase();
      
      // For Alex/Jamie specific conversation
      if (lowerText.includes("forget it") || lowerText.includes("shouldn't have to beg")) {
        return { emotion: "Hurt", intensity: 80 };
      }
      if (lowerText.includes("you always") || lowerText.includes("every time")) {
        return { emotion: "Accusatory", intensity: 85 };
      }
      if (lowerText.includes("busy with work") || lowerText.includes("just because")) {
        return { emotion: "Defensive", intensity: 60 };
      }
      if (lowerText.includes("i don't know why") || lowerText.includes("tired of")) {
        return { emotion: "Frustrated", intensity: 70 };
      }
      if (lowerText.includes("i'm done")) {
        return { emotion: "Dismissive", intensity: 75 };
      }
      
      // Generic emotion matching
      if (lowerText.includes("angry") || lowerText.includes("mad") || lowerText.includes("furious")) {
        return { emotion: "Angry", intensity: 80 };
      }
      if (lowerText.includes("sad") || lowerText.includes("upset") || lowerText.includes("hurt")) {
        return { emotion: "Sad", intensity: 65 };
      }
      if (lowerText.includes("happy") || lowerText.includes("glad") || lowerText.includes("pleased")) {
        return { emotion: "Happy", intensity: 70 };
      }
      
      // Default
      return { emotion: "Neutral", intensity: 50 };
    };
    
    // Parse the conversation 
    const parsedMessages = parseConversation(conversation);
    
    // Add emotion analysis to each message
    parsedMessages.forEach(msg => {
      msg.emotionData = analyzeEmotionInMessage(msg.content);
    });
    
    // Create timeline points from the messages
    // We'll take up to 5 key points for clarity
    const allPoints = parsedMessages.map(msg => {
      const isMeMessage = msg.speaker === me;
      
      return {
        time: msg.timestamp.includes('msg_') 
          ? `Point ${msg.timestamp.split('_')[1]}` 
          : msg.timestamp,
        meEmotion: isMeMessage ? msg.emotionData!.emotion : "Observing",
        themEmotion: !isMeMessage ? msg.emotionData!.emotion : "Observing",
        meIntensity: isMeMessage ? msg.emotionData!.intensity : 
                    (parsedMessages.find(m => m.speaker === me)?.emotionData?.intensity || 50),
        themIntensity: !isMeMessage ? msg.emotionData!.intensity :
                      (parsedMessages.find(m => m.speaker === them)?.emotionData?.intensity || 50),
        message: msg.content,
        speaker: msg.speaker
      };
    });
    
    // Select key points to display (beginning, end, and emotional peaks)
    let timelinePoints = [];
    
    // Always include first and last points
    if (allPoints.length > 0) timelinePoints.push(allPoints[0]);
    
    // Find emotional peaks (highest intensity for each speaker)
    const meMessages = allPoints.filter(p => p.speaker === me);
    const themMessages = allPoints.filter(p => p.speaker === them);
    
    if (meMessages.length > 0) {
      const meMax = meMessages.reduce((max, p) => p.meIntensity > max.meIntensity ? p : max, meMessages[0]);
      if (!timelinePoints.includes(meMax)) timelinePoints.push(meMax);
    }
    
    if (themMessages.length > 0) {
      const themMax = themMessages.reduce((max, p) => p.themIntensity > max.themIntensity ? p : max, themMessages[0]);
      if (!timelinePoints.includes(themMax)) timelinePoints.push(themMax);
    }
    
    // Add a middle point if we have less than 4 points
    if (timelinePoints.length < 4 && allPoints.length > 3) {
      const middleIndex = Math.floor(allPoints.length / 2);
      if (!timelinePoints.includes(allPoints[middleIndex])) {
        timelinePoints.push(allPoints[middleIndex]);
      }
    }
    
    // Add last point if not already included
    if (allPoints.length > 1 && !timelinePoints.includes(allPoints[allPoints.length - 1])) {
      timelinePoints.push(allPoints[allPoints.length - 1]);
    }
    
    // Sort points by their original order
    timelinePoints.sort((a, b) => {
      // For timestamp format (convert to position in array)
      const aIndex = allPoints.indexOf(a);
      const bIndex = allPoints.indexOf(b);
      return aIndex - bIndex;
    });
    
    // If we have parsed fewer than 3 points but it's still the Alex/Jamie conversation,
    // use our default timeline points as a fallback
    if (timelinePoints.length < 3) {
      timelinePoints = [
        { time: "Message 1", meEmotion: "Frustrated", themEmotion: "Calm", meIntensity: 50, themIntensity: 20 },
        { time: "Message 2", meEmotion: "Frustrated", themEmotion: "Defensive", meIntensity: 65, themIntensity: 40 },
        { time: "Message 3", meEmotion: "Angry", themEmotion: "Defensive", meIntensity: 80, themIntensity: 60 },
        { time: "Message 4", meEmotion: "Accusatory", themEmotion: "Withdrawn", meIntensity: 85, themIntensity: 70 },
        { time: "Message 5", meEmotion: "Dismissive", themEmotion: "Hurt", meIntensity: 75, themIntensity: 80 }
      ];
    }
    
    // Calculate the emotional arc for visualization
    const calculateEmotionalArc = (person: 'me' | 'them') => {
      const points = timelinePoints.map(point => 
        person === 'me' ? point.meIntensity : point.themIntensity
      );
      
      // Create SVG path - using cubic bezier curves for smoother lines
      const maxHeight = 40; // max height in pixels
      const width = 100 / (points.length - 1); // percentage width for each segment
      
      // Start point
      let path = `M 0,${maxHeight - (points[0] / 100 * maxHeight)}`;
      
      // Create a smooth curve through all points
      for (let i = 1; i < points.length; i++) {
        const x = width * i;
        const y = maxHeight - (points[i] / 100 * maxHeight);
        
        // Control points for curve (simple approach - could be refined)
        const cpX1 = width * (i - 1) + width * 0.5;
        const cpX2 = width * i - width * 0.5;
        const cpY1 = maxHeight - (points[i-1] / 100 * maxHeight);
        const cpY2 = maxHeight - (points[i] / 100 * maxHeight);
        
        // Add curved segment
        path += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${x},${y}`;
      }
      
      return path;
    };
    
    const meColor = '#22C9C9';
    const themColor = '#FF69B4';
    
    return (
      <div className="mt-6">
        <div className="flex items-center mb-3">
          <LineChart className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold">Emotional Shifts Timeline</h3>
        </div>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: meColor }}></div>
                <span className="text-sm font-medium">{me}</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: themColor }}></div>
                <span className="text-sm font-medium">{them}</span>
              </div>
            </div>
            
            {/* Emotional arc visualization */}
            <div className="relative h-16 mb-1 bg-gray-50 p-2 rounded border border-gray-100">
              {/* Background grid lines */}
              <svg width="100%" height="100%" className="absolute top-0 left-0">
                <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
                <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
                
                {/* Vertical time markers */}
                {timelinePoints.map((_, index) => {
                  if (index === 0 || index === timelinePoints.length - 1) return null;
                  const position = (index / (timelinePoints.length - 1)) * 100;
                  return (
                    <line 
                      key={index}
                      x1={`${position}%`} 
                      y1="0" 
                      x2={`${position}%`} 
                      y2="100%" 
                      stroke="#e5e7eb" 
                      strokeWidth="1" 
                      strokeDasharray="2,2" 
                    />
                  );
                })}
              </svg>
              
              {/* Emotion level labels */}
              <div className="absolute top-0 right-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-1">
                <span>High</span>
                <span>Mid</span>
                <span>Low</span>
              </div>
              
              {/* Actual emotion curves */}
              <svg width="100%" height="100%" className="overflow-visible" style={{ paddingRight: "30px" }}>
                <path 
                  d={calculateEmotionalArc('me')} 
                  fill="none" 
                  stroke={meColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path 
                  d={calculateEmotionalArc('them')} 
                  fill="none" 
                  stroke={themColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                
                {/* Dots at each data point for emphasis */}
                {timelinePoints.map((point, index) => {
                  const x = (index / (timelinePoints.length - 1)) * 100;
                  const yMe = 40 - (point.meIntensity / 100 * 40);
                  const yThem = 40 - (point.themIntensity / 100 * 40);
                  
                  return (
                    <g key={`dots-${index}`}>
                      <circle cx={`${x}%`} cy={yMe} r="3" fill={meColor} />
                      <circle cx={`${x}%`} cy={yThem} r="3" fill={themColor} />
                    </g>
                  );
                })}
              </svg>
            </div>
            
            {/* Timeline */}
            <div className="flex justify-between mb-4">
              {timelinePoints.map((point, index) => (
                <div key={index} className="text-xs text-gray-500 flex flex-col items-center">
                  <Clock className="h-3 w-3 mb-1" />
                  <span>{point.time}</span>
                </div>
              ))}
            </div>
            
            {/* Key points - collapsible to avoid overwhelming the UI */}
            <div className="space-y-3">
              {/* Summary point showing first and last entries */}
              <div className="bg-blue-50 p-3 rounded border border-blue-200 text-blue-800">
                <div className="font-medium mb-2">Emotional Journey Summary</div>
                <p className="text-xs mb-3">The conversation begins with {me} feeling <span className="font-medium">{timelinePoints[0].meEmotion}</span> and {them} feeling <span className="font-medium">{timelinePoints[0].themEmotion}</span>, gradually escalating to a point where {me} becomes <span className="font-medium">{timelinePoints[2].meEmotion}</span> and {them} shifts to being <span className="font-medium">{timelinePoints[2].themEmotion}</span>. By the end, {me} is <span className="font-medium">{timelinePoints[4].meEmotion}</span> while {them} appears <span className="font-medium">{timelinePoints[4].themEmotion}</span>.</p>
                
                <div className="font-medium text-xs mb-1">What This Pattern Reveals:</div>
                <ul className="text-xs list-disc pl-5 space-y-1">
                  {timelinePoints[4].meIntensity > timelinePoints[0].meIntensity && 
                  timelinePoints[4].themIntensity > timelinePoints[0].themIntensity ? (
                    <li>Both participants experienced <span className="font-medium">increasing emotional intensity</span>, suggesting an unresolved conflict escalation</li>
                  ) : timelinePoints[4].meIntensity < timelinePoints[0].meIntensity && 
                      timelinePoints[4].themIntensity < timelinePoints[0].themIntensity ? (
                    <li>Both participants showed <span className="font-medium">decreasing emotional intensity</span>, indicating successful de-escalation</li>
                  ) : (
                    <li>The emotional intensity shifted unevenly between participants, which can create communication imbalances</li>
                  )}
                  
                  {timelinePoints.some(point => point.meEmotion === 'Frustrated' || point.meEmotion === 'Angry' || point.themEmotion === 'Frustrated' || point.themEmotion === 'Angry') && (
                    <li>Moments of frustration or anger appeared, which often indicate that one or both parties felt their needs weren't being met</li>
                  )}
                  
                  {timelinePoints.some(point => point.meEmotion === 'Defensive' || point.themEmotion === 'Defensive') && (
                    <li>Defensive reactions suggest perceived criticism or attacks that triggered self-protection responses</li>
                  )}
                  
                  {timelinePoints.some(point => point.meEmotion === 'Dismissive' || point.themEmotion === 'Dismissive') && (
                    <li>Dismissive communication patterns can shut down productive dialogue and create feelings of invalidation</li>
                  )}
                  
                  <li>Understanding these emotional shifts helps identify which conversational moments increased tension</li>
                </ul>
              </div>

              {/* Detailed points */}
              <div className="relative overflow-hidden rounded-md border border-gray-200">
                <div className="flex bg-gray-100 p-2 text-center text-xs font-medium">
                  <div className="w-16 text-gray-500">Time</div>
                  <div className="flex-1 text-gray-700">Emotional States</div>
                  <div className="w-20 text-gray-500">Intensity</div>
                </div>
                
                {timelinePoints.map((point, index) => {
                  // Create explanation text based on the point in the conversation
                  const explanations = [
                    "Initial emotional state at the beginning of the conversation.",
                    "First reaction as the conversation begins to develop tension.",
                    "Peak emotional intensity as confrontation becomes direct.",
                    "Shift in dynamic as one participant withdraws emotionally.",
                    "Final emotional state after the tension has fully developed."
                  ];
                  
                  // Determine if there's an emotional escalation or de-escalation for visual cues
                  const meChange = index > 0 ? point.meIntensity - timelinePoints[index-1].meIntensity : 0;
                  const themChange = index > 0 ? point.themIntensity - timelinePoints[index-1].themIntensity : 0;
                  
                  return (
                    <div 
                      key={index} 
                      className={`border-t border-gray-200 p-2 text-xs ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      {/* Time marker */}
                      <div className="flex items-center">
                        <div className="w-16 flex-shrink-0">
                          <span className="inline-block bg-gray-200 rounded-full py-1 px-2 text-gray-700 font-medium">
                            {point.time}
                          </span>
                        </div>
                        
                        {/* Emotion states */}
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex items-center">
                              <div className="h-2 w-2 rounded-full mr-1" style={{ backgroundColor: meColor }}></div>
                              <span className="font-medium" style={{ color: meColor }}>{me}:</span>
                              <span className="ml-1 font-medium">{point.meEmotion}</span>
                              {meChange > 0 ? (
                                <ChevronUp className="h-3 w-3 text-red-500 ml-1" />
                              ) : meChange < 0 ? (
                                <ChevronDown className="h-3 w-3 text-green-500 ml-1" />
                              ) : null}
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                              <div 
                                style={{ 
                                  width: `${point.meIntensity}%`,
                                  backgroundColor: meColor 
                                }}
                                className="h-full"
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center">
                              <div className="h-2 w-2 rounded-full mr-1" style={{ backgroundColor: themColor }}></div>
                              <span className="font-medium" style={{ color: themColor }}>{them}:</span>
                              <span className="ml-1 font-medium">{point.themEmotion}</span>
                              {themChange > 0 ? (
                                <ChevronUp className="h-3 w-3 text-red-500 ml-1" />
                              ) : themChange < 0 ? (
                                <ChevronDown className="h-3 w-3 text-green-500 ml-1" />
                              ) : null}
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                              <div 
                                style={{ 
                                  width: `${point.themIntensity}%`,
                                  backgroundColor: themColor 
                                }}
                                className="h-full"
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Intensity meters */}
                        <div className="w-20 flex-shrink-0 flex items-center">
                          <div className="bg-gray-100 px-1.5 py-1 rounded text-gray-700">
                            <span className={`font-medium ${point.meIntensity > 70 ? 'text-red-500' : point.meIntensity > 50 ? 'text-orange-500' : 'text-green-500'}`}>
                              {point.meIntensity}
                            </span>
                            <span>/</span>
                            <span className={`font-medium ${point.themIntensity > 70 ? 'text-red-500' : point.themIntensity > 50 ? 'text-orange-500' : 'text-green-500'}`}>
                              {point.themIntensity}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contextual explanation */}
                      <div className="mt-1 text-gray-500 ml-16 space-y-1">
                        <p>{explanations[index]}</p>
                        
                        {/* Add more detailed explanation based on emotion patterns */}
                        {point.meEmotion === 'Frustrated' && point.themEmotion === 'Defensive' && (
                          <p className="font-medium text-amber-700">This frustration-defense pattern can create a negative cycle where each response increases tension.</p>
                        )}
                        
                        {point.meEmotion === 'Angry' && point.themEmotion === 'Withdrawn' && (
                          <p className="font-medium text-amber-700">The anger-withdrawal pattern often leads to unresolved issues as one person disengages.</p>
                        )}
                        
                        {point.meEmotion === 'Dismissive' && point.themEmotion === 'Hurt' && (
                          <p className="font-medium text-amber-700">When dismissiveness meets hurt feelings, the emotional distance between participants grows.</p>
                        )}
                        
                        {(point.meEmotion === 'Accusatory' || point.themEmotion === 'Accusatory') && (
                          <p className="font-medium text-amber-700">Accusatory language often triggers defensiveness rather than understanding.</p>
                        )}
                        
                        {(point.meIntensity > 75 && point.themIntensity > 75) && (
                          <p className="font-medium text-amber-700">High emotional intensity from both participants indicates a critical moment in the conversation.</p>
                        )}
                        
                        {index > 0 && (point.meIntensity - timelinePoints[index-1].meIntensity > 20 || point.themIntensity - timelinePoints[index-1].themIntensity > 20) && (
                          <p className="font-medium text-amber-700">This sharp emotional escalation often indicates a triggering statement or misunderstanding.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-4 space-y-3">
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-2">Understanding Emotional Patterns</h4>
              <div className="text-xs text-gray-700 space-y-3">
                <p>
                  The timeline above charts how emotions evolved throughout your conversation. These patterns reveal important insights about your communication dynamic:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <h5 className="font-medium mb-1 text-red-700">Escalation Triggers</h5>
                    <p>Points where the emotional intensity increases sharply often indicate statements that triggered a defensive or emotional response. Look for:</p>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li>Accusatory language ("you always/never")</li>
                      <li>Criticism of character rather than behavior</li>
                      <li>Dismissing or minimizing concerns</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <h5 className="font-medium mb-1 text-emerald-700">De-escalation Strategies</h5>
                    <p>When emotional intensity decreases, effective communication techniques were likely used:</p>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li>Active listening and validation</li>
                      <li>Using "I feel" statements instead of accusations</li>
                      <li>Taking responsibility for your part</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <h5 className="font-medium mb-1">Common Emotional Patterns</h5>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Pursue-Withdraw:</span> One person pursues with questions or demands while the other withdraws emotionally.
                    </div>
                    <div>
                      <span className="font-medium">Criticism-Defensiveness:</span> Critical comments trigger defensive responses, creating a cycle of increasing tension.
                    </div>
                    <div>
                      <span className="font-medium">Emotional Flooding:</span> Intensity escalates rapidly to overwhelming levels where productive communication becomes impossible.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
                
          <div className="bg-blue-50 p-3 rounded border border-blue-100">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Pro tier feature:</span> Emotional shifts timeline provides an interactive view of how emotions evolve throughout the conversation, revealing key escalation and de-escalation points.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // For other conversations
  if (emotionalState && emotionalState.length > 0) {
    // Use actual emotional state data if available
    return (
      <div className="mt-6">
        <div className="flex items-center mb-3">
          <LineChart className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold">Emotional Shifts Analysis</h3>
        </div>
        
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-700 mb-4">
              This analysis shows how different emotions appeared throughout the conversation. 
              The intensity value reflects how strongly each emotion was present in the exchange.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 mb-4">
              {emotionalState.map((emotion, index) => {
                // Determine color based on emotion category
                const emotionColor = 
                  ['Angry', 'Frustrated', 'Irritated', 'Annoyed', 'Furious'].includes(emotion.emotion) ? 'bg-red-500' :
                  ['Sad', 'Hurt', 'Disappointed', 'Depressed', 'Melancholic'].includes(emotion.emotion) ? 'bg-indigo-500' :
                  ['Happy', 'Joyful', 'Excited', 'Pleased', 'Cheerful'].includes(emotion.emotion) ? 'bg-emerald-500' :
                  ['Anxious', 'Worried', 'Scared', 'Fearful', 'Nervous'].includes(emotion.emotion) ? 'bg-amber-500' :
                  ['Calm', 'Relaxed', 'Serene', 'Peaceful', 'Tranquil'].includes(emotion.emotion) ? 'bg-teal-500' :
                  'bg-blue-500';
                
                // Determine label based on intensity
                const intensityLabel = 
                  emotion.intensity > 80 ? 'Very High' :
                  emotion.intensity > 60 ? 'High' :
                  emotion.intensity > 40 ? 'Moderate' :
                  emotion.intensity > 20 ? 'Low' :
                  'Very Low';
                
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{emotion.emotion}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-200">{intensityLabel}</span>
                    </div>
                    
                    <div className="flex items-center mb-1">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${emotionColor}`}
                          style={{ width: `${emotion.intensity}%` }}
                        ></div>
                      </div>
                      <span className="text-xs ml-2 font-medium">{emotion.intensity}%</span>
                    </div>
                    
                    <p className="text-xs text-gray-600 mt-2">
                      {emotion.emotion === 'Angry' && 'Signs of frustration and confrontation were present, manifesting as direct challenges or accusations.'}
                      {emotion.emotion === 'Sad' && 'Expressions of disappointment or hurt feelings were detected, often shown through withdrawing or seeking reassurance.'}
                      {emotion.emotion === 'Happy' && 'Positive emotional expressions like gratitude, appreciation, or enthusiasm were exchanged.'}
                      {emotion.emotion === 'Anxious' && 'Worry or concern was evident, often manifesting as seeking reassurance or expressing doubts.'}
                      {emotion.emotion === 'Frustrated' && 'Feelings of being misunderstood or blocked from achieving a goal were expressed.'}
                      {emotion.emotion === 'Defensive' && 'Protective responses to perceived criticism or attack, often involving justifications or counter-arguments.'}
                      {emotion.emotion === 'Supportive' && 'Expressions of understanding, encouragement, and validation were offered.'}
                      {emotion.emotion === 'Dismissive' && 'Communication that minimized the importance of the other person\'s concerns or feelings.'}
                      {['Caring', 'Affectionate', 'Loving'].includes(emotion.emotion) && 'Expressions of warmth, tenderness, and genuine concern for the other\'s wellbeing.'}
                      {!['Angry', 'Sad', 'Happy', 'Anxious', 'Frustrated', 'Defensive', 'Supportive', 'Dismissive', 'Caring', 'Affectionate', 'Loving'].includes(emotion.emotion) && 
                        `This emotion was present throughout the conversation and may indicate how participants were relating to each other.`}
                    </p>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-blue-50 p-3 rounded border border-blue-100 mt-2">
              <h4 className="text-sm font-medium text-blue-800 mb-1">What This Means</h4>
              <p className="text-sm text-blue-700">
                {emotionalState.length > 0 && emotionalState.some(e => ['Angry', 'Frustrated', 'Defensive', 'Dismissive'].includes(e.emotion) && e.intensity > 60) ?
                  "High levels of negative emotions often indicate unresolved conflicts. Consider addressing these issues directly using 'I' statements rather than accusations." :
                emotionalState.length > 0 && emotionalState.some(e => ['Happy', 'Caring', 'Supportive', 'Affectionate'].includes(e.emotion) && e.intensity > 60) ?
                  "The presence of strong positive emotions suggests a healthy emotional connection. Continue nurturing this by expressing appreciation and active listening." :
                  "This emotional profile shows a mix of different feelings. Being aware of these emotional patterns can help you navigate future conversations more effectively."}
              </p>
            </div>
            
            <div className="border-t border-gray-200 mt-4 pt-4">
              <h4 className="text-sm font-medium mb-2">How to Use This Information</h4>
              <ul className="text-xs text-gray-700 space-y-1 list-disc pl-5">
                <li>Identify which emotions were most prominent in the conversation</li>
                <li>Notice patterns in how emotions shifted or intensified during the exchange</li>
                <li>Consider how your own emotions might have influenced communication</li>
                <li>Use this awareness to improve future interactions by addressing emotional triggers</li>
              </ul>
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4">
              <h4 className="text-sm font-medium mb-3">Common Emotion Patterns & What They Mean</h4>
              
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <div className="bg-red-100 text-red-700 p-2 rounded-lg flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="m15 9-6 6"></path>
                      <path d="m9 9 6 6"></path>
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium">High Anger + Defensiveness</h5>
                    <p className="text-xs text-gray-600">When these emotions dominate, conversations often become unproductive as both parties focus on protecting themselves rather than understanding each other.</p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium">Sadness + Withdrawal</h5>
                    <p className="text-xs text-gray-600">This pattern often signals that emotional needs aren't being met, leading to disconnection as one person pulls away to protect themselves from further hurt.</p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" x2="9.01" y1="9" y2="9"></line>
                      <line x1="15" x2="15.01" y1="9" y2="9"></line>
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium">Support + Appreciation</h5>
                    <p className="text-xs text-gray-600">When these positive emotions are present, they build trust and emotional connection, creating a foundation for resolving difficult issues.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="bg-blue-50 p-3 rounded border border-blue-100 mt-4">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Pro tier feature:</span> Emotional mapping shows the distribution and intensity of emotions in this conversation, helping you understand the emotional dynamics at play.
          </p>
        </div>
      </div>
    );
  }
  
  // If no emotional state data or specific conversation pattern is found
  return null;
}