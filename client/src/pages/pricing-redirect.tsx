import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

export default function PricingRedirect() {
  const [_, navigate] = useLocation();

  useEffect(() => {
    // Redirect to subscription page after a short delay
    const timer = setTimeout(() => {
      navigate('/subscription');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">Redirecting to plans page...</p>
    </div>
  );
}