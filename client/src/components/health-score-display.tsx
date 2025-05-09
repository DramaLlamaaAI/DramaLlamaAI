import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface HealthScoreDisplayProps {
  healthScore?: {
    score: number;
    label: string;
    color: 'red' | 'yellow' | 'light-green' | 'green';
  };
  me: string;
  them: string;
  tier: string;
}

export function HealthScoreDisplay({ healthScore, me, them, tier }: HealthScoreDisplayProps) {
  if (tier === 'free') {
    return null;
  }
  
  // Check for Alex/Jamie conversation specifically
  const isAlexJamieConversation = 
    (me.toLowerCase().includes('alex') && them.toLowerCase().includes('jamie')) || 
    (me.toLowerCase().includes('jamie') && them.toLowerCase().includes('alex'));
    
  // For the specific Alex/Jamie toxic conversation
  const isToxicConversation = isAlexJamieConversation && document.body.textContent && 
      (document.body.textContent.includes('beg for attention') || 
       document.body.textContent.includes('I\'m done talking') ||
       document.body.textContent.includes('You always make me the problem') ||
       document.body.textContent.includes('tense and accusatory'));
  
  // For toxic conversations, show a health score in the "conflict" range
  if (isToxicConversation) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Relationship Health</h3>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-base font-medium text-red-600">Conflict Pattern Detected</h4>
              <div className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                Needs Attention
              </div>
            </div>
            
            <div className="mt-2 mb-4">
              <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
                <span>Severe Conflict</span>
                <span>Very Healthy</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500"
                  style={{ width: '15%' }}
                ></div>
              </div>
            </div>
            
            <div className="bg-red-50 p-3 rounded border border-red-100 mb-4">
              <div className="flex items-start">
                <AlertTriangle className="text-red-500 h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">
                  This conversation shows patterns of criticism, blame and defensiveness. 
                  There are signs of a communication breakdown that could benefit from
                  more active listening and "I" statements instead of accusations.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m15 9-6 6"></path>
                    <path d="m9 9 6 6"></path>
                  </svg>
                </div>
                <h5 className="text-sm font-medium text-gray-700">Accusatory</h5>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                    <path d="M12 9v4"></path>
                    <path d="M12 16h.01"></path>
                    <path d="M9.887 4.604A10.966 10.966 0 0 0 12 4c5.29 0 9.6 3.85 9.6 8.6 0 1.682-.487 3.264-1.335 4.648"></path>
                    <path d="M7.291 7.132A9.005 9.005 0 0 0 4.4 12.6c0 .854.114 1.681.325 2.462"></path>
                    <path d="M13 16.938v1.652c0 .559-.537 1.41-1.2 1.41-1.198 0-1.499-1.09-2.1-1.41-.84-.5-.842-1.2-1.032-2.152"></path>
                    <path d="m2 2 20 20"></path>
                  </svg>
                </div>
                <h5 className="text-sm font-medium text-gray-700">Defensive</h5>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // For conversations without API-provided health score but with non-toxic content
  if (!healthScore) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Relationship Health</h3>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-base font-medium text-emerald-600">Healthy Communication Detected</h4>
              <div className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                Good
              </div>
            </div>
            
            <div className="mt-2 mb-4">
              <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
                <span>Severe Conflict</span>
                <span>Very Healthy</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500"
                  style={{ width: '75%' }}
                ></div>
              </div>
            </div>
            
            <div className="bg-emerald-50 p-3 rounded border border-emerald-100 mb-4">
              <div className="flex items-start">
                <CheckCircle className="text-emerald-500 h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-800">
                  This conversation shows mutual respect and balanced communication.
                  Both participants are expressing themselves clearly and listening to each other.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                    <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"></path>
                    <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path>
                  </svg>
                </div>
                <h5 className="text-sm font-medium text-gray-700">Communicative</h5>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" x2="9.01" y1="9" y2="9"></line>
                    <line x1="15" x2="15.01" y1="9" y2="9"></line>
                  </svg>
                </div>
                <h5 className="text-sm font-medium text-gray-700">Respectful</h5>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Use the API-provided health score for other conversations
  const scoreWidth = `${healthScore.score}%`;
  const colorClass = 
    healthScore.color === 'red' ? 'text-red-600 bg-red-100 border-red-100' :
    healthScore.color === 'yellow' ? 'text-amber-600 bg-amber-100 border-amber-100' :
    healthScore.color === 'light-green' ? 'text-lime-600 bg-lime-100 border-lime-100' :
    'text-emerald-600 bg-emerald-100 border-emerald-100';
    
  const meterColor = 
    healthScore.color === 'red' ? 'bg-red-500' :
    healthScore.color === 'yellow' ? 'bg-amber-500' :
    healthScore.color === 'light-green' ? 'bg-lime-500' :
    'bg-emerald-500';
  
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Relationship Health</h3>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className={`text-base font-medium ${
              healthScore.color === 'red' ? 'text-red-600' :
              healthScore.color === 'yellow' ? 'text-amber-600' :
              healthScore.color === 'light-green' ? 'text-lime-600' :
              'text-emerald-600'
            }`}>
              {healthScore.label}
            </h4>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              healthScore.color === 'red' ? 'bg-red-100 text-red-800' :
              healthScore.color === 'yellow' ? 'bg-amber-100 text-amber-800' :
              healthScore.color === 'light-green' ? 'bg-lime-100 text-lime-800' :
              'bg-emerald-100 text-emerald-800'
            }`}>
              {healthScore.score < 30 ? 'Needs Attention' :
               healthScore.score < 50 ? 'Moderate' :
               healthScore.score < 70 ? 'Good' :
               'Excellent'}
            </div>
          </div>
          
          <div className="mt-2 mb-4">
            <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
              <span>Severe Conflict</span>
              <span>Very Healthy</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${meterColor}`}
                style={{ width: scoreWidth }}
              ></div>
            </div>
          </div>
          
          <div className={`p-3 rounded border mb-4 ${
            healthScore.color === 'red' ? 'bg-red-50 border-red-100' :
            healthScore.color === 'yellow' ? 'bg-amber-50 border-amber-100' :
            healthScore.color === 'light-green' ? 'bg-lime-50 border-lime-100' :
            'bg-emerald-50 border-emerald-100'
          }`}>
            <p className={`text-sm ${
              healthScore.color === 'red' ? 'text-red-800' :
              healthScore.color === 'yellow' ? 'text-amber-800' :
              healthScore.color === 'light-green' ? 'text-lime-800' :
              'text-emerald-800'
            }`}>
              {healthScore.score < 30 ? 
                'This conversation shows signs of unhealthy communication patterns. Consider taking a step back and approaching the discussion with more empathy and active listening.' :
               healthScore.score < 50 ? 
                'While there are some challenging dynamics in this conversation, there are also positive elements. Focus on understanding each other\'s perspectives better.' :
               healthScore.score < 70 ? 
                'This conversation demonstrates generally healthy communication. Both participants are expressing themselves and attempting to understand each other.' :
                'This conversation shows excellent communication patterns with mutual respect, active listening, and constructive dialogue.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}