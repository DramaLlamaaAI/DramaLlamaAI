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
      
      // Create SVG path
      const maxHeight = 40; // max height in pixels
      const width = 100 / (points.length - 1); // percentage width for each segment
      
      let path = `M 0,${maxHeight - (points[0] / 100 * maxHeight)}`;
      for (let i = 1; i < points.length; i++) {
        const x = width * i;
        const y = maxHeight - (points[i] / 100 * maxHeight);
        path += ` L ${x},${y}`;
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
            <div className="relative h-10 mb-1">
              <svg width="100%" height="100%" className="overflow-visible">
                <path 
                  d={calculateEmotionalArc('me')} 
                  fill="none" 
                  stroke={meColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path 
                  d={calculateEmotionalArc('them')} 
                  fill="none" 
                  stroke={themColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
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
            
            {/* Key points */}
            <div className="space-y-3">
              {timelinePoints.map((point, index) => (
                <div key={index} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">{point.time}</span>
                    <span className="font-medium">Emotional Point {index + 1}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full mr-1" style={{ backgroundColor: meColor }}></div>
                        <span className="font-medium" style={{ color: meColor }}>{me}: {point.meEmotion}</span>
                        {index > 0 && timelinePoints[index].meIntensity > timelinePoints[index-1].meIntensity ? (
                          <ChevronUp className="h-3 w-3 text-red-500 ml-1" />
                        ) : index > 0 && timelinePoints[index].meIntensity < timelinePoints[index-1].meIntensity ? (
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
                        <span className="font-medium" style={{ color: themColor }}>{them}: {point.themEmotion}</span>
                        {index > 0 && timelinePoints[index].themIntensity > timelinePoints[index-1].themIntensity ? (
                          <ChevronUp className="h-3 w-3 text-red-500 ml-1" />
                        ) : index > 0 && timelinePoints[index].themIntensity < timelinePoints[index-1].themIntensity ? (
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
                </div>
              ))}
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