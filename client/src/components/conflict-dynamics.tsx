import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Scale, Zap, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ConflictDynamicsProps {
  tier: string;
  conflictDynamics?: {
    summary: string;
    participants: {
      [name: string]: {
        tendency: 'escalates' | 'de-escalates' | 'mixed';
        examples?: string[];
        score?: number;
      };
    };
    interaction?: string;
    recommendations?: string[];
  };
}

const ConflictDynamics: React.FC<ConflictDynamicsProps> = ({ tier, conflictDynamics }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  // Don't render if no conflict dynamics data
  if (!conflictDynamics) {
    return null;
  }
  
  // Get participant data for display
  const participants = Object.entries(conflictDynamics.participants).map(([name, data]) => ({
    name,
    ...data
  }));
  
  // Render icon based on tendency
  const getTendencyIcon = (tendency: string) => {
    switch (tendency) {
      case 'escalates':
        return <ArrowUp className="h-5 w-5 text-red-500" />;
      case 'de-escalates':
        return <ArrowDown className="h-5 w-5 text-green-500" />;
      default:
        return <Minus className="h-5 w-5 text-amber-500" />;
    }
  };
  
  // Render label and color based on tendency
  const getTendencyLabel = (tendency: string) => {
    switch (tendency) {
      case 'escalates':
        return <span className="text-red-500">🔴 Escalates</span>;
      case 'de-escalates':
        return <span className="text-green-500">🟢 De-escalates</span>;
      default:
        return <span className="text-amber-500">⚖️ Mixed</span>;
    }
  };
  
  // Calculate progress color based on score
  const getProgressColor = (score?: number) => {
    if (!score) return 'bg-gray-300';
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };
  
  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Scale className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-lg">⚖️ Conflict Dynamics Analysis</CardTitle>
        </div>
        <CardDescription>
          How each participant contributes to escalation or resolution in this conversation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">{conflictDynamics.summary}</p>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="space-y-4">
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.name} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getTendencyIcon(participant.tendency)}
                      <span className="font-medium">{participant.name}:</span> 
                      {getTendencyLabel(participant.tendency)}
                    </div>
                    
                    {/* Only show score for Personal and Pro tiers */}
                    {(tier === 'personal' || tier === 'pro' || tier === 'instant') && participant.score !== undefined && (
                      <div className="w-24">
                        <Progress 
                          value={participant.score} 
                          className={`h-2 ${getProgressColor(participant.score)}`} 
                        />
                        <div className="text-xs text-right mt-1">
                          {participant.score}% calming
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Show examples for Personal and Pro tiers */}
                  {(tier === 'personal' || tier === 'pro' || tier === 'instant') && 
                   participant.examples && 
                   participant.examples.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {participant.examples.map((example, index) => (
                        <div 
                          key={index}
                          className={`text-sm italic px-3 py-2 rounded-md ${
                            participant.tendency === 'escalates' 
                              ? 'bg-red-50 text-red-700' 
                              : participant.tendency === 'de-escalates'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          "{example}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Show interaction only for Personal and Pro tiers */}
            {(tier === 'personal' || tier === 'pro' || tier === 'instant') && conflictDynamics.interaction && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-md">
                <Zap className="h-4 w-4 inline mr-1" />
                <span className="text-sm">{conflictDynamics.interaction}</span>
              </div>
            )}
            
            {/* Show recommendations only for Pro tier */}
            {(tier === 'pro' || tier === 'instant') && 
             conflictDynamics.recommendations && 
             conflictDynamics.recommendations.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium">Recommendations:</h4>
                {conflictDynamics.recommendations.map((recommendation, index) => (
                  <div key={index} className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm">
                    {recommendation}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default ConflictDynamics;