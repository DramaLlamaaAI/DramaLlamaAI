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
  // If no data available, show a visual placeholder for Personal/Pro tiers
  if (!redFlags && (tier === 'personal' || tier === 'pro' || tier === 'instant')) {
    return (
      <div className="mt-6">
        <div className="flex items-center mb-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
          <h3 className="text-lg font-semibold">Red Flags Detection</h3>
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <span className="font-medium text-yellow-600">Communication Avoidance</span>
                <div className="flex items-center">
                  <span className="text-sm mr-2">Severity:</span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div 
                        key={n} 
                        className={`h-3 w-3 rounded-full ${n <= 3 ? 'bg-yellow-500' : 'bg-gray-200'}`}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700">Pattern where direct questions are consistently diverted or ignored.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <span className="font-medium text-red-600">Criticism Pattern</span>
                <div className="flex items-center">
                  <span className="text-sm mr-2">Severity:</span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div 
                        key={n} 
                        className={`h-3 w-3 rounded-full ${n <= 4 ? 'bg-red-500' : 'bg-gray-200'}`}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700">Repeated personal criticism instead of addressing the issue at hand.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // If no red flags or not allowed to see them based on tier
  if (!redFlags || tier === 'free') {
    return null;
  }
  
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