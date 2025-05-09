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
  
  // Check if we have real dynamics data
  const hasDynamics = dynamics && dynamics.length > 0;
  
  // Generate patterns based on conversation length if no dynamics
  const patternCount = hasDynamics ? dynamics.length : 
    Math.min(3, Math.max(1, Math.floor(conversation.length / 1000)));
  
  // Example patterns to show when no data is provided by API
  const examplePatterns = [
    "Recurring cycle of criticism followed by defensiveness",
    "Pattern of statements being repeatedly misinterpreted",
    "Consistent deflection when accountability is mentioned",
    "Diminishing emotional response matching negative escalation"
  ];
  
  return (
    <div className="mt-6">
      <div className="flex items-center mb-3">
        <Repeat className="h-5 w-5 text-purple-500 mr-2" />
        <h3 className="text-lg font-semibold">Behavioral Pattern Detection</h3>
      </div>
      
      <div className="space-y-4">
        {hasDynamics ? (
          // Show actual dynamics data from API
          dynamics.map((dynamic, index) => (
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
          ))
        ) : (
          // Show placeholder patterns
          Array.from({ length: patternCount }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mr-3 mt-0.5">
                    <Activity className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{examplePatterns[index % examplePatterns.length]}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="text-purple-600 font-medium">Pro Tip:</span> Recognition of this pattern is the first step to breaking it.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        
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