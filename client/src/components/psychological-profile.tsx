import { ChatAnalysisResponse } from "@/lib/openai";

interface PsychologicalProfileProps {
  result: ChatAnalysisResponse;
  me: string;
  them: string;
}

type ProfileData = {
  behavior: string;
  emotionalState: string;
  riskIndicators: string;
};

export function PsychologicalProfile({ result, me, them }: PsychologicalProfileProps) {
  if (!result.psychologicalProfile) return null;
  
  return (
    <div className="bg-purple-50 p-4 rounded-lg mb-4 border border-purple-100">
      <h4 className="font-medium mb-3 text-purple-700">Psychological Profile</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(result.psychologicalProfile).map(([participant, profile]) => {
          // Cast the profile to the correct type
          const profileData = profile as ProfileData;
          
          // Determine if this is the me or them participant
          const isMe = participant.toLowerCase() === me.toLowerCase();
          const color = isMe ? '#22C9C9' : '#FF69B4';
          const bgColor = isMe ? 'rgba(34, 201, 201, 0.05)' : 'rgba(255, 105, 180, 0.05)';
          const borderColor = isMe ? 'rgba(34, 201, 201, 0.3)' : 'rgba(255, 105, 180, 0.3)';
          
          return (
            <div 
              key={participant}
              className="p-4 rounded-md border"
              style={{ 
                backgroundColor: bgColor,
                borderColor: borderColor 
              }}
            >
              <h5 
                className="text-base font-medium mb-2" 
                style={{ color }}
              >
                {participant}
              </h5>
              
              <div className="space-y-3">
                <div>
                  <h6 className="text-sm font-medium mb-1" style={{ color }}>Behavior</h6>
                  <p className="text-sm">{profileData.behavior}</p>
                </div>
                
                <div>
                  <h6 className="text-sm font-medium mb-1" style={{ color }}>Emotional State</h6>
                  <p className="text-sm">{profileData.emotionalState}</p>
                </div>
                
                <div>
                  <h6 className="text-sm font-medium mb-1" style={{ color }}>Risk Indicators</h6>
                  <p className="text-sm">{profileData.riskIndicators}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}