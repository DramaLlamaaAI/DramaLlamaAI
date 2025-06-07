import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { PromoCodeInput } from '@/components/promo-code-input';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
// Initialize Stripe with the live mode publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY, {
  // No additional options needed for live mode
});

const CheckoutForm = ({ plan }: { plan: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Build absolute URL with all the necessary parameters
  const getReturnUrl = () => {
    // Create a full return URL with success parameter
    const url = new URL('/subscription', window.location.origin);
    url.searchParams.append('success', 'true');
    url.searchParams.append('plan', plan);
    url.searchParams.append('time', Date.now().toString());
    return url.toString();
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    // Add additional information for live payments
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: getReturnUrl(),
        payment_method_data: {
          billing_details: {
            address: {
              country: 'GB', // Default to UK as payments are in GBP
            },
          },
        },
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
  
  // Get plan and promo code from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Handle plan parameter
    const planParam = params.get('plan');
    if (planParam) {
      setPlan(planParam.charAt(0).toUpperCase() + planParam.slice(1).toLowerCase());
    }
    
    // Handle promo code parameter
    const promoParam = params.get('promo');
    if (promoParam) {
      setPromoCode(promoParam.toUpperCase());
      // Note: We'll apply this promo code after the subscription intent is created
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
      console.log('Subscription response data:', data);
      
      // Check if user already has an active subscription
      if (data.isExisting) {
        // User already has an active subscription, redirect to subscription page with success
        toast({
          title: "Active Subscription",
          description: "You already have an active subscription. Redirecting to your account.",
        });
        navigate('/subscription?existing=true');
        return false;
      }
      
      // Validate client secret exists
      if (!data.clientSecret) {
        throw new Error('No client secret received from server. Payment cannot be initialized.');
      }
      
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
      
      // More detailed error handling
      let errorMessage = 'Something went wrong. Please try again.';
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast({
        title: "Payment Initialization Failed",
        description: `Could not initialize payment: ${errorMessage}`,
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
    const initializeSubscription = async () => {
      // First create the subscription without promo code
      await createOrUpdateSubscription();
      
      // If promo code was provided in URL, apply it
      if (promoCode) {
        await createOrUpdateSubscription(promoCode);
        
        // Show success message for pre-filled promo code
        toast({
          title: "Promo Code Applied",
          description: `Promotional code ${promoCode} has been applied to your order.`,
          variant: "default",
        });
      }
    };
    
    initializeSubscription();
  }, [toast, promoCode]);

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

  // Additional validation for clientSecret format (payment intent or setup intent)
  if (!clientSecret.startsWith('pi_') && !clientSecret.startsWith('seti_')) {
    return (
      <div className="container py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Payment Setup Error</CardTitle>
            <CardDescription>Invalid payment configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The payment system encountered a configuration error. Please try again.
            </p>
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

  // Helper function to format price
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount / 100);
  };

  // Get plan pricing information
  const getPlanInfo = (planName: string) => {
    const planLower = planName.toLowerCase();
    switch(planLower) {
      case 'personal':
        return { price: 399, name: 'Personal', billing: 'monthly' };
      case 'pro':
        return { price: 799, name: 'Pro', billing: 'monthly' };
      case 'instant':
      case 'deepdive':
        return { price: 199, name: 'Deep Dive', billing: 'one-time' };
      default:
        return { price: 399, name: 'Personal', billing: 'monthly' };
    }
  };

  const planInfo = getPlanInfo(plan);

  return (
    <div className="container py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Subscribe to {planInfo.name} Plan</CardTitle>
            <CardDescription>
              {formatPrice(discountInfo?.finalAmount || planInfo.price)} {planInfo.billing === 'monthly' ? 'per month' : 'one-time payment'}
            </CardDescription>
            <div className="mt-2 text-sm text-muted-foreground">
              Please enter your payment details to continue
            </div>
            
            {/* Back to subscription page button */}
            <Button 
              variant="ghost" 
              className="p-0 mt-2 text-muted-foreground flex items-center hover:bg-transparent hover:text-foreground" 
              onClick={() => navigate('/subscription')}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to subscription options
            </Button>
            
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
            {/* Promo code input */}
            {!discountInfo?.hasDiscount && (
              <div className="mb-6">
                {promoCode && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4 flex items-center">
                    <CheckCircle className="text-green-500 mr-2 h-5 w-5" />
                    <div>
                      <p className="font-medium">Promo code <span className="font-bold">{promoCode}</span> applied!</p>
                      <p className="text-sm text-muted-foreground">Promo code successfully applied</p>
                    </div>
                  </div>
                )}
                <PromoCodeInput
                  onApply={(discountPercentage) => {
                    if (discountPercentage > 0) {
                      toast({
                        title: "Verifying Promotion",
                        description: "Please wait while we apply your discount...",
                      });
                    }
                    handleApplyPromoCode(discountPercentage);
                  }}
                />
              </div>
            )}
            
            {clientSecret && (
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#0570de',
                    },
                  },
                }}
              >
                <CheckoutForm plan={plan} />
              </Elements>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center border-t pt-6 space-y-3">
            <p className="text-sm text-center text-foreground">
              By proceeding, you agree to authorize Drama Llama AI to charge your card {formatPrice(discountInfo?.finalAmount || planInfo.price)} {planInfo.billing === 'monthly' ? 'monthly' : 'as a one-time payment'}.
            </p>
            <p className="text-xs text-center text-muted-foreground">
              If you have any questions or concerns, please contact us at Support@DramaLlama.ai
            </p>
            <p className="text-xs text-center text-muted-foreground">
              Secured by Stripe. Your payment information is encrypted and secure.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}