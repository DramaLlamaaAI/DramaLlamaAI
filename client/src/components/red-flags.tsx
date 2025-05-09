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
  // Check if we're in a higher tier and there's a healthScore available in parent component
  // Also check if there are any actual red flags detected
  const shouldDisplay = (tier === 'personal' || tier === 'pro' || tier === 'instant') &&
                        (redFlags && redFlags.length > 0);
  
  // If personal+ tier but no redFlags data, return null - means conversation is healthy
  if (!shouldDisplay) {
    return null;
  }
  
  // In a real situation with red flags, show them
  
  return (
    <div className="mt-6">
      <div className="flex items-center mb-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
        <h3 className="text-lg font-semibold">Red Flags Detection</h3>
      </div>
      
      <div className="space-y-4">
        {redFlags.map((flag, index) => (
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