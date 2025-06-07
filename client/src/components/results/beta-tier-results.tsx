import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Users, Heart, MessageCircle, Flame, Activity, Clock, Target, CheckCircle, Sparkles, CreditCard } from "lucide-react";
import { Link } from "wouter";
import EnhancedEmotionalTone from "../enhanced-emotional-tone";

interface BetaTierResultsProps {
  result: any;
  me: string;
  them: string;
}

export default function BetaTierResults({ result, me, them }: BetaTierResultsProps) {
  const redFlags = result.redFlags || [];
  const healthScore = result.healthScore?.score || 0;
  const deepDiveCreditsRequired = result.deepDiveCreditsRequired || false;
  const deepDiveCreditsRemaining = result.deepDiveCreditsRemaining || 0;
  
  // Handle case where Deep Dive credits are required but not available
  if (deepDiveCreditsRequired) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Deep Dive Credits Required
              </CardTitle>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                Premium Feature
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-amber-700">
              {result.message || "Deep Dive credits are required for enhanced beta analysis with detailed insights."}
            </p>
            <div className="bg-amber-100 border border-amber-300 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 mb-2">Enhanced Analysis Includes:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Detailed red flag breakdowns with participant attribution</li>
                <li>• Impact assessments and progression warnings</li>
                <li>• Personalized recommendations and action steps</li>
                <li>• Communication style comparisons</li>
                <li>• Accountability and tension analysis</li>
              </ul>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-gray-600">
                Credits remaining: {deepDiveCreditsRemaining}
              </span>
              <Link href="/checkout/one-time">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Purchase Deep Dive Credits (£1.99)
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Beta Tier Header with Credit Info */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Beta Tier Enhanced Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Enhanced Features
              </Badge>
              {deepDiveCreditsRemaining !== undefined && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {deepDiveCreditsRemaining} credits remaining
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-purple-700">
            This enhanced analysis includes detailed red flag breakdowns, participant attribution, 
            impact assessment, and personalized recommendations. This analysis consumed 1 Deep Dive credit.
          </p>
        </CardContent>
      </Card>

      {/* Enhanced Emotional Tone Analysis */}
      {result.toneAnalysis && (
        <EnhancedEmotionalTone
          overallTone={result.toneAnalysis.overallTone}
          participantTones={result.toneAnalysis.participantTones}
          participantAnalysis={(result as any).participantAnalysis}
          tier="beta"
          me={me}
          them={them}
        />
      )}

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
              
              {/* Health Score Range Explanation */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Health Score Range Explanation</h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <div className="flex justify-between">
                    <span className="font-medium">80-100:</span>
                    <span>Healthy communication with positive patterns</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">60-79:</span>
                    <span>Moderate health with some areas for improvement</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">40-59:</span>
                    <span>Concerning patterns that need attention</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">0-39:</span>
                    <span>Significant issues requiring immediate attention</span>
                  </div>
                </div>
              </div>
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

      {/* Support Recommendations Section */}
      {result.supportRecommendations && result.supportRecommendations.resources?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-500" />
              Professional Support Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {result.supportRecommendations.message}
            </p>
            <div className="space-y-3">
              {result.supportRecommendations.resources.map((resource: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800">{resource.title}</h4>
                    <Badge 
                      variant={resource.badge?.includes('Critical') ? 'destructive' : 
                              resource.badge?.includes('Recommended') ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {resource.badge}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{resource.description}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                    <span className="font-medium">Contact: {resource.contact}</span>
                    {resource.website && (
                      <span className="text-blue-600">Website: {resource.website}</span>
                    )}
                  </div>
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
          <br /><br />
          <strong>Important:</strong> Beta tier is active for a limited time only. Once the promotion ends, your account will be downgraded to free tier. Check out our subscription plans and one-time insight options for continued access to enhanced features.
        </AlertDescription>
      </Alert>
    </div>
  );
}