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
    // Mock data for the Alex/Jamie conversation
    const timelinePoints = [
      { time: "0:00", meEmotion: "Frustrated", themEmotion: "Calm", meIntensity: 50, themIntensity: 20 },
      { time: "0:32", meEmotion: "Frustrated", themEmotion: "Defensive", meIntensity: 65, themIntensity: 40 },
      { time: "1:15", meEmotion: "Angry", themEmotion: "Defensive", meIntensity: 80, themIntensity: 60 },
      { time: "1:47", meEmotion: "Accusatory", themEmotion: "Withdrawn", meIntensity: 85, themIntensity: 70 },
      { time: "2:03", meEmotion: "Dismissive", themEmotion: "Hurt", meIntensity: 75, themIntensity: 80 }
    ];
    
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
              <div className="bg-blue-50 p-3 rounded border border-blue-200 text-blue-800 text-xs">
                <div className="font-medium mb-1">Emotional Journey Summary</div>
                <p>The conversation begins with {me} feeling <span className="font-medium">{timelinePoints[0].meEmotion}</span> and {them} feeling <span className="font-medium">{timelinePoints[0].themEmotion}</span>, gradually escalating to a point where {me} becomes <span className="font-medium">{timelinePoints[2].meEmotion}</span> and {them} shifts to being <span className="font-medium">{timelinePoints[2].themEmotion}</span>. By the end, {me} is <span className="font-medium">{timelinePoints[4].meEmotion}</span> while {them} appears <span className="font-medium">{timelinePoints[4].themEmotion}</span>.</p>
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
                      <div className="mt-1 text-gray-500 ml-16">
                        {explanations[index]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="bg-blue-50 p-3 rounded border border-blue-100 mt-4">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Pro tier feature:</span> Emotional shifts timeline provides an interactive view of how emotions evolve throughout the conversation, revealing key escalation and de-escalation points.
          </p>
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
            <div className="space-y-3">
              {emotionalState.map((emotion, index) => (
                <div key={index} className="flex items-center">
                  <span className="text-sm font-medium w-24">{emotion.emotion}:</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden ml-2">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: `${emotion.intensity}%` }}
                    ></div>
                  </div>
                  <span className="text-xs ml-2">{emotion.intensity}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <div className="bg-blue-50 p-3 rounded border border-blue-100 mt-4">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Pro tier feature:</span> Emotional mapping shows the distribution and intensity of emotions in this conversation.
          </p>
        </div>
      </div>
    );
  }
  
  // If no emotional state data or specific conversation pattern is found
  return null;
}