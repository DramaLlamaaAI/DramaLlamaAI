import React from "react";
import { getParticipantColor } from "@/lib/utils";

interface ParticipantScores {
  [participant: string]: {
    score: number;
    label: string;
    isEscalating: boolean;
  }
}

interface ParticipantEmotionsProps {
  participantScores: ParticipantScores;
  me: string;
  them: string;
}

/**
 * Component to display participant emotional scores and escalation status
 */
export default function ParticipantEmotions({
  participantScores,
  me,
  them
}: ParticipantEmotionsProps) {
  if (!participantScores || Object.keys(participantScores).length === 0) {
    return null;
  }

  const meColor = getParticipantColor(true);
  const themColor = getParticipantColor(false);
  
  const meScore = participantScores[me];
  const themScore = participantScores[them];
  
  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Participant Emotional States</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {meScore && (
          <div 
            className="rounded-md p-4"
            style={{ 
              backgroundColor: `${meColor}10`,
              borderColor: `${meColor}30`,
              borderWidth: '1px'
            }}
          >
            <h4 className="font-medium mb-2" style={{ color: meColor }}>{me}</h4>
            <div className="flex justify-between items-center mb-2">
              <span>Tension Level:</span>
              <span className="font-semibold">{meScore.score}/10</span>
            </div>
            <div className="h-2 w-full bg-background rounded-full mb-3">
              <div 
                className="h-full rounded-full"
                style={{ 
                  width: `${meScore.score * 10}%`, 
                  backgroundColor: meColor 
                }}
              />
            </div>
            <div className="text-sm">
              <span className="font-medium">Status: </span>
              <span>{meScore.label}</span>
              {meScore.isEscalating && (
                <span className="text-destructive ml-2">(Escalating)</span>
              )}
            </div>
          </div>
        )}
        
        {themScore && (
          <div 
            className="rounded-md p-4"
            style={{ 
              backgroundColor: `${themColor}10`,
              borderColor: `${themColor}30`,
              borderWidth: '1px'
            }}
          >
            <h4 className="font-medium mb-2" style={{ color: themColor }}>{them}</h4>
            <div className="flex justify-between items-center mb-2">
              <span>Tension Level:</span>
              <span className="font-semibold">{themScore.score}/10</span>
            </div>
            <div className="h-2 w-full bg-background rounded-full mb-3">
              <div 
                className="h-full rounded-full"
                style={{ 
                  width: `${themScore.score * 10}%`, 
                  backgroundColor: themColor 
                }}
              />
            </div>
            <div className="text-sm">
              <span className="font-medium">Status: </span>
              <span>{themScore.label}</span>
              {themScore.isEscalating && (
                <span className="text-destructive ml-2">(Escalating)</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}