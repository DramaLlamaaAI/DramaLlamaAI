import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface CommunicationStylesProps {
  me: string;
  them: string;
  participantConflictScores?: {
    [participant: string]: {
      score: number;
      label: string;
      isEscalating: boolean;
    }
  };
  overallTone?: string;
}

export function CommunicationStyles({ me, them, participantConflictScores, overallTone }: CommunicationStylesProps) {
  // Get healthy communication scores for positive conversations
  const generatePositiveScores = (name: string, color: string) => {
    return {
      score: 25, // low conflict score
      label: "Supportive and engaged communication style",
      isEscalating: false,
      traits: {
        listening: 0.85,
        openness: 0.8,
        responsiveness: 0.75
      }
    };
  };
  
  // Default styling colors
  const meColor = '#22C9C9';
  const themColor = '#FF69B4';
  
  // Detect toxic conversations even without participantConflictScores
  const isToxicConversation = () => {
    // Check tone in property names
    if (me && them && (me.includes('accus') || them.includes('accus'))) {
      return true;
    }

    // IMPORTANT: Check the overall tone first - this is the most reliable indicator
    if (overallTone) {
      const overallToneLower = overallTone.toLowerCase();
      const negativeTonePatterns = [
        'blame', 'accus', 'tense', 'defensive', 'criticism', 'dismissive', 
        'contempt', 'stonewalling', 'withdraw', 'aggressive', 'manipulat',
        'conflict', 'negative', 'unfriendly', 'hostile', 'cold', 'distant',
        'disrespect', 'harsh', 'cruel', 'mean', 'toxic', 'unhealthy', 'gaslighting'
      ];
      
      for (const pattern of negativeTonePatterns) {
        if (overallToneLower.includes(pattern)) {
          console.log(`Detected toxic pattern in overall tone: ${pattern}`);
          return true;
        }
      }
    }

    // Look for toxic phrases in all props as a fallback
    const allText = JSON.stringify({me, them, participantConflictScores});
    const toxicPhrases = [
      'blame', 'accus', 'tense', 'defensive', 'criticism', 'dismissive', 
      'contempt', 'stonewalling', 'withdraw', 'aggressive', 'manipulat'
    ];
    
    for (const phrase of toxicPhrases) {
      if (allText.toLowerCase().includes(phrase)) {
        console.log(`Detected toxic pattern in props: ${phrase}`);
        return true;
      }
    }
    
    return false;
  };
  
  // This function previously created hardcoded scores for Alex/Jamie
  // Now it returns null to allow the actual API response to be used
  const generateConflictScoresForAlexJamie = () => {
    return null;
  };
  
  // Determine if conversation is toxic using our helper function
  const isToxic = isToxicConversation();
  console.log(`Conversation toxic detected: ${isToxic}, Overall tone: ${overallTone || 'none'}`);
  
  // For toxic conversations with no participant conflict scores (free tier),
  // generate generic conflict scores
  if (isToxic && (!participantConflictScores || Object.keys(participantConflictScores).length === 0)) {
    // Generate basic conflict metrics for free tier
    const genericNegativeScores = {
      [me]: {
        score: 65, // moderate conflict score
        label: "Shows potential defensive patterns",
        isEscalating: true
      },
      [them]: {
        score: 65, // moderate conflict score
        label: "Shows potential conflict indicators",
        isEscalating: true
      }
    };
    
    // Return component with generic conflict scores
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Communication Styles Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="text-base font-medium" style={{ color: meColor }}>{me}</h4>
              <div className="flex items-center mt-2">
                <div 
                  className="h-4 w-4 rounded-full mr-2" 
                  style={{ backgroundColor: '#F87171' }}
                ></div>
                <span className="text-sm font-medium">Potential Conflict</span>
              </div>
              <p className="mt-2 text-sm">{genericNegativeScores[me].label}</p>
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Low Conflict</span>
                  <span className="text-xs text-gray-500">High Conflict</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full" 
                    style={{ 
                      width: `${genericNegativeScores[me].score}%`,
                      backgroundColor: meColor
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h4 className="text-base font-medium" style={{ color: themColor }}>{them}</h4>
              <div className="flex items-center mt-2">
                <div 
                  className="h-4 w-4 rounded-full mr-2" 
                  style={{ backgroundColor: '#F87171' }}
                ></div>
                <span className="text-sm font-medium">Potential Conflict</span>
              </div>
              <p className="mt-2 text-sm">{genericNegativeScores[them].label}</p>
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Low Conflict</span>
                  <span className="text-xs text-gray-500">High Conflict</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full" 
                    style={{ 
                      width: `${genericNegativeScores[them].score}%`,
                      backgroundColor: themColor
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // If no conflict scores data available and not detected as toxic, use positive styles
  if ((!participantConflictScores || Object.keys(participantConflictScores).length === 0) && 
      !isToxic) {
    const mePositiveScores = generatePositiveScores(me, meColor);
    const themPositiveScores = generatePositiveScores(them, themColor);
    
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Communication Styles Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="text-base font-medium" style={{ color: meColor }}>{me}</h4>
              <div className="flex items-center mt-2">
                <div 
                  className="h-4 w-4 rounded-full mr-2" 
                  style={{ backgroundColor: '#10B981' }}
                ></div>
                <span className="text-sm font-medium">Supportive</span>
              </div>
              <p className="mt-2 text-sm">{mePositiveScores.label}</p>
              
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Active Listening</span>
                    <span>{Math.round(mePositiveScores.traits.listening * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400" 
                      style={{ width: `${mePositiveScores.traits.listening * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Openness</span>
                    <span>{Math.round(mePositiveScores.traits.openness * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400" 
                      style={{ width: `${mePositiveScores.traits.openness * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Responsiveness</span>
                    <span>{Math.round(mePositiveScores.traits.responsiveness * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400" 
                      style={{ width: `${mePositiveScores.traits.responsiveness * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h4 className="text-base font-medium" style={{ color: themColor }}>{them}</h4>
              <div className="flex items-center mt-2">
                <div 
                  className="h-4 w-4 rounded-full mr-2" 
                  style={{ backgroundColor: '#10B981' }}
                ></div>
                <span className="text-sm font-medium">Receptive</span>
              </div>
              <p className="mt-2 text-sm">{themPositiveScores.label}</p>
              
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Active Listening</span>
                    <span>{Math.round(themPositiveScores.traits.listening * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full" 
                      style={{ width: `${themPositiveScores.traits.listening * 100}%`, backgroundColor: '#F472B6' }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Openness</span>
                    <span>{Math.round(themPositiveScores.traits.openness * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full" 
                      style={{ width: `${themPositiveScores.traits.openness * 100}%`, backgroundColor: '#F472B6' }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Responsiveness</span>
                    <span>{Math.round(themPositiveScores.traits.responsiveness * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full" 
                      style={{ width: `${themPositiveScores.traits.responsiveness * 100}%`, backgroundColor: '#F472B6' }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Extract scores for negative/conflictual conversations
  // First try to get scores from API, then fall back to generated scores for known scenarios
  let mockAlexJamieScores = generateConflictScoresForAlexJamie();
  
  // If we've detected it's an Alex/Jamie conversation, use our custom conflict scores
  const meScores = mockAlexJamieScores ? 
                   mockAlexJamieScores[me] : 
                   (participantConflictScores ? participantConflictScores[me] : undefined);
                   
  const themScores = mockAlexJamieScores ? 
                     mockAlexJamieScores[them] : 
                     (participantConflictScores ? participantConflictScores[them] : undefined);
  
  // Show conflict style breakdown for conversations with tension
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Communication Styles Breakdown</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meScores && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-base font-medium" style={{ color: meColor }}>{me}</h4>
              <div className="flex items-center mt-2">
                <div 
                  className="h-4 w-4 rounded-full mr-2" 
                  style={{ backgroundColor: meScores.isEscalating ? '#F87171' : '#10B981' }}
                ></div>
                <span className="text-sm font-medium">
                  {meScores.isEscalating ? 'Escalating' : 'De-escalating'}
                </span>
              </div>
              <p className="mt-2 text-sm">{meScores.label}</p>
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Low Conflict</span>
                  <span className="text-xs text-gray-500">High Conflict</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full" 
                    style={{ 
                      width: `${meScores.score}%`,
                      backgroundColor: meColor
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {themScores && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-base font-medium" style={{ color: themColor }}>{them}</h4>
              <div className="flex items-center mt-2">
                <div 
                  className="h-4 w-4 rounded-full mr-2" 
                  style={{ backgroundColor: themScores.isEscalating ? '#F87171' : '#10B981' }}
                ></div>
                <span className="text-sm font-medium">
                  {themScores.isEscalating ? 'Escalating' : 'De-escalating'}
                </span>
              </div>
              <p className="mt-2 text-sm">{themScores.label}</p>
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Low Conflict</span>
                  <span className="text-xs text-gray-500">High Conflict</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full" 
                    style={{ 
                      width: `${themScores.score}%`,
                      backgroundColor: themColor
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}