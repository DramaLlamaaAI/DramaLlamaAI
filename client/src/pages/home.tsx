import Header from "@/components/header";
import Footer from "@/components/footer";
import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import PricingSection from "@/components/pricing-section";
import HowItWorks from "@/components/how-it-works";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, MessageCircle, RefreshCcw, Mic, Zap } from "lucide-react";

export default function Home() {
  // Support smooth scrolling for anchor links
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    id: string
  ) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Drama Llama - AI Powered Communication Analysis</title>
        <meta name="description" content="Drama Llama uses AI to analyze conversations, detect emotional tones, and provide clarity on communication dynamics." />
        <meta property="og:title" content="Drama Llama - AI Powered Communication Analysis" />
        <meta property="og:description" content="Get insights on your conversations with our AI-powered analysis tool." />
        <meta property="og:type" content="website" />
      </Helmet>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <HeroSection />
        
        <div className="my-10">
          <h2 className="text-2xl font-bold text-center mb-6">Choose Your Tool</h2>
          
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-8">
            <p className="text-lg text-center mb-8">
              Choose from our powerful AI-powered communication analysis tools to gain insights into your conversations.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <Link href="/chat-analysis">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">
                  <MessageSquare className="h-5 w-5 mr-2" /> Chat Analysis
                </Button>
              </Link>
              
              <Link href="/group-chat-analysis">
                <div className="relative">
                  <Button size="lg" className="bg-[#4CAF50] hover:bg-[#4CAF50]/90 text-white">
                    <MessageSquare className="h-5 w-5 mr-2" /> WhatsApp Group Chat
                  </Button>
                  <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-secondary text-white text-[10px]">PRO</Badge>
                </div>
              </Link>
              
              <Link href="/de-escalate">
                <Button 
                  size="lg" 
                  className="bg-[#2CCFCF] hover:bg-[#2CCFCF]/90 text-white"
                >
                  <Zap className="h-5 w-5 mr-2" /> Vent Mode
                </Button>
              </Link>
              
              <Link href="/live-talk">
                <div className="relative">
                  <Button 
                    size="lg" 
                    className="bg-gray-700 hover:bg-gray-800 text-white"
                  >
                    <Mic className="h-5 w-5 mr-2" /> Live Talk
                  </Button>
                  <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-secondary text-white text-[10px]">PRO</Badge>
                </div>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-primary mb-3 flex justify-center">
                  <MessageSquare className="h-16 w-16" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Chat Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Upload or paste a conversation to get detailed insights about communication patterns and emotional tone.
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-[#4CAF50] mb-3 flex justify-center">
                  <MessageSquare className="h-16 w-16" />
                </div>
                <h3 className="text-lg font-semibold mb-2 flex items-center justify-center">
                  WhatsApp Group Chat
                  <Badge className="ml-2 bg-gradient-to-r from-primary to-secondary text-[10px]">PRO</Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Analyze WhatsApp group conversations to understand dynamics between multiple participants.
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-[#2CCFCF] mb-3 flex justify-center">
                  <Zap className="h-16 w-16" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Vent Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Rewrite emotional messages into calmer, more effective communication while preserving intent.
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-gray-700 mb-3 flex justify-center">
                  <Mic className="h-16 w-16" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Live Talk</h3>
                <p className="text-sm text-muted-foreground">
                  Record conversations in real-time for immediate transcription and analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <FeaturesSection />
        <PricingSection />
      </main>
      
    </>
  );
}
