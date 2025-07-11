import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Lock, Star, ArrowRight, CheckCircle, Heart } from "lucide-react";
import { useLocation } from "wouter";

interface FreeTierResultsProps {
  result: any;
  me: string;
  them: string;
}

export default function FreeTierResults({ result, me, them }: FreeTierResultsProps) {
  const redFlagCount = result.redFlagCount || 0;
  const redFlagsDetected = result.redFlagsDetected || false;
  const healthScore = result.healthScore?.score || 0;
  const [, setLocation] = useLocation();
  
  return (
    <div className="space-y-6">
      {/* Free Tier Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-blue-800">Free Tier Analysis</CardTitle>
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              Basic Analysis
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700">
            You're using the free tier which provides basic red flag detection counts. 
            Upgrade for detailed analysis and participant attribution.
          </p>
        </CardContent>
      </Card>

      {/* Overall Emotional Tone */}
      {result.toneAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-blue-500" />
              Overall Emotional Tone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-gray-800 mb-2">
              {result.toneAnalysis.overallTone}
            </p>
            {result.toneAnalysis.emotionalState && result.toneAnalysis.emotionalState.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700">Key Emotions Detected:</h4>
                <div className="flex flex-wrap gap-2">
                  {result.toneAnalysis.emotionalState.map((emotion: any, index: number) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {emotion.emotion} ({Math.round(emotion.intensity * 100)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conversation Health Score */}
      {result.healthScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Conversation Health Score (Visual Meter)
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

              {result.healthScore.description && (
                <p className="text-sm text-muted-foreground">
                  {result.healthScore.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Red Flag Count Only */}
      {redFlagsDetected ? (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Red Flags Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-amber-600 mb-4">{redFlagCount}</div>
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                {redFlagCount === 1 ? 'Red Flag Found' : 'Red Flags Found'}
              </h3>
              <p className="text-amber-700 mb-6">
                We detected communication patterns that may need attention in your conversation 
                between {me} and {them}.
              </p>
              
              {/* Locked Details */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-dashed border-purple-300 rounded-lg p-6 mb-4">
                <Lock className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                <h4 className="font-semibold text-purple-800 mb-2">Detailed Analysis Locked</h4>
                <p className="text-sm text-purple-700 mb-4">
                  Register today and get upgraded to our Beta tier for free. No card details required. 
                  Beta Tier access is temporary and will revert to Free Tier when the promotional period ends.
                </p>
                <Button 
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 w-full max-w-xs mx-auto text-sm py-2 px-3"
                  onClick={() => setLocation('/register')}
                >
                  <Star className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">Register for Free Beta Access</span>
                  <ArrowRight className="h-4 w-4 ml-1 flex-shrink-0" />
                </Button>
              </div>
            </div>
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
              <p className="text-green-700 mb-6">
                Your conversation shows healthy communication patterns between {me} and {them}.
              </p>
              
              {/* Beta Tier Registration Promotion */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-2">Want Deeper Insights?</h4>
                <p className="text-sm text-purple-700 mb-3">
                  Register today and we'll upgrade you to Beta tier for free. No card required. 
                  Beta Tier access is temporary and will revert back to Free Tier when the promotional period ends.
                </p>
                <Button 
                  variant="outline" 
                  className="border-purple-300 text-purple-700 hover:bg-purple-100 w-full max-w-xs mx-auto text-sm py-2 px-3"
                  onClick={() => setLocation('/register')}
                >
                  <span className="truncate">Register for Free Beta Access</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Unlock More Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Free Tier */}
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-600 mb-2">Free Tier</h4>
              <ul className="text-xs text-gray-500 mb-3 space-y-1 text-left">
                <li>• Overall Emotional Tone</li>
                <li>• Conversation Health Score (visual meter)</li>
                <li>• Basic Red Flag count only</li>
              </ul>
              <Badge variant="outline" className="text-xs">Current Plan</Badge>
            </div>
            
            {/* Personal Tier */}
            <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-200">
              <h4 className="font-semibold text-pink-800 mb-2">Personal Tier</h4>
              <p className="text-xs text-pink-600 mb-2">5 analyses per month</p>
              <ul className="text-xs text-pink-700 mb-3 space-y-1 text-left">
                <li>• Overall Emotional Tone</li>
                <li>• Conversation Health Score (visual meter)</li>
                <li>• Detailed Red Flag Analysis - including quotes and named participants</li>
                <li>• Manipulation Score Detection - Including quotes and named participants</li>
                <li>• Communication Style Analysis</li>
                <li>• Support recommendations</li>
              </ul>
              <Button 
                size="sm" 
                className="bg-pink-500 hover:bg-pink-600 text-xs"
                onClick={() => setLocation('/subscribe/personal')}
              >
                Upgrade
              </Button>
            </div>
            
            {/* Pro Tier */}
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-2">Pro Tier</h4>
              <p className="text-xs text-purple-600 mb-2">10 analyses per month</p>
              <ul className="text-xs text-purple-700 mb-3 space-y-1 text-left">
                <li>• Everything in Personal Tier, plus:</li>
                <li>• Power Dynamics Analysis</li>
                <li>• Participant Conflict Scores</li>
                <li>• Communication Pattern Comparison</li>
                <li>• Support recommendations</li>
              </ul>
              <Button 
                size="sm" 
                className="bg-purple-500 hover:bg-purple-600 text-xs"
                onClick={() => setLocation('/subscribe/pro')}
              >
                Upgrade
              </Button>
            </div>
            
            {/* One Time Insight */}
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-800 mb-2">One Time Insight</h4>
              <p className="text-xs text-orange-600 mb-2">£1.99 - No subscription necessary</p>
              <ul className="text-xs text-orange-700 mb-3 space-y-1 text-left">
                <li>• Overall Emotional Tone</li>
                <li>• Conversation Health Score (visual meter)</li>
                <li>• Detailed Red Flag Analysis - including quotes and named participants</li>
                <li>• Manipulation Score Detection - Including quotes and named participants</li>
                <li>• Communication Style Analysis</li>
                <li>• Support recommendations</li>
              </ul>
              <Button 
                size="sm" 
                className="bg-orange-500 hover:bg-orange-600 text-xs"
                onClick={() => setLocation('/checkout/one-time')}
              >
                Upgrade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Beta Tier Registration Prompt */}
      <Alert className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <Star className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          <div className="space-y-3">
            <div>
              <strong>Register today and we'll upgrade you to Beta tier for free. No card required.</strong>
              <br />
              <span className="text-sm">Beta Tier access is temporary and will revert back to Free Tier when the promotional period ends.</span>
            </div>
            
            <div className="bg-white/50 rounded-lg p-3">
              <h5 className="font-semibold text-purple-800 mb-2">Beta Tier provides:</h5>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Unlimited analysis</li>
                <li>• Overall Emotional Tone</li>
                <li>• Conversation Health Score (visual meter)</li>
                <li>• In-depth red flag detection</li>
                <li>• Full Boundary Builder access</li>
                <li>• Empathetic summaries with growth areas and strengths</li>
                <li>• Support recommendations</li>
              </ul>
            </div>
            
            <Button 
              className="bg-purple-500 hover:bg-purple-600 w-full max-w-xs text-sm py-2 px-3"
              onClick={() => setLocation('/register')}
            >
              <span className="truncate">Register for Free Beta Access</span>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}