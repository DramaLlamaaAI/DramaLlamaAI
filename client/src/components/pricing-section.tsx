import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserUsage } from "@/lib/openai";

export default function PricingSection() {
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
            <ul className="mb-6 space-y-3">
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Basic tone insights</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>1 analysis per month</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Vent mode access</span>
              </li>
              <li className="flex items-start opacity-50">
                <X className="w-5 h-5 mr-2 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span>No red flag detection</span>
              </li>
              <li className="flex items-start opacity-50">
                <X className="w-5 h-5 mr-2 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span>No pattern tracking</span>
              </li>
            </ul>
            
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
            <p className="text-3xl font-bold mb-0">£4.99<span className="text-base font-normal text-secondary/70">/month</span></p>
          </div>
          
          <CardContent className="p-6">
            <ul className="mb-6 space-y-3">
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Advanced tone analysis</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>10 analyses per month</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Red flag detection</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Communication advice</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Pattern tracking</span>
              </li>
            </ul>
            
            {currentTier === 'personal' ? (
              <Button className="w-full bg-secondary hover:bg-secondary-dark text-white" disabled>
                Current Plan
              </Button>
            ) : (
              <Button className="w-full bg-secondary hover:bg-secondary-dark text-white">
                {currentTier === 'pro' ? 'Downgrade' : 'Upgrade Now'}
              </Button>
            )}
          </CardContent>
        </Card>
        
        {/* Pro Tier */}
        <Card className={`overflow-hidden border-2 ${currentTier === 'pro' ? 'border-primary shadow-md' : 'border-transparent'} transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 bg-white`}>
          <div style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)' }} className="p-4">
            <h3 className="text-xl font-semibold text-white">Pro</h3>
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
                <span>Unlimited analyses</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Drama Score™ benchmarking</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
                <span>Historical analysis</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Advanced export options</span>
              </li>
            </ul>
            
            {currentTier === 'pro' ? (
              <Button variant="outline" className="w-full" disabled style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)', color: 'white', border: 'none' }}>
                Current Plan
              </Button>
            ) : (
              <Button className="w-full" style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)', color: 'white', border: 'none' }}>
                Upgrade Now
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
