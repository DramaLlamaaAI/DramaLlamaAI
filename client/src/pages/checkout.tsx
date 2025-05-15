import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PromoCodeInput } from '@/components/promo-code-input';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ plan }: { plan: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/subscription?success=true',
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for subscribing to Drama Llama!",
      });
      navigate('/subscription?success=true');
    }
    
    setIsProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement className="mb-6" />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Subscribe to ${plan} Plan`
        )}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState('Personal');
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [discountInfo, setDiscountInfo] = useState<{
    originalAmount: number;
    finalAmount: number;
    discountPercentage: number;
    hasDiscount: boolean;
  } | null>(null);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Get plan from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plan');
    if (planParam) {
      setPlan(planParam.charAt(0).toUpperCase() + planParam.slice(1).toLowerCase());
    }
  }, []);

  // Function to create or update subscription intent
  const createOrUpdateSubscription = async (promoCodeToApply: string | null = null) => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get('plan')?.toLowerCase() || 'personal';
      
      // Include promo code in request if available
      const payload: any = { plan: planParam };
      if (promoCodeToApply) {
        payload.promoCode = promoCodeToApply;
      }
      
      const response = await apiRequest('POST', '/api/create-subscription', payload);
      
      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }
      
      const data = await response.json();
      setClientSecret(data.clientSecret);
      
      // Set discount info if available
      if (data.hasDiscount) {
        setDiscountInfo({
          originalAmount: data.originalAmount,
          finalAmount: data.finalAmount,
          discountPercentage: data.discountPercentage,
          hasDiscount: data.hasDiscount
        });
      } else {
        setDiscountInfo(null);
      }
      
      return true;
    } catch (err: any) {
      console.error('Error with subscription:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      toast({
        title: "Error",
        description: "Could not initialize the payment system. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle promo code application
  const handleApplyPromoCode = async (discountPercentage: number) => {
    if (discountPercentage > 0) {
      // Re-fetch subscription with promo code applied
      await createOrUpdateSubscription(promoCode);
    } else {
      // Remove promo code and refresh
      setPromoCode(null);
      await createOrUpdateSubscription(null);
    }
  };

  // Initial subscription creation
  useEffect(() => {
    createOrUpdateSubscription();
  }, [toast]);

  if (loading) {
    return (
      <div className="container py-12">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center p-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-center text-muted-foreground">Preparing your checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>We couldn't initialize the payment system</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/subscription')} className="w-full">
              Back to Plans
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="container py-12">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center p-8">
          <p className="text-center text-muted-foreground">Unable to initialize payment. Please try again.</p>
          <Button onClick={() => navigate('/subscription')} className="mt-4">
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  // Helper function to format price
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount / 100);
  };

  return (
    <div className="container py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Subscribe to {plan} Plan</CardTitle>
            <CardDescription>
              Please enter your payment details to continue
            </CardDescription>
            
            {/* Display discount information if available */}
            {discountInfo?.hasDiscount && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 font-medium mb-1">Special Discount Applied!</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Original price:</span>
                  <span className="line-through">{formatPrice(discountInfo.originalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-green-600">{discountInfo.discountPercentage}% off</span>
                </div>
                <div className="flex justify-between font-medium mt-1">
                  <span>Your price:</span>
                  <span className="text-green-600">{formatPrice(discountInfo.finalAmount)}</span>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm plan={plan} />
            </Elements>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-6">
            <p className="text-xs text-center text-muted-foreground">
              Secured by Stripe. Your payment information is encrypted and secure.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}