import { ReactNode, useState, useEffect } from "react";
import { useUserTier } from "@/hooks/use-user-tier";
import { incrementAnalysisCount } from "@/lib/trial-utils";
import TrialLimitModal from "./trial-limit-modal";
import AuthModal from "./auth-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface TrialLimiterProps {
  children: ReactNode;
  onTrialUse?: () => void;
  featureType?: "chat" | "message" | "vent" | "live";
}

export default function TrialLimiter({
  children,
  onTrialUse,
  featureType = "chat",
}: TrialLimiterProps) {
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const { canUseFeature, isAuthenticated, hasUsedFreeTrial, analysisCount, isLoading } = useUserTier();
  const { toast } = useToast();

  useEffect(() => {
    // When component loads, check if we should show a modal
    if (!isLoading && !canUseFeature) {
      setShowLimitModal(true);
    }
  }, [isLoading, canUseFeature]);

  const handleUseFeature = async () => {
    // If user is already authenticated or has trial available, let them use the feature
    if (isAuthenticated || canUseFeature) {
      return true;
    }

    // Otherwise, show the trial limit modal
    setShowLimitModal(true);
    return false;
  };

  const handleTrackUsage = async () => {
    // Track feature usage locally
    incrementAnalysisCount();
    
    // Notify parent component that trial was used
    if (onTrialUse) {
      onTrialUse();
    }
    
    // Force refresh usage data
    queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
  };

  const handleUpgrade = async (tier: string) => {
    try {
      // First, show auth modal to register/login
      setShowLimitModal(false);
      setShowAuthModal(true);
      
      toast({
        title: "Select a plan",
        description: `After signing in, you'll be upgraded to the ${tier} plan.`,
      });
      
      // Note: actual payment processing would happen after auth
    } catch (error) {
      console.error("Error upgrading:", error);
      toast({
        title: "Upgrade failed",
        description: "There was an error upgrading your account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    
    // Refresh user data
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
    
    toast({
      title: "Authentication successful",
      description: "You can now continue using Drama Llama!",
    });
  };

  return (
    <>
      {/* Render the child components */}
      {children}
      
      {/* Trial limit modal */}
      <TrialLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={handleUpgrade}
        onSignIn={() => {
          setShowLimitModal(false);
          setShowAuthModal(true);
        }}
      />
      
      {/* Auth modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}