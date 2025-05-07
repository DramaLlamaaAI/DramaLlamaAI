import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeInfo, Flag, BarChart2 } from "lucide-react";
import llamaImage from "@assets/FB Profile Pic.png";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function HeroSection() {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  
  return (
    <div className="mb-10">
      <Card className="rounded-2xl shadow-lg overflow-hidden border-0">
        <div className="grid md:grid-cols-2">
          <CardContent className="p-6 md:p-10 bg-primary text-white">
            <h2 className="text-3xl font-bold mb-4 text-white">They gaslight. We spotlight.</h2>
            <p className="text-lg text-white/80 mb-6">
              Drama Llama uses AI to analyze conversations, detect emotional tones, and provide clarity on communication dynamics.
            </p>
            
            <div className="flex flex-wrap gap-3 mb-8">
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
            
            <div className="flex flex-wrap gap-3">
              <Link href="/chat-analysis">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary text-white border-0 shadow-md hover:shadow-lg">
                  Try For Free
                </Button>
              </Link>
              
              <Dialog open={isHowItWorksOpen} onOpenChange={setIsHowItWorksOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-gradient-to-r from-[#FF69B4] to-[#22C9C9] text-white border-0 shadow-md hover:shadow-lg"
                  >
                    How It Works
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[85vw] sm:max-w-[550px]" aria-describedby="how-it-works-description">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">How Drama Llama Works</DialogTitle>
                    <DialogDescription id="how-it-works-description" className="sr-only">
                      Learn how Drama Llama analyzes your conversations and messages
                    </DialogDescription>
                  </DialogHeader>
                  <div className="pt-4 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Chat Analysis</h3>
                      <p>Paste a conversation to get insights about emotional tone, identify patterns and red flags, and receive advice on healthier communication.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Message Analysis</h3>
                      <p>Input a single message to understand its tone, potential interpretations, and get suggestions for effective responses.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Vent Mode</h3>
                      <p>Transform heated emotional messages into calm, constructive communication that preserves your concerns while opening the door to resolution.</p>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute -top-2 -right-2">
                        <span className="bg-gradient-to-r from-primary to-secondary text-white text-xs px-2 py-0.5 rounded-full">PRO</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-1">Live Talk</h3>
                      <p>Record conversations in real-time, have them automatically transcribed, and receive immediate AI-powered analysis of the discussion dynamics.</p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-2">
                      <h3 className="text-lg font-semibold mb-1 text-blue-700">Your Privacy Matters</h3>
                      <p>Drama Llama doesn't store or have visibility into your conversations. All processing happens securely between your device and our AI system. Your data is never saved.</p>
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground">Drama Llama uses advanced AI to analyze communication patterns and emotional cues. All insights are meant to provide perspective, not definitive judgments about your relationships.</p>
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
