import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface EmotionTrackingProps {
  me: string;
  them: string;
  tier: string;
  emotionalState?: Array<{
    emotion: string;
    intensity: number;
  }>;
  participantTones?: {
    [key: string]: string;
  };
}

export function EmotionTracking({ me, them, tier, emotionalState, participantTones }: EmotionTrackingProps) {
  // Only show for personal+ tiers
  if (tier === 'free' || !participantTones) {
    return null;
  }
  
  // Select colors for each participant
  const meColor = '#22C9C9';
  const themColor = '#FF69B4';
  
  // Get tones for each participant
  const meTone = participantTones[me] || '';
  const themTone = participantTones[them] || '';
  
  // Extract primary emotions
  const meEmotions = meTone.toLowerCase().split(/[,.]/).map(e => e.trim())
    .filter(e => e.length > 0 && !['and', 'but', 'or', 'with', 'while'].includes(e));
  
  const themEmotions = themTone.toLowerCase().split(/[,.]/).map(e => e.trim())
    .filter(e => e.length > 0 && !['and', 'but', 'or', 'with', 'while'].includes(e));
  
  // Get general emotions from analysis as fallback
  const generalEmotions = emotionalState || [];
  
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Emotion Tracking</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h4 className="text-base font-medium mb-2" style={{ color: meColor }}>{me}</h4>
            
            {/* Emotion chips for first participant */}
            <div className="flex flex-wrap gap-2">
              {meEmotions.length > 0 ? (
                meEmotions.map((emotion, idx) => (
                  <span 
                    key={idx}
                    className="inline-block px-3 py-1 rounded-full text-sm"
                    style={{ 
                      backgroundColor: `rgba(34, 201, 201, 0.1)`,
                      border: '1px solid rgba(34, 201, 201, 0.3)',
                      color: meColor
                    }}
                  >
                    {emotion}
                  </span>
                ))
              ) : (
                generalEmotions.slice(0, 2).map((emotion, idx) => (
                  <span 
                    key={idx}
                    className="inline-block px-3 py-1 rounded-full text-sm"
                    style={{ 
                      backgroundColor: `rgba(34, 201, 201, 0.1)`,
                      border: '1px solid rgba(34, 201, 201, 0.3)',
                      color: meColor
                    }}
                  >
                    {emotion.emotion}
                  </span>
                ))
              )}
            </div>
            
            <div className="mt-3">
              <p className="text-sm">{meTone}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <h4 className="text-base font-medium mb-2" style={{ color: themColor }}>{them}</h4>
            
            {/* Emotion chips for second participant */}
            <div className="flex flex-wrap gap-2">
              {themEmotions.length > 0 ? (
                themEmotions.map((emotion, idx) => (
                  <span 
                    key={idx}
                    className="inline-block px-3 py-1 rounded-full text-sm"
                    style={{ 
                      backgroundColor: `rgba(255, 105, 180, 0.1)`,
                      border: '1px solid rgba(255, 105, 180, 0.3)',
                      color: themColor
                    }}
                  >
                    {emotion}
                  </span>
                ))
              ) : (
                generalEmotions.slice(0, 2).map((emotion, idx) => (
                  <span 
                    key={idx}
                    className="inline-block px-3 py-1 rounded-full text-sm"
                    style={{ 
                      backgroundColor: `rgba(255, 105, 180, 0.1)`,
                      border: '1px solid rgba(255, 105, 180, 0.3)',
                      color: themColor
                    }}
                  >
                    {emotion.emotion}
                  </span>
                ))
              )}
            </div>
            
            <div className="mt-3">
              <p className="text-sm">{themTone}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}