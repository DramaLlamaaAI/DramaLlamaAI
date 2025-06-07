import BetaTierResults from "./beta-tier-results";
import FreeTierResults from "./free-tier-results";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, Users, Heart, MessageCircle, Flame, Activity, Clock, Target, CheckCircle, Star, Shield, HeartHandshake, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function SeverityInfoButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-gray-100">
          <Info className="h-3 w-3 text-gray-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Severity Score Guide</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800 border-red-200">9-10</Badge>
              <span className="font-semibold text-red-800">CRITICAL</span>
            </div>
            <p className="text-gray-600 ml-8">Self-harm threats, suicide threats, physical violence threats, child endangerment, stalking behavior</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">7-8</Badge>
              <span className="font-semibold text-orange-800">HIGH RISK</span>
            </div>
            <p className="text-gray-600 ml-8">Emotional manipulation with threats, gaslighting, financial abuse, isolation tactics, threatening escalation</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">5-6</Badge>
              <span className="font-semibold text-yellow-800">SERIOUS</span>
            </div>
            <p className="text-gray-600 ml-8">Guilt-tripping, emotional blackmail, blame-shifting, controlling behavior, intimidation without direct threats</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">3-4</Badge>
              <span className="font-semibold text-blue-800">MODERATE</span>
            </div>
            <p className="text-gray-600 ml-8">Passive aggression, dismissive language, minor manipulation, moving goalposts, victim mentality</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 border-green-200">1-2</Badge>
              <span className="font-semibold text-green-800">LOW</span>
            </div>
            <p className="text-gray-600 ml-8">Poor communication habits, minor insensitivity, occasional defensive responses</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ResultsDispatcherProps {
  result: any;
  me: string;
  them: string;
  tier: string;
  originalTier?: string;
}

