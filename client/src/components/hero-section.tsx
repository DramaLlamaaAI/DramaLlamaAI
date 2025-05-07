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
