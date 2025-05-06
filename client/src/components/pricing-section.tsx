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
    <section id="pricing" className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Plan</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Tier */}
        <Card className={`overflow-hidden border ${currentTier === 'free' ? 'border-primary' : 'border-border'} transition-all duration-300 hover:shadow-lg`}>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Free</h3>
            <p className="text-3xl font-bold mb-4">£0<span className="text-base font-normal text-muted-foreground">/month</span></p>
            
            <ul className="mb-6 space-y-2">
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
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            ) : (
              <Button variant="outline" className="w-full">
                Downgrade
              </Button>
            )}
          </CardContent>
        </Card>
        
        {/* Personal Tier */}
        <Card className={`overflow-hidden border-2 ${currentTier === 'personal' ? 'border-primary' : 'border-border'} relative transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1`}>
          <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold py-1 px-3 rounded-bl-lg">
            POPULAR
          </div>
          
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Personal</h3>
            <p className="text-3xl font-bold mb-4">£4.99<span className="text-base font-normal text-muted-foreground">/month</span></p>
            
            <ul className="mb-6 space-y-2">
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Advanced tone analysis</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>10 analyses per month</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Red flag detection</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Communication advice</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Pattern tracking</span>
              </li>
            </ul>
            
            {currentTier === 'personal' ? (
              <Button variant="default" className="w-full" disabled>
                Current Plan
              </Button>
            ) : (
              <Button variant="default" className="w-full">
                {currentTier === 'pro' ? 'Downgrade' : 'Upgrade Now'}
              </Button>
            )}
          </CardContent>
        </Card>
        
        {/* Pro Tier */}
        <Card className={`overflow-hidden border ${currentTier === 'pro' ? 'border-primary' : 'border-border'} transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1`}>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Pro</h3>
            <p className="text-3xl font-bold mb-4">£9.99<span className="text-base font-normal text-muted-foreground">/month</span></p>
            
            <ul className="mb-6 space-y-2">
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Everything in Personal</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Unlimited analyses</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Drama Score™ benchmarking</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Historical analysis</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <span>Advanced export options</span>
              </li>
            </ul>
            
            {currentTier === 'pro' ? (
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            ) : (
              <Button variant={currentTier === 'free' ? 'outline' : 'default'} className="w-full">
                Upgrade Now
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