// Personal and Pro tier results component
function PersonalProTierResults({ result, me, them, tier }: { result: any; me: string; them: string; tier: string }) {
  const redFlags = result.redFlags || [];
  const healthScore = result.healthScore?.score || 0;
  const manipulationScores = result.manipulationScores || {};
  const individualCommunicationStyles = result.individualCommunicationStyles || {};
  const supportRecommendations = result.communication?.supportRecommendations || [];
  
  return (
    <div className="space-y-6">
      {/* Personal/Pro Tier Header */}
      <Card className={`bg-gradient-to-r ${tier === 'pro' ? 'from-purple-50 to-indigo-50 border-purple-200' : 'from-pink-50 to-rose-50 border-pink-200'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={tier === 'pro' ? 'text-purple-800' : 'text-pink-800'}>
              {tier === 'pro' ? 'Pro Tier' : 'Personal Tier'} Complete Analysis
            </CardTitle>
            <Badge variant="secondary" className={tier === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-pink-100 text-pink-800'}>
              {tier === 'pro' ? 'Premium Features' : 'Full Analysis'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className={tier === 'pro' ? 'text-purple-700' : 'text-pink-700'}>
            {tier === 'pro' 
              ? 'Comprehensive analysis with advanced conflict resolution strategies and relationship coaching insights.'
              : 'Complete analysis with manipulation detection, individual communication styles, and professional support recommendations.'
            }
          </p>
        </CardContent>
      </Card>

      {/* Overall Emotional Tone */}
      {result.toneAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              Overall Emotional Tone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium mb-4">{result.toneAnalysis.overallTone}</p>
            {result.toneAnalysis.participantTones && (
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(result.toneAnalysis.participantTones).map(([participant, tone]) => (
                  <div key={participant} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800">{participant}</h4>
                    <p className="text-sm text-blue-700">{tone as string}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Health Score */}
      {result.healthScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Conversation Health Score (Visual Meter with Factors)
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

              {/* Health Factors */}
              {result.healthScore.factors && result.healthScore.factors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Contributing Factors:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {result.healthScore.factors.map((factor: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Red Flags Analysis with Severity Scores */}
      {redFlags.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Personal Red Flag Analysis ({redFlags.length} detected)
            </CardTitle>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mt-2">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Severity Score Guide (1-10 scale):</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                  <span className="text-gray-600">1-3: Low Risk - Minor concerns</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded"></div>
                  <span className="text-gray-600">4-6: Medium Risk - Needs attention</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600">7-10: High Risk - Serious concern</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {redFlags.map((flag: any, index: number) => {
              const isLowRisk = flag.severity && flag.severity <= 3;
              const bgColor = isLowRisk ? 'bg-blue-50' : 'bg-amber-50';
              const borderColor = isLowRisk ? 'border-blue-200' : 'border-amber-200';
              const textColor = isLowRisk ? 'text-blue-800' : 'text-amber-800';
              const labelColor = isLowRisk ? 'text-blue-700' : 'text-amber-700';
              
              return (
                <div key={index} className={`border rounded-lg p-4 ${bgColor} ${borderColor}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className={`font-semibold ${textColor}`}>
                        {isLowRisk ? `${flag.type} Pattern` : flag.type}
                      </h4>
                      <p className={`text-sm ${labelColor}`}>
                        {flag.participant && flag.participant !== 'Both participants' 
                          ? `Attributed to: ${flag.participant}`
                          : 'General pattern detected'
                        }
                      </p>
                      {/* Severity Score Display */}
                      {flag.severity && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`text-xs font-medium ${labelColor}`}>Severity Score:</span>
                          <Badge variant="outline" className={`
                            ${(flag.severity >= 7) ? 'border-red-300 text-red-700 bg-red-50' : 
                              (flag.severity >= 4) ? 'border-orange-300 text-orange-700 bg-orange-50' : 
                              'border-blue-300 text-blue-700 bg-blue-50'}
                          `}>
                            {flag.severity}/10
                          </Badge>
                          <SeverityInfoButton />
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className={`
                      ${flag.severity >= 7 ? 'border-red-300 text-red-700 bg-red-50' : 
                        flag.severity >= 4 ? 'border-orange-300 text-orange-700 bg-orange-50' : 
                        'border-blue-300 text-blue-700 bg-blue-50'}
                    `}>
                      {flag.severity >= 7 ? "High" : flag.severity >= 4 ? "Medium" : "Low"} Risk
                    </Badge>
                  </div>
                  
                  {isLowRisk ? (
                    <div className="space-y-3">
                      <p className={`text-sm ${textColor}`}>
                        <strong>Pattern observed:</strong> {flag.description}
                      </p>
                      {/* Only show "healthy communication" message for truly benign patterns */}
                      {(flag.type?.toLowerCase().includes('awareness') || 
                        flag.type?.toLowerCase().includes('accommodation') ||
                        flag.description?.toLowerCase().includes('willingness to improve') ||
                        flag.description?.toLowerCase().includes('shows awareness')) ? (
                        <div className="p-3 bg-green-50 rounded border border-green-200">
                          <p className="text-xs font-medium text-green-700 mb-1">Good news:</p>
                          <p className="text-xs text-green-700">
                            This appears to show healthy communication. The responses demonstrate awareness and willingness to improve.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-xs font-medium text-yellow-700 mb-1">Room for improvement:</p>
                          <p className="text-xs text-yellow-700">
                            While this is low severity, it could still affect relationship dynamics if it becomes a pattern.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className={`text-sm ${textColor} mb-3`}>{flag.description}</p>
                  )}
                
                  {flag.examples && flag.examples.length > 0 && (
                    <div className="mb-3">
                      <h5 className={`text-xs font-medium ${isLowRisk ? 'text-blue-700' : 'text-amber-700'} mb-1`}>
                        {isLowRisk ? 'Examples from conversation:' : 'Supporting Quotes:'}
                      </h5>
                      <ul className={`text-xs ${isLowRisk ? 'text-blue-700' : 'text-amber-700'} space-y-1`}>
                        {flag.examples.slice(0, 3).map((example: any, i: number) => (
                          <li key={i} className={`pl-2 border-l-2 ${isLowRisk ? 'border-blue-300' : 'border-amber-300'}`}>
                            {typeof example === 'string' ? `"${example}"` : `"${example.text}" - ${example.from}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {flag.recommendedAction && (
                    <div className={`mt-3 p-3 rounded border ${isLowRisk ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                      <h5 className={`text-xs font-medium ${isLowRisk ? 'text-green-700' : 'text-blue-700'} mb-1`}>
                        {isLowRisk ? 'Enhancement suggestion:' : 'Recommended Action:'}
                      </h5>
                      <p className={`text-xs ${isLowRisk ? 'text-green-700' : 'text-blue-700'}`}>
                        {isLowRisk 
                          ? `While this shows healthy communication, ${flag.participant || 'participants'} could enhance by: ${flag.recommendedAction}`
                          : flag.recommendedAction
                        }
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Personal Red Flag Analysis
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

      {/* Individual Manipulation Score Detection */}
      {Object.keys(manipulationScores).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Individual Manipulation Score Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(manipulationScores).map(([participant, data]: [string, any]) => (
                <div key={participant} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2">{participant}</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Manipulation Score:</span>
                    <Badge variant="outline" className={`
                      ${(data.score >= 7) ? 'border-red-300 text-red-700 bg-red-50' : 
                        (data.score >= 4) ? 'border-orange-300 text-orange-700 bg-orange-50' : 
                        'border-green-300 text-green-700 bg-green-50'}
                    `}>
                      {data.score}/10
                    </Badge>
                  </div>
                  {data.analysis && (
                    <p className="text-sm text-orange-700 mb-2">{data.analysis}</p>
                  )}
                  {data.quotes && data.quotes.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-orange-700 mb-1">Evidence Quotes:</h5>
                      <ul className="text-xs text-orange-700 space-y-1">
                        {data.quotes.slice(0, 2).map((quote: string, i: number) => (
                          <li key={i} className="pl-2 border-l-2 border-orange-300">
                            "{quote}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Communication Style Analysis */}
      {Object.keys(individualCommunicationStyles).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Individual Communication Style Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(individualCommunicationStyles).map(([participant, style]: [string, any]) => (
                <div key={participant} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-2">{participant}</h4>
                  {typeof style === 'string' ? (
                    <p className="text-sm text-purple-700">{style}</p>
                  ) : (
                    <div className="space-y-2">
                      {style.primary && (
                        <div>
                          <span className="text-xs font-medium text-purple-700">Primary Style:</span>
                          <p className="text-sm text-purple-700">{style.primary}</p>
                        </div>
                      )}
                      {style.patterns && style.patterns.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-purple-700">Key Patterns:</span>
                          <ul className="text-xs text-purple-700 mt-1 space-y-1">
                            {style.patterns.map((pattern: string, i: number) => (
                              <li key={i} className="pl-2 border-l-2 border-purple-300">
                                {pattern}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Support Recommendations */}
      {supportRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-500" />
              Professional Support Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supportRecommendations.map((recommendation: any, index: number) => (
                <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200">
                  {typeof recommendation === 'string' ? (
                    <p className="text-sm text-green-700">{recommendation}</p>
                  ) : (
                    <div>
                      {recommendation.title && (
                        <h4 className="font-semibold text-green-800 mb-1">{recommendation.title}</h4>
                      )}
                      <p className="text-sm text-green-700">{recommendation.description || recommendation}</p>
                      {recommendation.urgency && (
                        <Badge variant="outline" className="mt-2 border-green-300 text-green-700">
                          {recommendation.urgency} Priority
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pro Tier Additional Features */}
      {tier === 'pro' && result.conflictResolution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Conflict Resolution Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.conflictResolution.map((strategy: any, index: number) => (
                <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-800">{strategy.title}</h4>
                  <p className="text-sm text-purple-700 mt-1">{strategy.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ResultsDispatcher({ result, me, them, tier, originalTier }: ResultsDispatcherProps) {
  // Use originalTier if available, otherwise fall back to tier
  const effectiveTier = originalTier || tier;
  
  console.log(`ResultsDispatcher: tier=${tier}, originalTier=${originalTier}, effectiveTier=${effectiveTier}`);
  
  // Route to appropriate results component based on tier
  switch (effectiveTier) {
    case 'beta':
      return <BetaTierResults result={result} me={me} them={them} />;
    
    case 'free':
    case 'anonymous':
      return <FreeTierResults result={result} me={me} them={them} />;
    
    case 'personal':
    case 'pro':
    case 'instant':
      return <PersonalProTierResults result={result} me={me} them={them} tier={effectiveTier} />;
    
    default:
      // Fallback to free tier for unknown tiers
      console.warn(`Unknown tier: ${effectiveTier}, falling back to free tier`);
      return <FreeTierResults result={result} me={me} them={them} />;
  }
}