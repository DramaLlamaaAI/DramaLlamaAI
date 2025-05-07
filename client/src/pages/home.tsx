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
import { MessageSquare, MessageCircle, RefreshCcw, Mic } from "lucide-react";

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

      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <HeroSection />
        
        <div className="my-10">
          <h2 className="text-2xl font-bold text-center mb-6">Choose Your Tool</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Chat Analysis Card */}
            <Card className="overflow-hidden">
              <div className="p-6 flex flex-col h-full">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Chat Analysis</h3>
                <p className="text-gray-500 mb-4 text-sm flex-grow">
                  Analyze full conversations between you and another person to understand emotional dynamics.
                </p>
                <Link href="/chat-analysis">
                  <Button className="w-full">Analyze Conversation</Button>
                </Link>
              </div>
            </Card>
            
            {/* Message Analysis Card */}
            <Card className="overflow-hidden">
              <div className="p-6 flex flex-col h-full">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Message Analysis</h3>
                <p className="text-gray-500 mb-4 text-sm flex-grow">
                  Analyze a single message to understand tone, intent, and get suggestions for replies.
                </p>
                <Link href="/message-analysis">
                  <Button className="w-full">Analyze Message</Button>
                </Link>
              </div>
            </Card>
            
            {/* Vent Mode Card */}
            <Card className="overflow-hidden">
              <div className="p-6 flex flex-col h-full">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <RefreshCcw className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Vent Mode
                  <Badge className="ml-2 bg-green-500 text-white text-[10px]">FREE</Badge>
                </h3>
                <p className="text-gray-500 mb-4 text-sm flex-grow">
                  Rewrite emotional messages in a calmer, more constructive way before sending them.
                </p>
                <Link href="/vent-mode">
                  <Button className="w-full">Try Vent Mode</Button>
                </Link>
              </div>
            </Card>
            
            {/* Live Talk Card */}
            <Card className="overflow-hidden">
              <div className="p-6 flex flex-col h-full">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Live Talk
                  <Badge className="ml-2 bg-gradient-to-r from-primary to-secondary text-white text-[10px]">PRO</Badge>
                </h3>
                <p className="text-gray-500 mb-4 text-sm flex-grow">
                  Record and transcribe live conversations for real-time or later analysis.
                </p>
                <Link href="/live-talk">
                  <Button className="w-full">Try Live Talk</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
        
        <HowItWorks />
        <FeaturesSection />
        <PricingSection />
      </main>
      
      <Footer />
    </>
  );
}
