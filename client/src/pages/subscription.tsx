import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [billingPeriod, setBillingPeriod] = useState('monthly');
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
        description: "Thank you for subscribing to Drama Llama!",
      });
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [success, toast]);
  
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
        
        <div className="flex justify-center mt-8">
          <Tabs
            defaultValue="monthly"
            value={billingPeriod}
            onValueChange={setBillingPeriod}
            className="w-fit"
          >
            <TabsList className="grid w-64 grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annual">Annual (20% off)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Free Plan */}
        <Card className="border-2 border-gray-200 relative">
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl">Free Tier</CardTitle>
            <CardDescription>Basic analysis for occasional use</CardDescription>
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
                <span>1 chat analysis per month</span>
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
                <span>Key Summary Quotes (brief highlights only)</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Basic Communication Insights</span>
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
        
        {/* Personal Plan */}
        <Card className="border-2 border-primary relative">
          <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/3">
            <div className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </div>
          </div>
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl">Personal Plan</CardTitle>
            <CardDescription>For regular communication insights</CardDescription>
            <div className="mt-2 flex items-baseline justify-center">
              <span className="text-3xl font-bold">£4.99</span>
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
                <span><strong>10 Chat Analyses per Month</strong></span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Full Summary - Topic & Emotional Insights</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Key Phrases with Quotes/Examples</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Conversation Dynamics</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Emotion Tracking per Participant</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Conversation Initiator vs. Responder</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Tone Balance (Positive vs. Negative %)</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>🚩 Advanced Red Flags Detection</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Behavioural Patterns Detection</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>📊 Basic Emotional Trends</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>🎤 Live Talk Transcription (5/month)</span>
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
              Pro Plan <Star className="h-4 w-4 ml-2 text-yellow-400" />
            </CardTitle>
            <CardDescription>Complete communication analysis system</CardDescription>
            <div className="mt-2 flex items-baseline justify-center">
              <span className="text-3xl font-bold">£9.99</span>
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
                <span><strong>Unlimited Chat Analyses</strong></span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>All Personal Plan Features</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Advanced Accountability Indicators</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Emotional Shifts Timeline</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Manipulation Identifiers</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Gaslighting Detection</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>🚩 Comprehensive Red Flags System</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Power Imbalance Detection</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>Visual Dashboard with Charts</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>PDF & CSV Data Exports</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>📊 Advanced Emotional Trends Tracking</span>
              </li>
              <li className="flex">
                <Check className="h-5 w-5 text-secondary mr-2" />
                <span>🎤 Unlimited Live Talk Recordings</span>
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