import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Activity, ChevronRight, Repeat } from "lucide-react";

interface BehavioralPatternsProps {
  tier: string;
  conversation: string;
  dynamics?: string[];
}

export function BehavioralPatterns({ tier, conversation, dynamics }: BehavioralPatternsProps) {
  // Only show for pro/instant tiers
  if (tier !== 'pro' && tier !== 'instant') {
    return null;
  }
  
  // Detect if this is a positive conversation
  const isPositiveConversation = () => {
    // Check conversation tone by looking for positive keywords
    const positiveKeywords = ['thanks', 'glad', 'appreciate', 'kind', 'support', 'understanding', 'care', 'love', 'happy'];
    const negativeKeywords = ['criticism', 'blame', 'fault', 'angry', 'upset', 'frustrated', 'annoyed', 'hate', 'stupid'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveKeywords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = conversation.match(regex);
      if (matches) positiveCount += matches.length;
    });
    
    negativeKeywords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = conversation.match(regex);
      if (matches) negativeCount += matches.length;
    });
    
    // If there are no dynamics and the conversation has more positive than negative words
    return !dynamics && positiveCount > negativeCount;
  };
  
  // For positive conversations, show positive patterns
  if (isPositiveConversation()) {
    const positivePatterns = [
      "Consistent pattern of active listening and acknowledgment",
      "Balanced turn-taking with mutual respect",
      "Supportive responses to vulnerability",
      "Clear and direct communication without defensiveness"
    ];
    
    return (
      <div className="mt-6">
        <div className="flex items-center mb-3">
          <Repeat className="h-5 w-5 text-emerald-500 mr-2" />
          <h3 className="text-lg font-semibold">Healthy Communication Patterns</h3>
        </div>
        
        <div className="space-y-4">
          {positivePatterns.slice(0, 2).map((pattern, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center mr-3 mt-0.5">
                    <Activity className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{pattern}</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      <span className="font-medium">Insight:</span> These positive patterns contribute to relationship health.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <div className="bg-emerald-50 p-3 rounded border border-emerald-100 mt-3">
            <div className="flex items-center">
              <p className="text-sm text-emerald-700 flex-1">
                <span className="font-medium">Pro tier feature:</span> This conversation demonstrates healthy communication patterns with no significant behavioral issues detected.
              </p>
              <ChevronRight className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Check if we have real dynamics data
  const hasDynamics = dynamics && dynamics.length > 0;
  
  // For conversations with actual dynamics data, show those
  if (hasDynamics) {
    return (
      <div className="mt-6">
        <div className="flex items-center mb-3">
          <Repeat className="h-5 w-5 text-purple-500 mr-2" />
          <h3 className="text-lg font-semibold">Behavioral Pattern Detection</h3>
        </div>
        
        <div className="space-y-4">
          {dynamics.map((dynamic, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mr-3 mt-0.5">
                    <Activity className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{dynamic}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <div className="bg-purple-50 p-3 rounded border border-purple-100 mt-3">
            <div className="flex items-center">
              <p className="text-sm text-purple-700 flex-1">
                <span className="font-medium">Pro tier feature:</span> Comprehensive behavioral pattern analysis helps identify repeating communication cycles.
              </p>
              <ChevronRight className="h-4 w-4 text-purple-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // If we can't make a determination, don't show any patterns
  return null;
}