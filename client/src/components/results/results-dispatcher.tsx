import BetaTierResults from "./beta-tier-results";
import FreeTierResults from "./free-tier-results";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, Users, Heart, MessageCircle, Flame, Activity, Clock, Target, CheckCircle, Star } from "lucide-react";

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
              : 'Complete red flag analysis with detailed breakdowns and participant attribution.'
            }
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

      {/* Red Flags Analysis */}
      {redFlags.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Red Flag Analysis ({redFlags.length} detected)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {redFlags.map((flag: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-amber-800">{flag.type}</h4>
                    <p className="text-sm text-amber-700">
                      {flag.participant && flag.participant !== 'Both participants' 
                        ? `Attributed to: ${flag.participant}`
                        : 'General pattern detected'
                      }
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    {flag.severity || "Medium"} Risk
                  </Badge>
                </div>
                
                <p className="text-sm text-amber-800 mb-3">{flag.description}</p>
                
                {flag.examples && flag.examples.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-medium text-amber-700 mb-1">Examples from conversation:</h5>
                    <ul className="text-xs text-amber-700 space-y-1">
                      {flag.examples.slice(0, 3).map((example: any, i: number) => (
                        <li key={i} className="pl-2 border-l-2 border-amber-300">
                          {typeof example === 'string' ? `"${example}"` : `"${example.text}" - ${example.from}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {tier === 'pro' && flag.recommendedAction && (
                  <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                    <h5 className="text-xs font-medium text-green-700 mb-1">Pro Recommendation:</h5>
                    <p className="text-xs text-green-700">{flag.recommendedAction}</p>
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