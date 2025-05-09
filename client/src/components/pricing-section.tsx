import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserUsage } from "@/lib/openai";

export default function PricingSection() {
  const [showMoreFree, setShowMoreFree] = useState(false);
  
  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });

  const currentTier = usage?.tier || 'free';

  return (
    <section id="pricing" className="mb-12 py-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl px-6">
      <h2 className="text-3xl font-bold mb-6 text-center text-primary">Choose Your Plan</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Tier */}
        <Card className={`overflow-hidden border-2 ${currentTier === 'free' ? 'border-primary shadow-md' : 'border-transparent'} transition-all duration-300 hover:shadow-lg bg-white`}>
          <div className="bg-primary/10 p-4">
            <h3 className="text-xl font-semibold text-primary">Free</h3>
            <p className="text-3xl font-bold mb-0">£0<span className="text-base font-normal text-primary/70">/month</span></p>
          </div>
          <CardContent className="p-6">
            <ul className="mb-3 space-y-3">
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>1 chat analysis per month</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Overall Emotional Tone Summary</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Conversation Health Meter</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Key Summary Quotes</span>
              </li>
            </ul>
            
            {showMoreFree && (
              <ul className="mb-3 space-y-3 animate-in fade-in duration-300">
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Basic Communication Insights</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Participant Analysis</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>PDF Export Function</span>
                </li>
                <li className="flex items-start">
                  <X className="w-5 h-5 mr-2 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Advanced Communication Advice</span>
                </li>
                <li className="flex items-start">
                  <X className="w-5 h-5 mr-2 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Red Flag Detection</span>
                </li>
              </ul>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs mb-4 flex items-center justify-center text-muted-foreground"
              onClick={() => setShowMoreFree(!showMoreFree)}
            >
              {showMoreFree ? (
                <>Show less <ChevronUp className="ml-1 h-3 w-3" /></>
              ) : (
                <>Show more <ChevronDown className="ml-1 h-3 w-3" /></>
              )}
            </Button>
            
            {currentTier === 'free' ? (
              <Button variant="outline" className="w-full border-primary text-primary" disabled>
                Current Plan
              </Button>
            ) : (
              <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-white">
                Downgrade
              </Button>
            )}
          </CardContent>
        </Card>
        
        {/* Personal Tier */}
        <Card className={`overflow-hidden border-2 ${currentTier === 'personal' ? 'border-secondary shadow-lg' : 'border-transparent'} relative transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 bg-white`}>
          <div className="absolute top-0 right-0 bg-secondary text-white text-xs font-bold py-1 px-3 rounded-bl-lg">
            POPULAR
          </div>
          
          <div className="bg-secondary/10 p-4">
            <h3 className="text-xl font-semibold text-secondary">Personal</h3>
            <p className="text-3xl font-bold mb-0">£3.99<span className="text-base font-normal text-secondary/70">/month</span></p>
          </div>
          
          <CardContent className="p-6">
            <ul className="mb-6 space-y-3">
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Everything in Free plan</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>10 chat analyses per month</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Advanced Emotional Tone Analysis</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Individual Contributions to Tension</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>🚩 Red Flags Detection & Meters</span>
              </li>
            </ul>
            
            {currentTier === 'personal' ? (
              <Button className="w-full bg-secondary hover:bg-secondary-dark text-white" disabled>
                Current Plan
              </Button>
            ) : (
              <Button 
                className="w-full bg-secondary hover:bg-secondary-dark text-white"
                onClick={() => window.location.href = '/subscription'}
              >
                {currentTier === 'pro' ? 'Downgrade' : 'Upgrade Now'}
              </Button>
            )}
          </CardContent>
        </Card>
        
        {/* Pro Tier */}
        <Card className={`overflow-hidden border-2 ${currentTier === 'pro' ? 'border-primary shadow-md' : 'border-transparent'} transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 bg-white`}>
          <div style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)' }} className="p-4">
            <h3 className="text-xl font-semibold text-white">🦙 🦙 Pro/Relationship</h3>
            <p className="text-3xl font-bold mb-0 text-white">£9.99<span className="text-base font-normal text-white/80">/month</span></p>
          </div>
          
          <CardContent className="p-6">
            <ul className="mb-6 space-y-3">
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Everything in Personal</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Unlimited chat uploads</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Conversation Dynamics</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Behavioural Patterns Detection</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Advanced Communication Trend Lines</span>
              </li>
            </ul>
            
            {currentTier === 'pro' ? (
              <Button variant="outline" className="w-full" disabled style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)', color: 'white', border: 'none' }}>
                Current Plan
              </Button>
            ) : (
              <Button 
                className="w-full" 
                style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)', color: 'white', border: 'none' }}
                onClick={() => window.location.href = '/subscription'}
              >
                Upgrade Now
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
