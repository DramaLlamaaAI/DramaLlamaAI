import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, Users, Heart, MessageCircle, Flame, Activity, Clock, Target, CheckCircle } from "lucide-react";

interface BetaTierResultsProps {
  result: any;
  me: string;
  them: string;
}

export default function BetaTierResults({ result, me, them }: BetaTierResultsProps) {
  const redFlags = result.redFlags || [];
  const healthScore = result.healthScore?.score || 0;
  
  return (
    <div className="space-y-6">
      {/* Beta Tier Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-purple-800">Beta Tier Enhanced Analysis</CardTitle>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Enhanced Features
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-purple-700">
            This enhanced analysis includes detailed red flag breakdowns, participant attribution, 
            impact assessment, and personalized recommendations.
          </p>
        </CardContent>
      </Card>

      {/* Health Score */}
      {result.healthScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Relationship Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{healthScore}/100</span>
                <Badge variant={healthScore >= 80 ? "default" : healthScore >= 60 ? "secondary" : "destructive"}>
                  {healthScore >= 80 ? "Healthy" : healthScore >= 60 ? "Moderate" : "Needs Attention"}
                </Badge>
              </div>
              <Progress value={healthScore} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {result.healthScore.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Red Flags Section */}
      {redFlags.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Detailed Red Flag Analysis ({redFlags.length} detected)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {redFlags.map((flag: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-amber-800">{flag.type}</h4>
                    <p className="text-sm text-amber-700">
                      Attributed to: <span className="font-medium">{flag.participant}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    Severity: {flag.severity || "Medium"}
                  </Badge>
                </div>
                
                <p className="text-sm text-amber-800 mb-3">{flag.description}</p>
                
                {/* Examples */}
                {flag.examples && flag.examples.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-medium text-amber-700 mb-1">Examples:</h5>
                    <ul className="text-xs text-amber-700 space-y-1">
                      {flag.examples.map((example: any, i: number) => (
                        <li key={i} className="pl-2 border-l-2 border-amber-300">
                          "{typeof example === 'string' ? example : example.text}" 
                          {example.from && <span className="text-amber-600 ml-2">- {example.from}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Impact Assessment */}
                {flag.impact && (
                  <div className="mb-3">
                    <h5 className="text-xs font-medium text-amber-700 mb-1">Impact:</h5>
                    <p className="text-xs text-amber-700">{flag.impact}</p>
                  </div>
                )}
                
                {/* Progression Warning */}
                {flag.progression && (
                  <div className="mb-3">
                    <h5 className="text-xs font-medium text-amber-700 mb-1">Progression Risk:</h5>
                    <p className="text-xs text-amber-700">{flag.progression}</p>
                  </div>
                )}
                
                {/* Recommended Action */}
                {flag.recommendedAction && (
                  <div>
                    <h5 className="text-xs font-medium text-green-700 mb-1">Recommended Action:</h5>
                    <p className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                      {flag.recommendedAction}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Red Flag Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">No Red Flags Detected</h3>
              <p className="text-green-700">
                Your conversation shows healthy communication patterns between {me} and {them}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Communication Patterns */}
      {result.communicationPatterns && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              Communication Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(result.communicationPatterns).map(([pattern, details]: [string, any]) => (
                <div key={pattern} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 capitalize">{pattern.replace(/([A-Z])/g, ' $1')}</h4>
                  <p className="text-sm text-blue-700 mt-1">{details.description}</p>
                  {details.frequency && (
                    <Badge variant="outline" className="mt-2 border-blue-300 text-blue-700">
                      Frequency: {details.frequency}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beta Tier Upgrade Notice */}
      <Alert className="bg-purple-50 border-purple-200">
        <AlertTriangle className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          <strong>Beta Tier Benefits:</strong> You're receiving enhanced analysis with detailed participant attribution, 
          impact assessments, progression warnings, and personalized recommendations. 
          Upgrade to Pro for even more comprehensive insights including conflict resolution strategies.
        </AlertDescription>
      </Alert>
    </div>
  );
}