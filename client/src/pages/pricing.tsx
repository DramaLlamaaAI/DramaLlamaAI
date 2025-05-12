import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import BackHomeButton from "@/components/back-home-button";

export default function PricingPage() {
  const [_, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="mb-4">
            <BackHomeButton />
          </div>
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Choose Your Plan</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get communication insights that help improve your relationships, with options for every need
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Tier */}
            <Card className="border-2 border-gray-200 flex flex-col">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">Free</CardTitle>
                <div className="text-3xl font-bold mt-2">£0</div>
                <CardDescription>For occasional analysis</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>1 chat analysis per month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Basic conversation health score</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Red flag indicators</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Export to PDF</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation("/")}
                >
                  Current Plan
                </Button>
              </CardFooter>
            </Card>
            
            {/* Personal Tier */}
            <Card className="border-2 border-primary flex flex-col shadow-lg relative">
              <div className="absolute top-0 right-0 bg-primary text-white text-xs px-3 py-1 rounded-bl-lg font-semibold">
                POPULAR
              </div>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">Personal</CardTitle>
                <div className="text-3xl font-bold mt-2">£3.99<span className="text-base font-normal text-gray-600">/month</span></div>
                <CardDescription>For regular users</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>5 chat analyses per month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Detailed red flag analysis</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Communication patterns detection</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Unlimited message analysis</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>PDF and mobile exports</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  className="w-full"
                  onClick={() => setLocation("/subscription?tier=personal")}
                >
                  Subscribe Now
                </Button>
              </CardFooter>
            </Card>
            
            {/* Pro Tier */}
            <Card className="border-2 border-gray-200 flex flex-col">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="text-3xl font-bold mt-2">£8.99<span className="text-base font-normal text-gray-600">/month</span></div>
                <CardDescription>For power users</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Unlimited chat analyses</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Psychological profiles</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Tension contribution insights</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>De-escalation rewrites</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Audio transcription & analysis</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/subscription?tier=pro")}
                >
                  Subscribe Now
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* One-time offer */}
          <div className="mt-12 max-w-2xl mx-auto">
            <Card className="border-2 border-purple-400 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-center text-2xl text-purple-700">Instant Deep Dive</CardTitle>
                <CardDescription className="text-center text-purple-600">One-time payment. No subscription required.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-purple-700">£2.99</span>
                  <span className="text-lg text-purple-600"> one time</span>
                </div>
                <p className="text-purple-700 text-center mb-4">
                  Get a comprehensive Pro-level analysis for a single conversation without any subscription commitment.
                </p>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => setLocation("/instant-deep-dive")}
                >
                  Get Instant Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}