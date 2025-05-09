import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface TensionContributionsMap {
  [key: string]: any;
  tensionMeaning?: string;
}

interface TensionContributionsProps {
  me: string;
  them: string;
  tier: string;
  tensionContributions?: TensionContributionsMap;
}

export function TensionContributions({ me, them, tier, tensionContributions }: TensionContributionsProps) {
  // Only show for personal+ tiers
  if (tier === 'free' || !tensionContributions) {
    return null;
  }
  
  // Check if we have any actual contributions data
  const meContributions: string[] = Array.isArray(tensionContributions[me]) ? tensionContributions[me] : [];
  const themContributions: string[] = Array.isArray(tensionContributions[them]) ? tensionContributions[them] : [];
  const tensionMeaning: string = typeof tensionContributions.tensionMeaning === 'string' ? tensionContributions.tensionMeaning : '';
  
  if (meContributions.length === 0 && themContributions.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-6">
      <div className="flex items-center mb-3">
        <Activity className="h-5 w-5 text-amber-500 mr-2" />
        <h3 className="text-lg font-semibold">Individual Contributions to Tension</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {meContributions.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-base font-medium mb-2" style={{ color: '#22C9C9' }}>{me}</h4>
              <ul className="space-y-2">
                {meContributions.map((contribution: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <span className="inline-block h-2 w-2 rounded-full mt-1.5 mr-2"
                          style={{ backgroundColor: '#22C9C9' }}></span>
                    <span className="text-sm text-gray-700">{contribution}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {themContributions.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-base font-medium mb-2" style={{ color: '#FF69B4' }}>{them}</h4>
              <ul className="space-y-2">
                {themContributions.map((contribution: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <span className="inline-block h-2 w-2 rounded-full mt-1.5 mr-2"
                          style={{ backgroundColor: '#FF69B4' }}></span>
                    <span className="text-sm text-gray-700">{contribution}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
      
      {tensionMeaning && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-base font-medium mb-2">What This Means</h4>
            <p className="text-sm text-gray-700">{tensionMeaning}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}