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
}

export function CommunicationStyles({ me, them, participantConflictScores }: CommunicationStylesProps) {
  // If no data is available, show visual placeholder for Personal/Pro tiers
  if (!participantConflictScores) {
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-3">Communication Styles Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="text-base font-medium" style={{ color: '#22C9C9' }}>{me}</h4>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm">Assertiveness</span>
                  <div className="h-2 bg-gray-200 rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-teal-400" style={{ width: '65%' }}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm">Defensiveness</span>
                  <div className="h-2 bg-gray-200 rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-teal-400" style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm">Listening</span>
                  <div className="h-2 bg-gray-200 rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-teal-400" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h4 className="text-base font-medium" style={{ color: '#FF69B4' }}>{them}</h4>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm">Assertiveness</span>
                  <div className="h-2 bg-gray-200 rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-pink-400" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm">Defensiveness</span>
                  <div className="h-2 bg-gray-200 rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-pink-400" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm">Listening</span>
                  <div className="h-2 bg-gray-200 rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-pink-400" style={{ width: '50%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Default styling colors
  const meColor = '#22C9C9';
  const themColor = '#FF69B4';
  
  // Extract scores if available
  const meScores = participantConflictScores[me];
  const themScores = participantConflictScores[them];
  
  return (
    <div className="mt-4">
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