import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface EvasionInstance {
  type: string;
  participant: string;
  example: string;
  context?: string;
}

interface EvasionDetectionProps {
  tier: string;
  evasionDetection?: {
    detected: boolean;
    analysisTitle?: string;
    patterns?: string[];
    details?: {
      topicShifting?: EvasionInstance[];
      questionDodging?: EvasionInstance[];
      nonCommittal?: EvasionInstance[];
      deflection?: EvasionInstance[];
      avoidance?: EvasionInstance[];
      refusalToEngage?: EvasionInstance[];
    };
  };
}

const EvasionDetection: React.FC<EvasionDetectionProps> = ({ tier, evasionDetection }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  // Don't render if no evasion detected or if data is missing
  if (!evasionDetection || !evasionDetection.detected) {
    return null;
  }
  
  // Basic evasion detection for Personal tier
  if (tier === 'personal' && evasionDetection.patterns) {
    return (
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">🛡️ Evasion Identification</CardTitle>
          </div>
          <CardDescription>
            Detects patterns of communication that avoid addressing concerns directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {evasionDetection.patterns.map((pattern, index) => (
              <div key={index} className="flex items-start space-x-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                  {pattern}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Detailed evasion detection for Pro tier
  if ((tier === 'pro' || tier === 'instant') && evasionDetection.details) {
    const details = evasionDetection.details;
    
    // Get all evasion categories that have at least one detection
    const categories = [
      { key: 'topicShifting', label: 'Topic Shifting', instances: details.topicShifting || [] },
      { key: 'questionDodging', label: 'Question Dodging', instances: details.questionDodging || [] },
      { key: 'nonCommittal', label: 'Non-committal Responses', instances: details.nonCommittal || [] },
      { key: 'deflection', label: 'Deflection', instances: details.deflection || [] },
      { key: 'avoidance', label: 'Avoidance', instances: details.avoidance || [] },
      { key: 'refusalToEngage', label: 'Refusal to Engage', instances: details.refusalToEngage || [] },
    ].filter(category => category.instances.length > 0);
    
    if (categories.length === 0) {
      return null;
    }
    
    return (
      <Card className="mt-6">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">
              {evasionDetection.analysisTitle || '🔍 Avoidance Detection Activated'}
            </CardTitle>
          </div>
          <CardDescription>
            Your conversation analysis shows signs of:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                {categories.slice(0, 3).map(category => (
                  <Badge 
                    key={category.key}
                    variant="outline" 
                    className="bg-amber-50 text-amber-800 border-amber-200"
                  >
                    {category.label}
                  </Badge>
                ))}
                {categories.length > 3 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                    +{categories.length - 3} more
                  </Badge>
                )}
              </div>
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
              {categories.map(category => (
                <div key={category.key} className="space-y-2">
                  <h4 className="font-medium text-sm">{category.label}</h4>
                  {category.instances.map((instance, index) => (
                    <div key={index} className="border-l-2 border-amber-300 pl-3 py-1 space-y-1 text-sm">
                      <div className="font-medium">{instance.participant}</div>
                      <div className="italic">"{instance.example}"</div>
                      {instance.context && (
                        <div className="text-muted-foreground text-xs">{instance.context}</div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  }
  
  return null;
};

export default EvasionDetection;