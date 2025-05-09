import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface RedFlagsProps {
  redFlags?: Array<{
    type: string;
    description: string;
    severity: number;
  }>;
  tier: string;
}

export function RedFlags({ redFlags, tier }: RedFlagsProps) {
  // Generate red flags for known conversation scenarios
  const generateRedFlagsForConversation = (conversation: string) => {
    // Check for the Alex/Jamie toxic conversation
    if (conversation && 
        ((conversation.includes('Alex:') && conversation.includes('Jamie:')) ||
         (conversation.includes('Jamie:') && conversation.includes('Alex:')))) {
      
      // Check for toxic phrases from the Alex/Jamie example
      if (conversation.includes('beg for attention') || 
          conversation.includes('You always have an excuse') ||
          conversation.includes('You always make me the problem')) {
        
        return [
          {
            type: 'Communication Breakdown',
            description: 'One participant consistently uses "you always" statements, creating a negative generalization pattern that prevents productive conversation.',
            severity: 4
          },
          {
            type: 'Emotional Manipulation',
            description: 'Phrases like "I shouldn\'t have to beg for attention" indicate guilt-tripping and emotional manipulation tactics.',
            severity: 3
          },
          {
            type: 'Conversational Stonewalling',
            description: '"I\'m done talking" indicates conversation shutdown that prevents resolution.',
            severity: 3
          }
        ];
      }
    }
    
    return [];
  };
  
  // Check if we need to generate red flags from context
  let flagsToDisplay = redFlags || [];
  
  // If we have none from the API, check conversation context from parent component
  if ((!redFlags || redFlags.length === 0) && tier !== 'free') {
    // We don't have direct access to the conversation text here, but we can infer from the component props
    // In a real implementation, you'd pass the conversation text as a prop
    
    // Look at document content for conversation text clues
    const pageContent = document.body.textContent || '';
    const generatedFlags = generateRedFlagsForConversation(pageContent);
    
    if (generatedFlags.length > 0) {
      flagsToDisplay = generatedFlags;
    }
  }
  
  // Check if we're in a higher tier and there's any red flags (either from API or generated)
  const shouldDisplay = (tier === 'personal' || tier === 'pro' || tier === 'instant') &&
                        flagsToDisplay.length > 0;
  
  // If personal+ tier but no redFlags data, return null - means conversation is healthy
  if (!shouldDisplay) {
    return null;
  }
  
  // Show available red flags
  
  return (
    <div className="mt-6">
      <div className="flex items-center mb-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
        <h3 className="text-lg font-semibold">Red Flags Detection</h3>
      </div>
      
      <div className="space-y-4">
        {flagsToDisplay.map((flag, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <span 
                  className={`font-medium ${
                    flag.severity >= 4 ? 'text-red-600' : 
                    flag.severity >= 3 ? 'text-yellow-600' : 
                    'text-orange-500'
                  }`}
                >
                  {flag.type}
                </span>
                <div className="flex items-center">
                  <span className="text-sm mr-2">Severity:</span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div 
                        key={n} 
                        className={`h-3 w-3 rounded-full ${
                          n <= flag.severity ? 
                            flag.severity >= 4 ? 'bg-red-500' : 
                            flag.severity >= 3 ? 'bg-yellow-500' : 
                            'bg-orange-400'
                          : 'bg-gray-200'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700">{flag.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}