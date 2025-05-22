import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Brain } from "lucide-react";

interface AccountabilitySignal {
  detected: boolean;
  participant: string;
  quotes: string[];
  insight: string;
  primaryCount?: number;
  softerCount?: number;
  deflectionDisguised?: boolean;
}

interface AccountabilitySignalsProps {
  signals: Record<string, AccountabilitySignal>;
  participants: {
    me: string;
    them: string;
  };
}

export function AccountabilitySignals({ signals, participants }: AccountabilitySignalsProps) {
  const hasAnySignals = Object.values(signals).some(signal => signal.detected);

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">
            {hasAnySignals ? '✅ Accountability Signals Detected' : '🚫 Accountability Signals'}
          </CardTitle>
        </div>
        <CardDescription>
          Detection of first-person ownership and responsibility-taking language
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAnySignals ? (
          Object.entries(signals).map(([participant, signal]) => {
            if (!signal.detected) return null;
            
            return (
              <div key={participant} className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-base">{participant}</h4>
                </div>
                
                {signal.quotes.length > 0 && (
                  <div className="ml-7 space-y-2">
                    {signal.quotes.map((quote, index) => (
                      <div key={index} className="bg-green-50 p-3 rounded-md border-l-4 border-l-green-200">
                        <p className="text-sm text-green-800 italic">{quote}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="ml-7 bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Insight:</span> {signal.insight}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-500" />
              <h4 className="font-semibold text-base text-gray-700">No accountability language detected in this conversation.</h4>
            </div>
            
            <div className="ml-7 bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">
                <span className="font-medium">🧠 Note:</span> This does not necessarily mean someone was at fault — only that no one explicitly took personal responsibility for conflict or tension in this exchange.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}