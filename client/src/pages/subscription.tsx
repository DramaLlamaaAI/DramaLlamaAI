import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Removed Tabs imports
import { Check, CheckCircle2, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface User {
  id: number;
  username: string;
  email: string;
  tier: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export default function SubscriptionPage() {
  // Removed billing period state
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const success = searchParams.get('success');
  
  // Fetch authenticated user
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    staleTime: 30000, // 30 seconds
  });
  
  // Show success message if payment was successful
  useEffect(() => {
    if (success === 'true') {
      toast({
        title: "Subscription Successful!",
        description: "Thank you for subscribing to Drama Llama! Your payment has been processed.",
        variant: "default",
        duration: 5000,
      });
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [success, toast]);
  
  // Show payment confirmation card if redirected from successful payment
  const PaymentSuccessCard = () => {
    if (success !== 'true') return null;
    
    return (
      <Card className="mb-8 border-green-100 bg-green-50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg text-green-800">Payment Successful</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-green-700">
            Your payment has been processed successfully. Your account has been upgraded and 
            you now have access to all the features of your new plan. A receipt has been sent to your email.
          </p>
        </CardContent>
      </Card>
    );
  };
  
  const handleUpgrade = (plan: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to upgrade your subscription.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    
    // Redirect to the checkout page with the plan parameter
    navigate(`/checkout?plan=${plan.toLowerCase()}`);
  };
  
  const featureCheck = (included: boolean) => {
    return included ? (
      <span className="text-green-500 flex items-center">
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
      </span>
    ) : (
      <span className="text-gray-300">—</span>
    );
  };

  // Display a loading state while fetching user data
  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Loading subscription information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-12">
      {/* Display payment success message if user was redirected from checkout */}
      {success === 'true' && (
        <div className="max-w-2xl mx-auto mb-8">
          <PaymentSuccessCard />
        </div>
      )}
      
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Choose Your Drama Llama Plan</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Unlock more features to gain deeper insights into your conversations and improve your communication
        </p>
        
        {user && (
          <div className="mt-4 bg-muted/50 max-w-lg mx-auto rounded-lg p-3">
            <p className="text-sm font-medium">
              You are currently on the <span className="font-bold text-primary">{user.tier.charAt(0).toUpperCase() + user.tier.slice(1)} Plan</span>
            </p>
          </div>
        )}
        
        {/* Removed billing period tabs */}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Free Plan */}
        <Card className="border-2 border-gray-200 relative">
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl">Free – Basic Tier</CardTitle>
            <CardDescription>For occasional insight seekers</CardDescription>
            <div className="mt-2 flex items-baseline justify-center">
              <span className="text-3xl font-bold">£0</span>
              <span className="text-muted-foreground ml-1">/forever</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant={user && user.tier === 'free' ? "outline" : "default"} 
              className="w-full" 
              disabled={user && user.tier === 'free'}
              onClick={() => user ? null : navigate('/auth')}
            >
              {user ? (user.tier === 'free' ? 'Current Plan' : 'Free Plan') : 'Sign Up Free'}
            </Button>
            
            <ul className="space-y-3 mt-6">
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>2 chat analyses per month</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Overall Emotional Tone Summary</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Conversation Health Score (0–100 gauge)</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>🚩 Red Flags Detected (Count & Brief Descriptions)</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Simple PDF Export</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="pt-4 text-center flex flex-col">
            <p className="text-sm text-muted-foreground">
              Perfect for casual users wanting to try our communication analysis.
            </p>
          </CardFooter>
        </Card>
        
        {/* Instant Deep Dive - One-Time Payment */}
        <Card className="border-2 border-purple-400 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/3">
            <div className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              ONE-OFF
            </div>
          </div>
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl">Instant Deep Dive</CardTitle>
            <CardDescription>Instant clarity — no subscription, no commitment, just insight when you need it</CardDescription>
            <div className="mt-2 flex items-baseline justify-center">
              <span className="text-3xl font-bold">£1.99</span>
              <span className="text-muted-foreground ml-1">one-time</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => handleUpgrade('instant')} 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              variant="default"
            >
              Buy Single Analysis
            </Button>
            
            <ul className="space-y-3 mt-6">
              <li className="flex">
                <Check className="h-5 w-5 text-purple-600 mr-2" />
                <span><strong>1 Chat Upload (Single Use)</strong></span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-purple-600 mr-2" />
                <span><strong>Includes everything in the Free Tier, plus:</strong></span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-purple-600 ml-6 mr-2" />
                <span>🚩 Red Flag Count with Key Quotes</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-purple-600 ml-6 mr-2" />
                <span>Participant Summary Cards (Style & Role in Tension)</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-purple-600 ml-6 mr-2" />
                <span>Conversation Dynamics Overview</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-purple-600 ml-6 mr-2" />
                <span>PDF Export</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="pt-4 text-center flex flex-col">
            <p className="text-sm text-muted-foreground">
              Perfect for when you need a one-time deep analysis without committing to a subscription.
            </p>
          </CardFooter>
        </Card>
        
        {/* Personal Plan */}
        <Card className="border-2 border-primary relative">
          <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/3">
            <div className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </div>
          </div>
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl">🦙 Personal Plan</CardTitle>
            <CardDescription>For regular communication insights</CardDescription>
            <div className="mt-2 flex items-baseline justify-center">
              <span className="text-3xl font-bold">£3.99</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => handleUpgrade('personal')} 
              className="w-full bg-primary"
              variant={user && user.tier === 'personal' ? "outline" : "default"}
              disabled={user && user.tier === 'personal'}
            >
              {user && user.tier === 'personal' ? 'Current Plan' : 'Upgrade to Personal'}
            </Button>
            
            <ul className="space-y-3 mt-6">
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>5 uploads a month</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Overall Emotional Tone Summary</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Conversation Health Meter</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Basic Communication Insights - participants named</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Advanced Emotional Tone Analysis - participants named</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Individual Contributions to Tension - participants named</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Key Conversation Quotes + Manipulation Score</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>🚩 Red Flags Detection & Meters - participants named</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Communication Styles Breakdown - Your Style vs Their Style</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Accountability Indicators - participants named</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Simple PDF Export</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="pt-4 text-center flex flex-col">
            <p className="text-sm text-muted-foreground">
              Ideal for individuals wanting regular relationship insights.
            </p>
          </CardFooter>
        </Card>
        
        {/* Pro Plan */}
        <Card className="border-2 border-secondary relative overflow-hidden">
          <div className="absolute -top-14 -right-14 bg-gradient-to-bl from-secondary/40 to-secondary/0 w-48 h-48 transform rotate-45"></div>
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl flex items-center">
              🦙 🦙 Pro/Relationship Plan
            </CardTitle>
            <CardDescription>Complete communication analysis system</CardDescription>
            <div className="mt-2 flex items-baseline justify-center">
              <span className="text-3xl font-bold">£7.99</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => handleUpgrade('pro')} 
              variant={user && user.tier === 'pro' ? "outline" : "secondary"}
              className="w-full"
              disabled={user && user.tier === 'pro'}
            >
              {user && user.tier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
            </Button>
            
            <ul className="space-y-3 mt-6">
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span><strong>Everything in Personal, plus:</strong></span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Unlimited chat uploads</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Conversation Dynamics</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Behavioural Patterns Detection - participants named</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Advanced Communication Trend Lines - Red Flags/Gaslighting</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Evasion Identification – Avoidance Detection</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Message Dominance Analysis – Conversational Control</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Emotional Shifts Timeline (interactive view)</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Power Dynamics Analysis</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Red Flags Timeline – Progressive Tracking</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="pt-4 text-center flex flex-col">
            <p className="text-sm text-muted-foreground">
              For those who want complete clarity in all their communications.
            </p>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-16 bg-gray-50 p-8 rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium mb-2">Can I cancel anytime?</h3>
            <p className="text-muted-foreground">Yes, you can cancel your subscription at any time with no cancellation fees. Your subscription will remain active until the end of your current billing period.</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">How do free analyses work?</h3>
            <p className="text-muted-foreground">Free tier users receive one complimentary chat analysis per month. This resets on the first day of each calendar month.</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Is my data secure?</h3>
            <p className="text-muted-foreground">We take privacy seriously. Your conversations are analyzed in a secure environment and aren't stored permanently. We don't share your data with third parties.</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">What payment methods do you accept?</h3>
            <p className="text-muted-foreground">We accept credit/debit cards, PayPal, and Apple Pay. All payments are securely processed through Stripe.</p>
          </div>
        </div>
      </div>
    </div>
  );
}