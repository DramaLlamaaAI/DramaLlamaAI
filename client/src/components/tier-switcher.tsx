import { useState, useEffect } from "react";
import { getDevTier, setDevTier, DevTier, isDevModeEnabled } from "@/lib/trial-utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export function TierSwitcher() {
  const [currentTier, setCurrentTier] = useState<DevTier>('free');
  const [isVisible, setIsVisible] = useState(false);
  
  // Initialize current tier and visibility on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const devMode = isDevModeEnabled();
      setIsVisible(devMode);
      
      if (devMode) {
        setCurrentTier(getDevTier());
      }
    }
  }, []);
  
  // Handle tier change
  const handleTierChange = (value: string) => {
    if (value) {
      const tier = value as DevTier;
      setCurrentTier(tier);
      setDevTier(tier);
    }
  };
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div className="fixed bottom-16 left-4 z-50 bg-background p-3 border rounded-lg shadow-md flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Test Tier</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs max-w-[200px]">
                Switch between tiers to test different feature sets.
                Changes take effect immediately.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <ToggleGroup 
        type="single" 
        value={currentTier}
        onValueChange={handleTierChange}
        className="flex flex-col gap-1"
      >
        <ToggleGroupItem 
          value="free" 
          className="text-xs justify-between h-7 px-2 rounded"
          aria-label="Free Tier"
        >
          <span>Free Tier</span>
          <span className="inline-block w-3 h-3 rounded-full bg-gray-400"></span>
        </ToggleGroupItem>
        
        <ToggleGroupItem 
          value="personal" 
          className="text-xs justify-between h-7 px-2 rounded"
          aria-label="Personal Tier"
        >
          <span>Personal Tier</span>
          <span className="inline-block w-3 h-3 rounded-full bg-green-400"></span>
        </ToggleGroupItem>
        
        <ToggleGroupItem 
          value="pro" 
          className="text-xs justify-between h-7 px-2 rounded"
          aria-label="Pro Tier"
        >
          <span>Pro Tier</span>
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
        </ToggleGroupItem>
        
        <ToggleGroupItem 
          value="instant" 
          className="text-xs justify-between h-7 px-2 rounded"
          aria-label="Instant Deep Dive (One-time)"
        >
          <span>Instant Deep Dive</span>
          <span className="inline-block w-3 h-3 rounded-full bg-purple-500"></span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}