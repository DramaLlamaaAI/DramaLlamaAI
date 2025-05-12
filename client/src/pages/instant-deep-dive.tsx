import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { CheckCircle, ChevronRight, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import BackHomeButton from "@/components/back-home-button";

export default function InstantDeepDivePage() {
  const [_, setLocation] = useLocation();
  const [showFeatures, setShowFeatures] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-12 bg-gradient-to-b from-purple-50 to-white">
        <div className="container mx-auto px-4">
          <div className="mb-4">
            <BackHomeButton />
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-5xl font-bold mb-4 text-purple-800">Instant Deep Dive</h1>
              <p className="text-xl text-purple-700 mb-6">
                One-time, comprehensive analysis of your conversation
              </p>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Get all the benefits of our Pro-tier analysis without a subscription.
                Perfect for when you need insights on an important conversation.
              </p>
            </div>
            
            <Card className="border-2 border-purple-400 shadow-lg mb-8">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-3xl text-purple-800">One-Time Payment</CardTitle>
                <CardDescription className="text-xl text-purple-600">No subscription, no recurring charges</CardDescription>
                <div className="text-4xl font-bold mt-4 text-purple-800">£2.99</div>
              </CardHeader>
              <CardContent>
                <div className="bg-purple-100 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-purple-800 mb-2 flex items-center">
                    <Zap className="mr-2 h-5 w-5" />
                    What you'll receive:
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-purple-600 mr-2 shrink-0 mt-0.5" />
                      <span>Complete psychological profiles for participants</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-purple-600 mr-2 shrink-0 mt-0.5" />
                      <span>Detailed breakdown of all red flags with severity ratings</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-purple-600 mr-2 shrink-0 mt-0.5" />
                      <span>Individual contributions to tension</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-purple-600 mr-2 shrink-0 mt-0.5" />
                      <span>Advanced communication pattern analysis</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-purple-600 mr-2 shrink-0 mt-0.5" />
                      <span>Downloadable, professional PDF report</span>
                    </li>
                  </ul>
                </div>
                
                <Button 
                  className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700"
                  onClick={() => setLocation("/checkout?product=instant-deep-dive")}
                >
                  Get Instant Analysis Now
                </Button>
                
                <p className="text-center text-sm text-gray-500 mt-4">
                  Secure payment processing. Your conversation data is never stored.
                </p>
              </CardContent>
            </Card>
            
            <div className="mt-12">
              <Button 
                variant="ghost" 
                className="mx-auto flex items-center text-purple-700"
                onClick={() => setShowFeatures(!showFeatures)}
              >
                {showFeatures ? "Hide details" : "See all features"}
                <ChevronRight className={`ml-1 h-4 w-4 transition-transform ${showFeatures ? 'rotate-90' : ''}`} />
              </Button>
              
              {showFeatures && (
                <div className="mt-4 bg-white rounded-lg border p-6 shadow-sm">
                  <h3 className="text-xl font-semibold mb-4">Complete Feature List</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-purple-700 mb-2">Psychological Profiles</h4>
                      <p className="text-gray-700">In-depth analysis of each participant's communication style, emotional patterns, and potential psychological factors influencing the conversation.</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="text-lg font-medium text-purple-700 mb-2">Red Flag Detection</h4>
                      <p className="text-gray-700">Comprehensive identification of concerning patterns like gaslighting, manipulation, love-bombing, and other potentially harmful communication tactics.</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="text-lg font-medium text-purple-700 mb-2">Tension Contributions</h4>
                      <p className="text-gray-700">Analysis of how each participant contributes to tension in the conversation, with specific examples and explanations of these dynamics.</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="text-lg font-medium text-purple-700 mb-2">Communication Patterns</h4>
                      <p className="text-gray-700">Detailed breakdown of recurring communication styles, problem areas, and specific suggestions for improvement.</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="text-lg font-medium text-purple-700 mb-2">Relationship Health Score</h4>
                      <p className="text-gray-700">Comprehensive 0-100 scale assessment with detailed explanations of what the score means and specific factors affecting it.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}