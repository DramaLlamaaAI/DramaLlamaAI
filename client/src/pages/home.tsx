import Header from "@/components/header";
import Footer from "@/components/footer";
import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import PricingSection from "@/components/pricing-section";
import HowItWorks from "@/components/how-it-works";
import LiveTalk from "@/components/live-talk";
import ChatAnalysis from "@/components/chat-analysis";
import MessageAnalysis from "@/components/message-analysis";
import VentMode from "@/components/vent-mode";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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
          <h2 className="text-2xl font-bold text-center mb-6">Try Drama Llama Tools</h2>
          
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 mb-6">
              <TabsTrigger value="chat" className="py-3">
                Chat Analysis
              </TabsTrigger>
              <TabsTrigger value="message" className="py-3">
                Message Analysis
              </TabsTrigger>
              <TabsTrigger value="vent" className="py-3">
                Vent Mode
              </TabsTrigger>
              <TabsTrigger value="live" className="py-3 relative">
                Live Talk
                <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-secondary text-white text-[10px] px-1.5">PRO</Badge>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat">
              <ChatAnalysis />
            </TabsContent>
            
            <TabsContent value="message">
              <MessageAnalysis />
            </TabsContent>
            
            <TabsContent value="vent">
              <VentMode />
            </TabsContent>
            
            <TabsContent value="live">
              <LiveTalk />
            </TabsContent>
          </Tabs>
        </div>
        
        <HowItWorks />
        <FeaturesSection />
        <PricingSection />
      </main>
      
      <Footer />
    </>
  );
}
