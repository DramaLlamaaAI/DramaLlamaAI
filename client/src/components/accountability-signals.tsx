import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AccountabilitySignal {
  score: 'High' | 'Moderate' | 'Low';
  signal: string;
  description: string;
  sampleQuotes: Array<{
    text: string;
    behavioral: string;
  }>;
}

interface AccountabilitySignalsProps {
  signals: Record<string, AccountabilitySignal>;
  participants: {
    me: string;
    them: string;
  };
}

export function AccountabilitySignals({ signals, participants }: AccountabilitySignalsProps) {
  if (!signals || Object.keys(signals).length === 0) {
    return null;
  }

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'High':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">
            🧠 Accountability Language Signals
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  We analyze each person's language to assess how much they take ownership versus deflect blame. 
                  This helps highlight emotional accountability in the conversation.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          How much each participant takes responsibility vs. deflects blame
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(signals).map(([participant, signal]) => (
          <div key={participant} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-base">{participant}</h4>
              <div className="flex items-center gap-2">
                <span className="text-lg">{signal.signal}</span>
                <Badge 
                  variant="outline" 
                  className={getScoreColor(signal.score)}
                >
                  {signal.score}
                </Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {signal.description}
            </p>
            
            {signal.sampleQuotes && signal.sampleQuotes.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Sample Language Patterns:</h5>
                {signal.sampleQuotes.map((quote, index) => (
                  <div key={index} className="bg-muted/30 rounded p-3 text-sm">
                    <p className="italic">"{quote.text}"</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Behavioral Signal:</span> {quote.behavioral}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}