import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, Star, ArrowRight, CheckCircle } from "lucide-react";

interface FreeTierResultsProps {
  result: any;
  me: string;
  them: string;
}

export default function FreeTierResults({ result, me, them }: FreeTierResultsProps) {
  const redFlagCount = result.redFlagCount || 0;
  const redFlagsDetected = result.redFlagsDetected || false;
  
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
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4">
                <Lock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-600 mb-2">Detailed Analysis Locked</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Upgrade to see specific red flag types, participant attribution, examples, 
                  and personalized recommendations.
                </p>
                <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
                  <Star className="h-4 w-4 mr-2" />
                  Upgrade to Personal Plan
                  <ArrowRight className="h-4 w-4 ml-2" />
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
              
              {/* Upgrade Suggestion */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Want Deeper Insights?</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Upgrade to Personal or Pro tier for detailed communication pattern analysis, 
                  relationship health scores, and personalized improvement suggestions.
                </p>
                <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  Explore Upgrade Options
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-600 mb-2">Free Tier</h4>
              <p className="text-sm text-gray-500 mb-3">Basic red flag count</p>
              <Badge variant="outline">Current Plan</Badge>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-200">
              <h4 className="font-semibold text-pink-800 mb-2">Personal Tier</h4>
              <p className="text-sm text-pink-700 mb-3">
                Detailed red flags, participant analysis, examples
              </p>
              <Button size="sm" className="bg-pink-500 hover:bg-pink-600">
                Upgrade
              </Button>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-2">Pro Tier</h4>
              <p className="text-sm text-purple-700 mb-3">
                Everything + conflict resolution, health scoring
              </p>
              <Button size="sm" variant="outline" className="border-purple-300 text-purple-700">
                Learn More
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Prompt */}
      <Alert className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
        <Star className="h-4 w-4 text-pink-600" />
        <AlertDescription className="text-pink-800">
          <div className="flex items-center justify-between">
            <div>
              <strong>Ready for deeper insights?</strong> Upgrade to Personal tier to see exactly what communication patterns we found and get personalized recommendations.
            </div>
            <Button className="ml-4 bg-pink-500 hover:bg-pink-600">
              Upgrade Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}