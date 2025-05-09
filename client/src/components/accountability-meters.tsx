import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface AccountabilityMetersProps {
  me: string;
  them: string;
  tier: string;
  tensionContributions?: {
    [participant: string]: string[];
  };
}

export function AccountabilityMeters({ me, them, tier, tensionContributions }: AccountabilityMetersProps) {
  // Only show for personal+ tiers
  if (tier === 'free') {
    return null;
  }
  
  // Calculate accountability percentages based on tension contributions if available
  let mePercentage = 50;
  let themPercentage = 50;
  
  if (tensionContributions) {
    const meContributions = tensionContributions[me]?.length || 0;
    const themContributions = tensionContributions[them]?.length || 0;
    const total = meContributions + themContributions;
    
    if (total > 0) {
      mePercentage = Math.round((meContributions / total) * 100);
      themPercentage = Math.round((themContributions / total) * 100);
    }
  }
  
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Accountability Indicators</h3>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col space-y-6">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium" style={{ color: '#22C9C9' }}>{me}</span>
                <span className="text-sm">{mePercentage}% contribution to tension</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full" 
                  style={{ 
                    width: `${mePercentage}%`,
                    backgroundColor: '#22C9C9'
                  }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium" style={{ color: '#FF69B4' }}>{them}</span>
                <span className="text-sm">{themPercentage}% contribution to tension</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full" 
                  style={{ 
                    width: `${themPercentage}%`,
                    backgroundColor: '#FF69B4'
                  }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-gray-50 p-3 rounded border border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">What this means:</span> {' '}
              {tensionContributions && tensionContributions.tensionMeaning ? 
                tensionContributions.tensionMeaning :
                "This is an estimate of how each participant appears to be contributing to any tension in the conversation, based on language patterns and communication dynamics."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}