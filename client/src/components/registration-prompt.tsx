import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronUpCircle, X, Zap, Badge } from "lucide-react";
import { getUserUsage } from "@/lib/openai";
import { useQuery } from "@tanstack/react-query";

interface RegistrationPromptProps {
  tier: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export default function RegistrationPrompt({ tier, onClose, showCloseButton = true }: RegistrationPromptProps) {
  const [isActive, setIsActive] = useState(true);
  
  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const used = usage?.used || 0;
  const limit = usage?.limit || 2;
  const remaining = Math.max(0, limit - used);
  
  // Choose a motivational message based on remaining analyses
  const getMessage = () => {
    if (tier !== 'free') {
      return '';
    }
    
    if (remaining === 1) {
      return 'You have just 1 free analysis remaining this month. Sign up now to ensure your progress isn\'t lost!';
    } else if (remaining === 0) {
      return 'You\'ve used all your free analyses this month. Create an account to get additional features!';
    } else {
      return 'Sign up to save your analysis history and access more features!';
    }
  };
  
  const handleClose = () => {
    setIsActive(false);
    if (onClose) {
      onClose();
    }
  };
  
  // Only show for free tier users
  if (tier !== 'free' || !isActive) {
    return null;
  }
  
  return (
    <Card className="bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200 mb-6">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-violet-800 mb-2">
              🎉 Beta Tier Access – FREE for a Limited Time
            </h3>
            
            <p className="text-gray-700 mb-4">
              Sign up today and get upgraded to our Beta Tier within 24 hours — no card required.
            </p>
            
            <div className="text-gray-700 mb-4 space-y-1">
              <div className="flex items-center">
                <span className="mr-2">✅</span>
                <span>Deeper red flag detection</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">✅</span>
                <span>Emotional tone breakdowns</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">✅</span>
                <span>Full Boundary Builder access</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">✅</span>
                <span>Private & secure chat analysis</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              You'll receive a confirmation email once your Beta Tier access is active.
            </p>
            <p className="text-sm text-amber-600 mb-2">
              🕒 Beta Tier access is temporary and will revert to Free Tier when the promotional period ends.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Need help? Contact us at support@dramallama.ai or use our live chat for instant support.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <Link href="/auth">
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Badge className="h-4 w-4 mr-2" />
                  Sign up for free
                </Button>
              </Link>
              
              <Link href="/subscription">
                <Button variant="outline" className="border-violet-400 text-violet-700">
                  <ChevronUpCircle className="h-4 w-4 mr-2" />
                  View plans
                </Button>
              </Link>
              
              <Link href="/one-time-analysis">
                <Button variant="ghost" className="text-violet-700">
                  <Zap className="h-4 w-4 mr-2" />
                  One-time analysis
                </Button>
              </Link>
            </div>
          </div>
          
          {showCloseButton && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}