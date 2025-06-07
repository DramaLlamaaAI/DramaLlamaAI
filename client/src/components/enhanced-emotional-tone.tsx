import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, Users, MessageCircle, TrendingUp, TrendingDown } from "lucide-react";

interface ParticipantAnalysis {
  emotionalTone: string;
  communicationScore: number;
  insights: string;
  recommendations: string;
}

interface EnhancedEmotionalToneProps {
  overallTone: string;
  participantTones?: Record<string, string>;
  participantAnalysis?: Record<string, ParticipantAnalysis>;
  tier: string;
  me?: string;
  them?: string;
}

const getScoreColor = (score: number) => {
  if (score >= 4) return "text-green-600";
  if (score >= 3) return "text-yellow-600";
  if (score >= 2) return "text-orange-600";
  return "text-red-600";
};

const getScoreLabel = (score: number) => {
  if (score >= 4) return "Good";
  if (score >= 3) return "Average";
  if (score >= 2) return "Poor";
  return "Very Poor";
};

const getScoreIcon = (score: number) => {
  if (score >= 3) return <CheckCircle className="h-4 w-4 text-green-500" />;
  return <AlertTriangle className="h-4 w-4 text-orange-500" />;
};

export default function EnhancedEmotionalTone({ 
  overallTone, 
  participantTones, 
  participantAnalysis, 
  tier, 
  me, 
  them 
}: EnhancedEmotionalToneProps) {
  const participants = participantTones ? Object.keys(participantTones) : [];
  const hasEnhancedAnalysis = participantAnalysis && (tier === 'personal' || tier === 'pro' || tier === 'beta');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Overall Emotional Tone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Tone Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Conversation Summary</h4>
          <p className="text-sm text-muted-foreground">{overallTone}</p>
        </div>

        {/* Enhanced Participant Analysis for Paid Tiers */}
        {hasEnhancedAnalysis && participants.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4" />
              <h4 className="font-medium">Participant Communication Analysis</h4>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {participants.map((participant) => {
                const analysis = participantAnalysis?.[participant];
                const score = analysis?.communicationScore || 0;
                const scorePercentage = (score / 5) * 100;
                
                return (
                  <Card key={participant} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{participant}</CardTitle>
                        <div className="flex items-center gap-2">
                          {getScoreIcon(score)}
                          <Badge variant={score >= 3 ? "default" : "destructive"}>
                            {score}/5 - {getScoreLabel(score)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Communication Score */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Communication Ability</span>
                          <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                            {score}/5
                          </span>
                        </div>
                        <Progress value={scorePercentage} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          Based on empathy, active listening, and constructive engagement
                        </div>
                      </div>

                      <Separator />

                      {/* Emotional Tone */}
                      <div>
                        <h5 className="text-sm font-medium mb-1">Emotional Tone</h5>
                        <p className="text-sm text-muted-foreground">
                          {analysis?.emotionalTone || participantTones?.[participant] || "Analysis pending"}
                        </p>
                      </div>

                      {/* Insights */}
                      {analysis?.insights && (
                        <div>
                          <h5 className="text-sm font-medium mb-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Key Insights
                          </h5>
                          <p className="text-sm text-muted-foreground">{analysis.insights}</p>
                        </div>
                      )}

                      {/* Recommendations */}
                      {analysis?.recommendations && (
                        <div>
                          <h5 className="text-sm font-medium mb-1 flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Recommendations
                          </h5>
                          <p className="text-sm text-muted-foreground">{analysis.recommendations}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* How to Calculate Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  How Communication Scores Are Calculated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-2">
                  <p><strong>Factors considered:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Use of empathetic language ("I understand", "I hear you")</li>
                    <li>Willingness to collaborate or find solutions</li>
                    <li>Directness vs. evasiveness in communication</li>
                    <li>Use of accusatory or defensive statements</li>
                    <li>Active listening phrases and validation</li>
                    <li>Taking responsibility vs. blame-shifting</li>
                  </ul>
                  <div className="mt-3 grid grid-cols-5 gap-1 text-center">
                    <div className="bg-red-100 p-1 rounded text-red-700">1 - Very Poor</div>
                    <div className="bg-orange-100 p-1 rounded text-orange-700">2 - Poor</div>
                    <div className="bg-yellow-100 p-1 rounded text-yellow-700">3 - Average</div>
                    <div className="bg-green-100 p-1 rounded text-green-700">4 - Good</div>
                    <div className="bg-green-200 p-1 rounded text-green-800">5 - Excellent</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Basic Participant Tones for Free Tier */}
        {!hasEnhancedAnalysis && participantTones && participants.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h4 className="font-medium">Participant Tones</h4>
            </div>
            
            <div className="grid gap-3 md:grid-cols-2">
              {participants.map((participant) => (
                <div key={participant} className="p-3 bg-muted/30 rounded-lg">
                  <h5 className="font-medium mb-1">{participant}</h5>
                  <p className="text-sm text-muted-foreground">
                    {participantTones[participant]}
                  </p>
                </div>
              ))}
            </div>

            {/* Upgrade Prompt for Free Tier */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <h5 className="font-medium text-blue-900">Get Detailed Communication Analysis</h5>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Upgrade to see communication ability scores, detailed insights, and personalized recommendations for each participant.
                </p>
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Available in Personal & Pro Tiers
                </Badge>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}