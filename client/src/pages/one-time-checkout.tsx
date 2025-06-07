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

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  const getReturnUrl = () => {
    const url = new URL('/', window.location.origin);
    url.searchParams.append('success', 'true');
    url.searchParams.append('type', 'deep-dive');
    return url.toString();
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: getReturnUrl(),
        payment_method_data: {
          billing_details: {
            address: {
              country: 'GB',
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
        description: "Your Deep Dive analysis credit has been added!",
      });
      navigate('/?success=true&type=deep-dive');
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
          'Purchase Deep Dive Analysis'
        )}
      </Button>
    </form>
  );
};

export default function OneTimeCheckout() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [discountInfo, setDiscountInfo] = useState<{
    originalAmount: number;
    finalAmount: number;
    discountPercentage: number;
    hasDiscount: boolean;
  } | null>(null);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount / 100);
  };

  const createPaymentIntent = async (promoCodeToApply: string | null = null) => {
    try {
      setLoading(true);
      
      const payload: any = { 
        plan: 'instant',
        amount: 199 // £1.99 in pence
      };
      if (promoCodeToApply) {
        payload.promoCode = promoCodeToApply;
      }
      
      const response = await apiRequest('POST', '/api/create-payment-intent', payload);
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      
      const data = await response.json();
      console.log('Payment intent response data:', data);
      
      if (!data.clientSecret) {
        throw new Error('No client secret received from server');
      }
      
      setClientSecret(data.clientSecret);
      
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
      console.error('Error creating payment intent:', err);
      setError(err.message || 'Failed to initialize payment');
      toast({
        title: "Payment Initialization Failed",
        description: err.message || 'Could not initialize payment',
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPromoCode = async (discountPercentage: number) => {
    if (discountPercentage > 0) {
      await createPaymentIntent(promoCode);
    } else {
      setPromoCode(null);
      await createPaymentIntent(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const promoParam = params.get('promo');
    if (promoParam) {
      setPromoCode(promoParam.toUpperCase());
    }
    
    const initializePayment = async () => {
      await createPaymentIntent();
      if (promoParam) {
        await createPaymentIntent(promoParam.toUpperCase());
        toast({
          title: "Promo Code Applied",
          description: `Promotional code ${promoParam.toUpperCase()} has been applied.`,
        });
      }
    };
    
    initializePayment();
  }, []);

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
            <Button onClick={() => navigate('/')} className="w-full">
              Back to Home
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
          <Button onClick={() => navigate('/')} className="mt-4">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const finalPrice = discountInfo?.finalAmount || 199;

  return (
    <div className="container py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Deep Dive Analysis</CardTitle>
            <CardDescription>
              {formatPrice(finalPrice)} one-time payment
            </CardDescription>
            <div className="mt-2 text-sm text-muted-foreground">
              Get instant access to our most detailed conversation analysis
            </div>
            
            <Button 
              variant="ghost" 
              className="p-0 mt-2 text-muted-foreground flex items-center hover:bg-transparent hover:text-foreground" 
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to home
            </Button>
            
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
            {!discountInfo?.hasDiscount && (
              <div className="mb-6">
                {promoCode && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4 flex items-center">
                    <CheckCircle className="text-green-500 mr-2 h-5 w-5" />
                    <div>
                      <p className="font-medium">Promo code <span className="font-bold">{promoCode}</span> applied!</p>
                      <p className="text-sm text-muted-foreground">Discount successfully applied</p>
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
                <CheckoutForm />
              </Elements>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center border-t pt-6 space-y-3">
            <p className="text-sm text-center text-foreground">
              By proceeding, you agree to authorize Drama Llama AI to charge your card {formatPrice(finalPrice)} as a one-time payment.
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