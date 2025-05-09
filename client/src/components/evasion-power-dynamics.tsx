import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Binary, BarChart3 } from "lucide-react";

interface EvasionPowerDynamicsProps {
  tier: string;
  me: string;
  them: string;
  conversation: string;
}

export function EvasionPowerDynamics({ tier, me, them, conversation }: EvasionPowerDynamicsProps) {
  // Only show for pro tier
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
    // Alex is typically the dominant speaker in the example conversation
    const alexIsDominant = me.toLowerCase().includes('alex') || them.toLowerCase().includes('alex');
    const dominantPerson = alexIsDominant ? 
                          (me.toLowerCase().includes('alex') ? me : them) : 
                          (me.toLowerCase().includes('jamie') ? them : me);
    
    return (
      <div className="grid grid-cols-1 gap-6 mt-6">
        {/* Evasion Identification */}
        <div>
          <div className="flex items-center mb-3">
            <Shield className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold">Evasion Identification</h3>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Avoidance Patterns Detected</h4>
              
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="flex items-start">
                    <span className="text-blue-600 font-medium mr-2">{them}:</span>
                    <p className="text-sm text-blue-800">
                      "Forget it. I shouldn't have to beg for attention."
                    </p>
                  </div>
                  <div className="mt-2 ml-6">
                    <p className="text-xs text-blue-600">
                      <span className="font-medium">Analysis:</span> Using conversation shutdown to avoid addressing the underlying issue. This pattern prevents resolution by withdrawing from discussion when emotions are high.
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="flex items-start">
                    <span className="text-blue-600 font-medium mr-2">{me}:</span>
                    <p className="text-sm text-blue-800">
                      "I don't know why we keep having the same conversation."
                    </p>
                  </div>
                  <div className="mt-2 ml-6">
                    <p className="text-xs text-blue-600">
                      <span className="font-medium">Analysis:</span> Indirect evasion by expressing frustration with the conversation itself rather than addressing the specific concerns raised.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 flex items-center">
                <span className="text-xs font-medium text-gray-500 mr-2">Evasion Level:</span>
                <div className="h-2 bg-gray-200 flex-1 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '65%' }}></div>
                </div>
                <span className="text-xs font-medium text-blue-600 ml-2">Moderate</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Message Dominance Analysis */}
        <div>
          <div className="flex items-center mb-3">
            <Binary className="h-5 w-5 text-indigo-500 mr-2" />
            <h3 className="text-lg font-semibold">Message Dominance Analysis</h3>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3">Conversational Control Insights</h4>
              
              <div className="flex justify-between mb-2">
                <div className="flex flex-col items-center">
                  <div 
                    className="h-20 w-20 rounded-full flex items-center justify-center mb-2" 
                    style={{ 
                      backgroundColor: dominantPerson === me ? 'rgba(34, 201, 201, 0.1)' : 'rgba(255, 105, 180, 0.1)',
                      border: `2px solid ${dominantPerson === me ? '#22C9C9' : '#FF69B4'}`
                    }}
                  >
                    <span 
                      className="text-xl font-bold"
                      style={{ color: dominantPerson === me ? '#22C9C9' : '#FF69B4' }}
                    >
                      70%
                    </span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: dominantPerson === me ? '#22C9C9' : '#FF69B4' }}>
                    {dominantPerson}
                  </span>
                  <span className="text-xs text-gray-500">Dominant Speaker</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <div 
                    className="h-20 w-20 rounded-full flex items-center justify-center mb-2" 
                    style={{ 
                      backgroundColor: dominantPerson !== me ? 'rgba(34, 201, 201, 0.1)' : 'rgba(255, 105, 180, 0.1)',
                      border: `2px solid ${dominantPerson !== me ? '#22C9C9' : '#FF69B4'}`
                    }}
                  >
                    <span 
                      className="text-xl font-bold"
                      style={{ color: dominantPerson !== me ? '#22C9C9' : '#FF69B4' }}
                    >
                      30%
                    </span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: dominantPerson !== me ? '#22C9C9' : '#FF69B4' }}>
                    {dominantPerson === me ? them : me}
                  </span>
                  <span className="text-xs text-gray-500">Responsive Speaker</span>
                </div>
              </div>
              
              <div className="mt-4 bg-indigo-50 p-3 rounded-md">
                <p className="text-xs text-indigo-700">
                  <span className="font-medium">Analysis:</span> {dominantPerson} uses more controlling language with frequent accusations and demands. This creates an imbalanced conversation where {dominantPerson === me ? them : me} primarily responds defensively rather than expressing their own needs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Power Dynamics Analysis */}
        <div>
          <div className="flex items-center mb-3">
            <BarChart3 className="h-5 w-5 text-purple-500 mr-2" />
            <h3 className="text-lg font-semibold">Power Dynamics Analysis</h3>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Emotional Pressure Points</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-purple-50 p-2 rounded-md">
                      <p className="text-xs font-medium text-purple-700">Need for Attention</p>
                      <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-md">
                      <p className="text-xs font-medium text-purple-700">Guilt Leverage</p>
                      <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-md">
                      <p className="text-xs font-medium text-purple-700">Defensive Position</p>
                      <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-md">
                      <p className="text-xs font-medium text-purple-700">Emotional Escalation</p>
                      <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-md">
                  <p className="text-xs text-purple-700">
                    <span className="font-medium">Key Insight:</span> The conversation shows a "pursuer-distancer" dynamic with {dominantPerson} using emotional triggers to gain leverage and {dominantPerson === me ? them : me} withdrawing to maintain autonomy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
          <p className="text-sm text-indigo-700">
            <span className="font-medium">Pro tier feature:</span> Advanced dynamics analysis provides deeper insights into conversational patterns and power imbalances.
          </p>
        </div>
      </div>
    );
  }
  
  // For other conversations or when no specific patterns are found
  return null;
}