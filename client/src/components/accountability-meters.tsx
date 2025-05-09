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
  
  // Detect if this is a positive conversation with little or no tension
  const isPositiveConversation = () => {
    // If no contributions data, assume positive conversation
    if (!tensionContributions) return true;
    
    // Check if there are actually tension contributions
    const meContributions = Array.isArray(tensionContributions[me]) ? 
                           (tensionContributions[me] as string[]).length : 0;
    const themContributions = Array.isArray(tensionContributions[them]) ? 
                              (tensionContributions[them] as string[]).length : 0;
    
    // If no contributions found, it's a positive conversation
    return (meContributions === 0 && themContributions === 0);
  };
  
  // For positive conversations with no tension
  if (isPositiveConversation()) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Relationship Health</h3>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-base font-medium text-emerald-600">Healthy Communication Detected</h4>
              <div className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                Excellent
              </div>
            </div>
            
            <div className="bg-emerald-50 p-3 rounded border border-emerald-100 mb-4">
              <p className="text-sm text-emerald-800">
                This conversation shows mutual respect and healthy communication patterns.
                No significant tension was detected between participants.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                    <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"></path>
                    <path d="M7 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>
                    <path d="M17 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>
                  </svg>
                </div>
                <h5 className="text-sm font-medium text-gray-700">Supportive</h5>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                    <path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1H8.3Z"></path>
                    <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                    <circle cx="17.5" cy="17.5" r="3.5"></circle>
                  </svg>
                </div>
                <h5 className="text-sm font-medium text-gray-700">Balanced</h5>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Calculate accountability percentages based on tension contributions for conversations with tension
  let mePercentage = 50;
  let themPercentage = 50;
  
  if (tensionContributions) {
    const meContributions = Array.isArray(tensionContributions[me]) ? 
                           (tensionContributions[me] as string[]).length : 0;
    const themContributions = Array.isArray(tensionContributions[them]) ? 
                              (tensionContributions[them] as string[]).length : 0;
    const total = meContributions + themContributions;
    
    if (total > 0) {
      mePercentage = Math.round((meContributions / total) * 100);
      themPercentage = Math.round((themContributions / total) * 100);
    }
  }
  
  // For conversations with tension - show the accountability meters
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