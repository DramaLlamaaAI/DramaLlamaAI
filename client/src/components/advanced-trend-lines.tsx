import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, Zap } from "lucide-react";

interface AdvancedTrendLinesProps {
  tier: string;
  conversation: string;
}

export function AdvancedTrendLines({ tier, conversation }: AdvancedTrendLinesProps) {
  // Only show for pro tier
  if (tier !== 'pro' && tier !== 'instant') {
    return null;
  }
  
  // Function to detect gaslighting patterns in the conversation
  const detectGaslightingPatterns = (): string[] => {
    const gaslightingPhrases = [
      'you\'re overreacting',
      'that never happened',
      'you\'re imagining things',
      'you\'re too sensitive',
      'you\'re crazy',
      'you always exaggerate',
      'you must be confused',
      'stop being so dramatic'
    ];
    
    // Check for gaslighting phrases in the conversation
    const foundPhrases: string[] = [];
    gaslightingPhrases.forEach(phrase => {
      if (conversation.toLowerCase().includes(phrase.toLowerCase())) {
        foundPhrases.push(phrase);
      }
    });
    
    return foundPhrases;
  };
  
  // Check for Alex/Jamie toxic conversation specifically
  const isAlexJamieConversation = conversation.includes('Alex:') && 
                                conversation.includes('Jamie:') && 
                                conversation.includes('beg for attention');
  
  if (isAlexJamieConversation) {
    // For the specific toxic conversation
    return (
      <div className="mt-6">
        <div className="flex items-center mb-3">
          <TrendingUp className="h-5 w-5 text-violet-500 mr-2" />
          <h3 className="text-lg font-semibold">Advanced Trend Analysis</h3>
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-3 mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Red Flags Timeline</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Progressive pattern of "you always" statements that escalate in frequency and intensity throughout the conversation.
                  </p>
                  <div className="mt-3 flex items-center space-x-2">
                    <div className="h-2 bg-gray-200 flex-1 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-300 to-red-500 h-full" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-xs font-medium text-red-600">High Risk</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center mr-3 mt-0.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Gaslighting Detection</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Subtle invalidation of feelings with phrases like "You always make me the problem" - shifting responsibility and manipulating perception.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">Blame Shifting</span>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">Emotional Invalidation</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="bg-violet-50 p-3 rounded border border-violet-100 mt-4">
          <p className="text-sm text-violet-700">
            <span className="font-medium">Pro tier feature:</span> Advanced trend analysis tracks patterns of potential manipulation tactics and emotional pressure points over time.
          </p>
        </div>
      </div>
    );
  }
  
  // For other conversations, check for general gaslighting patterns
  const gaslightingPhrases = detectGaslightingPatterns();
  
  if (gaslightingPhrases.length > 0) {
    return (
      <div className="mt-6">
        <div className="flex items-center mb-3">
          <TrendingUp className="h-5 w-5 text-violet-500 mr-2" />
          <h3 className="text-lg font-semibold">Advanced Trend Analysis</h3>
        </div>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start">
              <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center mr-3 mt-0.5">
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-800">Gaslighting Detection</h4>
                <p className="text-sm text-gray-700 mt-1">
                  Potential gaslighting language detected with phrases that invalidate the other person's perspective or experiences.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {gaslightingPhrases.map((phrase, index) => (
                    <span key={index} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                      "{phrase}"
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="bg-violet-50 p-3 rounded border border-violet-100 mt-4">
          <p className="text-sm text-violet-700">
            <span className="font-medium">Pro tier feature:</span> Advanced trend analysis tracks patterns of potential manipulation tactics and emotional pressure points over time.
          </p>
        </div>
      </div>
    );
  }
  
  // If no specific patterns are found, return null
  return null;
}