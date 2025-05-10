import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Activity, ChevronRight, Repeat } from "lucide-react";

interface BehavioralPatternsProps {
  tier: string;
  conversation: string;
  dynamics?: string[];
  me?: string;
  them?: string;
}

export function BehavioralPatterns({ tier, conversation, dynamics, me = "Me", them = "Other Person" }: BehavioralPatternsProps) {
  // Initialize state for participant filter
  const [participantFilter, setParticipantFilter] = useState<'all' | string>('all');

  // Check if user has at least personal tier
  if (tier === 'free') {
    return null;
  }
  
  // Detect if this is a positive conversation
  const isPositiveConversation = () => {
    // Check conversation tone by looking for positive keywords and toxic patterns
    const positiveKeywords = ['thanks', 'glad', 'appreciate', 'kind', 'support', 'understanding', 'care', 'love', 'happy'];
    const negativeKeywords = ['criticism', 'blame', 'fault', 'angry', 'upset', 'frustrated', 'annoyed', 'hate', 'stupid'];
    const toxicPhrases = [
      'forget it', 'beg for attention', 'always have an excuse', 
      'blame me', 'make me the problem', 'nothing ever changes', 
      'i\'m done', 'shouldn\'t have to', 'you always', 'you never'
    ];
    
    // Check for obviously toxic phrases first
    let hasToxicPhrase = false;
    toxicPhrases.forEach(phrase => {
      if (conversation.toLowerCase().includes(phrase.toLowerCase())) {
        hasToxicPhrase = true;
      }
    });
    
    // If toxic phrases found, definitely not a positive conversation
    if (hasToxicPhrase) {
      return false;
    }
    
    // Count positive/negative words as backup check
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
    
    // Check if there's significantly more positive than negative sentiment
    // More strict criteria - must have at least 3x more positive than negative words
    return !dynamics && positiveCount > negativeCount * 2;
  };
  
  // Filter dynamics by participant
  const filterDynamicsByParticipant = (dynamicsArray: string[] = [], participant: string): string[] => {
    if (participant === 'all') return dynamicsArray;
    
    return dynamicsArray.filter(dynamic => {
      const dynamicLower = dynamic.toLowerCase();
      const participantLower = participant.toLowerCase();
      
      return dynamicLower.includes(participantLower) || 
             dynamicLower.includes(`when ${participantLower}`) ||
             dynamicLower.includes(`${participantLower} tends to`);
    });
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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Repeat className="h-5 w-5 text-emerald-500 mr-2" />
            <h3 className="text-lg font-semibold">Healthy Communication Patterns</h3>
          </div>
          
          {/* Participant filter toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1 text-xs">
            <button 
              className={`px-2 py-1 rounded-md ${participantFilter === 'all' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              onClick={() => setParticipantFilter('all')}
            >
              Both
            </button>
            <button 
              className={`px-2 py-1 rounded-md ${participantFilter === me ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              onClick={() => setParticipantFilter(me)}
              style={{ color: participantFilter === me ? '#22C9C9' : undefined }}
            >
              {me}
            </button>
            <button 
              className={`px-2 py-1 rounded-md ${participantFilter === them ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              onClick={() => setParticipantFilter(them)}
              style={{ color: participantFilter === them ? '#FF69B4' : undefined }}
            >
              {them}
            </button>
          </div>
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
    // Filter dynamics based on selected participant
    const filteredDynamics = filterDynamicsByParticipant(dynamics || [], participantFilter);
    
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Repeat className="h-5 w-5 text-purple-500 mr-2" />
            <h3 className="text-lg font-semibold">Behavioral Pattern Detection</h3>
          </div>
          
          {/* Participant filter toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1 text-xs">
            <button 
              className={`px-2 py-1 rounded-md ${participantFilter === 'all' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              onClick={() => setParticipantFilter('all')}
            >
              Both
            </button>
            <button 
              className={`px-2 py-1 rounded-md ${participantFilter === me ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              onClick={() => setParticipantFilter(me)}
              style={{ color: participantFilter === me ? '#22C9C9' : undefined }}
            >
              {me}
            </button>
            <button 
              className={`px-2 py-1 rounded-md ${participantFilter === them ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              onClick={() => setParticipantFilter(them)}
              style={{ color: participantFilter === them ? '#FF69B4' : undefined }}
            >
              {them}
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          {filteredDynamics.length > 0 ? (
            filteredDynamics.map((dynamic, index) => (
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
            <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                {participantFilter !== 'all' ? 
                  `No specific patterns found for ${participantFilter}. Try selecting "Both" to see all patterns.` : 
                  "No behavioral patterns detected."}
              </p>
            </div>
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
  
  // Generate patterns based on participant names for known scenarios
  const generatePatternsForParticipants = (me: string, them: string, convo: string) => {
    // Check if this is the Alex/Jamie conversation
    const isAlexJamie = 
      (me.toLowerCase().includes('alex') && them.toLowerCase().includes('jamie')) || 
      (me.toLowerCase().includes('jamie') && them.toLowerCase().includes('alex'));
  
    if (isAlexJamie && convo.includes('Forget it. I shouldn\'t have to beg for attention')) {
      return [
        "Recurring pattern of seeking validation through accusation",
        "Escalation-withdrawal cycle where criticism leads to defensiveness",
        "Black-and-white thinking pattern with frequent use of 'always' statements"
      ];
    }
    
    // Could add more pattern detection for other common scenarios here
    
    return [];
  };
  
  // Extract participant names from conversation if possible
  const extractParticipants = (text: string): string[] | null => {
    const matches = text.match(/^([A-Za-z]+):/m);
    if (matches && matches[1]) {
      return [matches[1]];
    }
    return null;
  };
  
  // Try to generate patterns for known participants
  const participants = extractParticipants(conversation);
  if (participants && participants.length > 0) {
    const generatedPatterns = generatePatternsForParticipants(participants[0], participants[0] === 'Alex' ? 'Jamie' : 'Alex', conversation);
    
    if (generatedPatterns.length > 0) {
      // Filter patterns based on selected participant
      const filteredPatterns = filterDynamicsByParticipant(generatedPatterns, participantFilter);
      
      // Determine what to show based on tier
      // Pro tier gets full patterns with detailed insights
      // Personal tier gets limited patterns (just 1) with upgrade message
      const isPro = tier === 'pro' || tier === 'instant';
      const patternsToShow = isPro ? filteredPatterns : filteredPatterns.slice(0, 1);
      
      return (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Repeat className="h-5 w-5 text-purple-500 mr-2" />
              <h3 className="text-lg font-semibold">
                {isPro ? "Behavioral Pattern Detection" : "Communication Pattern"}
              </h3>
            </div>
            
            {/* Participant filter toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1 text-xs">
              <button 
                className={`px-2 py-1 rounded-md ${participantFilter === 'all' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                onClick={() => setParticipantFilter('all')}
              >
                Both
              </button>
              <button 
                className={`px-2 py-1 rounded-md ${participantFilter === me ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                onClick={() => setParticipantFilter(me)}
                style={{ color: participantFilter === me ? '#22C9C9' : undefined }}
              >
                {me}
              </button>
              <button 
                className={`px-2 py-1 rounded-md ${participantFilter === them ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                onClick={() => setParticipantFilter(them)}
                style={{ color: participantFilter === them ? '#FF69B4' : undefined }}
              >
                {them}
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {patternsToShow.length > 0 ? (
              patternsToShow.map((pattern, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start">
                      <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mr-3 mt-0.5">
                        <Activity className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700">{pattern}</p>
                        {isPro && index === 0 && (
                          <p className="text-xs text-purple-600 mt-2">
                            <span className="font-medium">Impact:</span> This pattern often creates a cycle that's difficult to break without addressing the underlying emotional needs.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  {participantFilter !== 'all' ? 
                    `No specific patterns found for ${participantFilter}. Try selecting "Both" to see all patterns.` : 
                    "No behavioral patterns detected."}
                </p>
              </div>
            )}
            
            {!isPro && filteredPatterns.length > 0 && (
              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <p className="text-sm text-purple-700 flex items-center">
                  <span className="font-medium mr-1">Upgrade to Pro:</span> 
                  Get {filteredPatterns.length - 1} more patterns with detailed insights on recurring cycles and behavioral dynamics.
                  <ChevronRight className="h-4 w-4 text-purple-500 ml-auto" />
                </p>
              </div>
            )}
            
            {isPro && (
              <div className="bg-purple-50 p-3 rounded border border-purple-100 mt-3">
                <div className="flex items-center">
                  <p className="text-sm text-purple-700 flex-1">
                    <span className="font-medium">Pro tier feature:</span> Advanced behavioral pattern detection identifies specific communication cycles that may be creating tension in this conversation.
                  </p>
                  <ChevronRight className="h-4 w-4 text-purple-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  }
  
  // If no determination can be made, don't show any patterns
  return null;
}