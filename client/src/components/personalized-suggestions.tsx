import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

interface PersonalizedSuggestionsProps {
  me: string;
  them: string;
  tier: string;
  suggestions?: string[];
}

export function PersonalizedSuggestions({ me, them, tier, suggestions }: PersonalizedSuggestionsProps) {
  // Only show for personal+ tiers
  if (tier === 'free' || !suggestions || suggestions.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-6">
      <div className="flex items-center mb-3">
        <Shield className="h-5 w-5 text-purple-500 mr-2" />
        <h3 className="text-lg font-semibold">Personalized Improvement Suggestions</h3>
      </div>
      
      <div className="space-y-3">
        {suggestions.map((suggestion, idx) => {
          // Determine if suggestion is specifically for one participant
          const forMe = suggestion.toLowerCase().includes(me.toLowerCase());
          const forThem = suggestion.toLowerCase().includes(them.toLowerCase());
          
          return (
            <Card key={idx}>
              <CardContent className="p-4">
                <div 
                  className="p-3 rounded"
                  style={{
                    backgroundColor: forMe 
                      ? 'rgba(34, 201, 201, 0.1)'
                      : forThem 
                        ? 'rgba(255, 105, 180, 0.1)'
                        : 'rgba(147, 51, 234, 0.1)',
                  }}
                >
                  <div className="flex items-start">
                    <div className="mt-1 mr-3" style={{
                      color: forMe 
                        ? '#22C9C9'
                        : forThem 
                          ? '#FF69B4'
                          : '#9333EA'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                      </svg>
                    </div>
                    <div>
                      {forMe && (
                        <div className="text-xs font-medium mb-1" style={{ color: '#22C9C9' }}>For {me}</div>
                      )}
                      {forThem && (
                        <div className="text-xs font-medium mb-1" style={{ color: '#FF69B4' }}>For {them}</div>
                      )}
                      {!forMe && !forThem && (
                        <div className="text-xs font-medium mb-1" style={{ color: '#9333EA' }}>For both participants</div>
                      )}
                      <p className="text-sm" style={{
                        color: forMe 
                          ? 'rgba(34, 201, 201, 0.9)'
                          : forThem 
                            ? 'rgba(255, 105, 180, 0.9)'
                            : 'rgba(147, 51, 234, 0.9)'
                      }}>
                        {suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}