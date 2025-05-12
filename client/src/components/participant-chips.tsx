import React from "react";
import { getParticipantColor } from "@/lib/utils";

interface ParticipantChipsProps {
  me: string;
  them: string;
  participantTones?: {
    [key: string]: string;
  };
}

/**
 * Component to display participant names as colored chips
 * with their detected tones if available
 */
export default function ParticipantChips({
  me,
  them,
  participantTones
}: ParticipantChipsProps) {
  const meColor = getParticipantColor(true);
  const themColor = getParticipantColor(false);
  
  return (
    <div className="flex flex-wrap gap-3 mt-4">
      <div 
        className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center"
        style={{ 
          backgroundColor: `${meColor}20`,
          borderColor: `${meColor}40`,
          borderWidth: '1px',
          color: meColor 
        }}
      >
        <span>{me}</span>
        {participantTones && participantTones[me] && (
          <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-background">{participantTones[me]}</span>
        )}
      </div>
      
      <div 
        className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center"
        style={{ 
          backgroundColor: `${themColor}20`,
          borderColor: `${themColor}40`,
          borderWidth: '1px',
          color: themColor 
        }}
      >
        <span>{them}</span>
        {participantTones && participantTones[them] && (
          <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-background">{participantTones[them]}</span>
        )}
      </div>
    </div>
  );
}