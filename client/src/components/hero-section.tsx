import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeInfo, Flag, BarChart2, ChevronUpCircle } from "lucide-react";
import llamaImage from "@assets/FB Profile Pic.png";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getUserUsage } from "@/lib/openai";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function HeroSection() {
  const { user, isLoading } = useAuth();
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  
  // Get usage data for free tier indicator
  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const used = usage?.used || 0;
  const limit = usage?.limit || 2;
  const remaining = Math.max(0, limit - used);
  const tier = usage?.tier || 'free';
  
  return (
    <div className="mb-10">
      <Card className="rounded-2xl shadow-lg overflow-hidden border-0">
        <div className="grid md:grid-cols-2">
          <CardContent className="p-6 md:p-10 bg-primary text-white text-center">
            <h2 className="text-3xl font-bold mb-4 text-white">AI-powered conversation analysis for emotional clarity</h2>
            <p className="text-lg text-white/80 mb-6">
              Drama Llama AI uses trusted artificial intelligence to analyze your conversations privately — detecting emotional tone, 🚩 red flags, and communication patterns — so you can stop second-guessing and start seeing things clearly.
            </p>
            <div className="mb-6 p-4 bg-white/10 rounded-lg border-2 border-pink-400 shadow-lg">
              <p className="text-md text-white flex items-center justify-center">
                <span className="mr-3 text-xl">🔐</span>
                <span>
                  <strong className="block md:inline text-pink-300 font-bold">Privacy First:</strong> 
                  <span className="text-white font-medium">No one at Drama Llama can view your chats. Nothing is stored. Ever.</span>
                </span>
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <div className="bg-white/10 rounded-full px-4 py-1 text-sm border border-white/20 flex items-center text-white">
                <BadgeInfo className="w-4 h-4 mr-1" /> Emotional tone
              </div>
              <div className="bg-white/10 rounded-full px-4 py-1 text-sm border border-white/20 flex items-center text-white">
                <Flag className="w-4 h-4 mr-1" /> Red flags
              </div>
              <div className="bg-white/10 rounded-full px-4 py-1 text-sm border border-white/20 flex items-center text-white">
                <BarChart2 className="w-4 h-4 mr-1" /> Communication patterns
              </div>
            </div>
            
            {/* Display remaining analyses indicator for free tier users */}
            {tier === 'free' && (
              <div className="mb-4 bg-white/10 border border-white/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <ChevronUpCircle className="w-5 h-5 mr-2 text-white/70" />
                    <span className="text-sm font-medium text-white">Free Analyses Remaining</span>
                  </div>
                  <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold text-white">
                    {remaining} / {limit}
                  </span>
                </div>
                
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF69B4] to-[#22C9C9]"
                    style={{ width: `${Math.max(0, (remaining / limit) * 100)}%` }}
                  />
                </div>
                
                <p className="text-xs text-white/70 mt-2">
                  {remaining === 0 
                    ? "You've used all your free analyses. Sign up to continue!"
                    : `You have ${remaining} free analysis${remaining !== 1 ? 'es' : ''} remaining this month.`}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/chat-analysis" className="w-full">
                <Button size="lg" className="w-full bg-pink-500 hover:bg-pink-600 text-white border-0 shadow-md hover:shadow-lg">
                  {!isLoading && user ? "Chat Analysis" : (tier === 'free' && remaining > 0 ? `Try Now (${remaining} left)` : "Try For Free")}
                </Button>
              </Link>
              
              <Dialog open={isHowItWorksOpen} onOpenChange={setIsHowItWorksOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white border-0 shadow-md hover:shadow-lg"
                  >
                    How It Works
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[85vw] sm:max-w-[480px]" aria-describedby="how-it-works-description">
                  <DialogHeader>
                    <DialogTitle className="text-xl">How Drama Llama Works</DialogTitle>
                    <DialogDescription id="how-it-works-description" className="sr-only">
                      Learn how Drama Llama analyzes your conversations and messages
                    </DialogDescription>
                  </DialogHeader>
                  <div className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-semibold mb-0.5">Chat Analysis</h3>
                        <p className="text-xs">Analyze conversations for tone, patterns, and suggestions for healthier communication.</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-semibold mb-0.5">Message Analysis</h3>
                        <p className="text-xs">Understand tone and intent of single messages with response suggestions.</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-semibold mb-0.5">Vent Mode</h3>
                        <p className="text-xs">Transform emotional messages into calm, constructive communication.</p>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute -top-1 -right-1">
                          <span className="bg-gradient-to-r from-primary to-secondary text-white text-[10px] px-1.5 py-0.5 rounded-full">PRO</span>
                        </div>
                        <h3 className="text-sm font-semibold mb-0.5">Live Talk</h3>
                        <p className="text-xs">Record and transcribe conversations with real-time AI analysis.</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-1">
                      <h3 className="text-sm font-semibold mb-0.5 text-blue-700">Your Privacy Matters</h3>
                      <p className="text-xs">Your conversations are not stored. All processing happens securely with no data saved.</p>
                    </div>
                    
                    <div className="pt-1">
                      <p className="text-xs text-muted-foreground">AI analysis provides perspective, not definitive judgments about your relationships.</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
          
          <div className="hidden md:flex bg-primary items-center justify-center p-6">
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={llamaImage} 
                alt="Drama Llama" 
                className="max-w-full max-h-[300px] object-contain" 
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
