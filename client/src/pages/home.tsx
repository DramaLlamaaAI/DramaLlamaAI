import Header from "@/components/header";
import Footer from "@/components/footer";
import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import PricingSection from "@/components/pricing-section";
import HowItWorks from "@/components/how-it-works";
import { SupportHelpLines } from "@/components/support-help-lines";
import { RedFlagLibrary } from "@/components/red-flag-library";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, MessageCircle, RefreshCcw, Mic, Zap, Info, AlertTriangle, Crown, ArrowUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user } = useAuth();
  // For now, redirect PRO features to auth page for anonymous users
  // This will be enhanced when proper authentication routing is implemented
  const getWhatsAppGroupsRoute = () => "/coming-soon";
  const getLiveTalkRoute = () => "/auth";

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
        
        {/* Upgrade Section for Authenticated Users */}
        {user && (
          <div className="my-8">
            <div className="max-w-2xl mx-auto bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="h-6 w-6 text-purple-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Current Plan: <Badge variant="secondary" className="ml-1 capitalize">{user.tier}</Badge>
                    </h3>
                    <p className="text-sm text-gray-600">
                      {user.tier === 'free' ? 'Upgrade to unlock more features' : 
                       user.tier === 'personal' ? 'Upgrade to Pro for unlimited access' :
                       user.tier === 'pro' ? 'Upgrade to Deep Dive for premium insights' :
                       'You have access to all features'}
                    </p>
                  </div>
                </div>
                {user.tier !== 'deepdive' && (
                  <Link href="/subscription">
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="my-10">
          <h2 className="text-2xl font-bold text-center mb-6">Choose Your Tool</h2>
          
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-8">
            <p className="text-lg text-center mb-8">
              Choose from our powerful AI-powered communication analysis tools to gain insights into your conversations.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
              <div className="flex items-center gap-3">
                <Link href="/chat-analysis" className="flex-1">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white w-full justify-start">
                    <MessageSquare className="h-5 w-5 mr-2" /> Chat Analysis
                  </Button>
                </Link>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-gray-300 flex-shrink-0">
                      <Info className="h-4 w-4 text-gray-600" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gradient-to-br from-pink-50 to-white border-pink-200">
                    <DialogHeader>
                      <DialogTitle className="text-pink-700 text-xl font-bold">Chat Analysis</DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-700 leading-relaxed">Upload or paste a conversation to get detailed insights about communication patterns and emotional tone.</p>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="flex items-center gap-3">
                <Link href="/vent-mode" className="flex-1">
                  <Button 
                    size="lg" 
                    className="bg-orange-600 hover:bg-orange-700 text-white w-full justify-start"
                  >
                    <Zap className="h-5 w-5 mr-2" /> Vent Mode
                  </Button>
                </Link>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-gray-300 flex-shrink-0">
                      <Info className="h-4 w-4 text-gray-600" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
                    <DialogHeader>
                      <DialogTitle className="text-orange-700 text-xl font-bold">Vent Mode</DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-700 leading-relaxed">A safe space to express your thoughts and get supportive insights about your emotional state.</p>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="flex items-center gap-3">
                <Link href={getWhatsAppGroupsRoute()} className="flex-1">
                  <div className="relative">
                    <Button size="lg" className="bg-[#4CAF50] hover:bg-[#4CAF50]/90 text-white w-full justify-start">
                      <MessageCircle className="h-5 w-5 mr-2" /> WhatsApp Groups
                    </Button>
                    <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-secondary text-white text-[10px]">PRO</Badge>
                  </div>
                </Link>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-gray-300 flex-shrink-0">
                      <Info className="h-4 w-4 text-gray-600" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gradient-to-br from-pink-50 to-white border-pink-200">
                    <DialogHeader>
                      <DialogTitle className="text-pink-700 text-xl font-bold">WhatsApp Groups</DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-700 leading-relaxed">Analyze WhatsApp group conversations to understand dynamics between multiple participants.</p>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="flex items-center gap-3">
                <Link href={getLiveTalkRoute()} className="flex-1">
                  <div className="relative">
                    <Button 
                      size="lg" 
                      className="bg-gray-700 hover:bg-gray-800 text-white w-full justify-start"
                    >
                      <Mic className="h-5 w-5 mr-2" /> Live Talk
                    </Button>
                    <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-secondary text-white text-[10px]">PRO</Badge>
                  </div>
                </Link>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-gray-300 flex-shrink-0">
                      <Info className="h-4 w-4 text-gray-600" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gradient-to-br from-teal-50 to-white border-teal-200">
                    <DialogHeader>
                      <DialogTitle className="text-teal-700 text-xl font-bold">Live Talk</DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-700 leading-relaxed">Real-time conversation analysis and guided coaching during live discussions.</p>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
        
        <FeaturesSection />
        
        {/* Support Section */}
        <section className="py-12 bg-white">
          <div className="container max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">💝 Support & Resources</h2>
            <div className="flex justify-center">
              <div className="bg-gray-50 rounded-lg shadow-lg p-6 w-full max-w-md">
                <div className="space-y-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full justify-start bg-teal-500 hover:bg-teal-600 text-white">
                        📞 Support Helplines
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center text-teal-700">
                          📞 Support Helplines
                        </DialogTitle>
                      </DialogHeader>
                      <SupportHelpLines />
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full justify-start bg-red-500 hover:bg-red-600 text-white">
                        🚩 Red Flag Library
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center text-red-700">
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          Red Flag Library
                        </DialogTitle>
                      </DialogHeader>
                      <RedFlagLibrary />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
    </>
  );
}
