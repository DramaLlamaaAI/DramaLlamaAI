import { useState, useEffect } from 'react';
import { X, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import llamaImage from "@assets/FB Profile Pic.png";

export function BetaPromoBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show if user clicked sign up/sign in button in this session
    const hasClicked = sessionStorage.getItem('betaPromoClicked');
    if (!hasClicked) {
      // Show banner after 1 second
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Don't remember dismissal - will show again on next visit
  };

  // Show banner to all users, not tier-specific
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg shadow-lg p-4 border border-pink-300">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white hover:text-pink-200 transition-colors"
      >
        <X size={16} />
      </button>
      
      <div className="pr-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-white p-0.5 flex items-center justify-center">
            <img 
              src={llamaImage} 
              alt="Drama Llama" 
              className="w-full h-full rounded-full object-cover" 
            />
          </div>
          <h3 className="font-bold text-sm">Upgrade to our Beta Tier — FREE!</h3>
        </div>
        
        <p className="text-sm mb-3 leading-relaxed">
          Get in-depth <strong>🚩 red flag insight</strong> and emotional tone analysis.
        </p>
        <p className="text-xs mb-3 text-pink-100">
          👉 Check our Facebook page to see how to qualify.
        </p>
        
        <div className="flex flex-col gap-2">
          <Link href="/auth">
            <Button 
              size="sm" 
              className="w-full bg-white text-pink-600 hover:bg-pink-50 font-semibold"
              onClick={() => {
                // Close banner, set session flag, and navigate to auth page
                setIsVisible(false);
                sessionStorage.setItem('betaPromoClicked', 'true');
                window.location.href = '/auth';
              }}
            >
              Sign Up/Sign In
            </Button>
          </Link>
          
          <a 
            href="https://www.facebook.com/profile.php?id=61575701821212" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs text-pink-100 hover:text-white transition-colors"
          >
            <Facebook size={14} />
            Check our Facebook for more info
          </a>
        </div>
        
        <div className="text-xs text-pink-200 mt-2 text-center">
          Drama Llama AI
        </div>
      </div>
    </div>
  );
}