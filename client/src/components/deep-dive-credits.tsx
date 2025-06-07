import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Sparkles, CreditCard } from "lucide-react";
import { Link } from "wouter";

interface DeepDiveCreditsProps {
  showPurchaseButton?: boolean;
  className?: string;
}

export default function DeepDiveCredits({ showPurchaseButton = true, className = "" }: DeepDiveCreditsProps) {
  const { data: credits, isLoading } = useQuery({
    queryKey: ["/api/user/deep-dive-credits"],
    queryFn: async () => {
      const response = await fetch("/api/user/deep-dive-credits");
      if (!response.ok) {
        if (response.status === 401) {
          return null; // Not authenticated
        }
        throw new Error("Failed to fetch credits");
      }
      return response.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!credits) {
    return null; // Not authenticated
  }

  const creditCount = credits.credits || 0;
  const hasCredits = creditCount > 0;

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>Deep Dive Credits</span>
          </div>
          <Badge variant={hasCredits ? "default" : "secondary"}>
            {creditCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          Deep Dive credits unlock enhanced analysis with detailed participant attribution, 
          impact assessments, and personalized recommendations.
        </div>
        
        {!hasCredits && (
          <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              You don't have any Deep Dive credits. Purchase credits to access enhanced beta analysis features.
            </div>
          </div>
        )}

        {hasCredits && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            You have {creditCount} Deep Dive credit{creditCount !== 1 ? 's' : ''} available. 
            Each analysis consumes 1 credit.
          </div>
        )}

        {showPurchaseButton && (
          <Link href="/checkout/one-time">
            <Button className="w-full" variant={hasCredits ? "outline" : "default"}>
              <CreditCard className="h-4 w-4 mr-2" />
              Purchase Deep Dive Credits (£1.99)
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}