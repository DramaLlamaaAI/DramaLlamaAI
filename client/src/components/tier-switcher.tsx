import { useState, useEffect } from "react";
import { getDevTier, setDevTier, DevTier, isDevModeEnabled } from "@/lib/trial-utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Info, ChevronDown } from "lucide-react";

export function TierSwitcher() {
  const [currentTier, setCurrentTier] = useState<DevTier>('free');
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
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
  
  // Get display name and color for current tier
  const getTierInfo = (tier: DevTier) => {
    switch(tier) {
      case 'free':
        return { name: 'Free Tier', color: 'bg-gray-400' };
      case 'personal':
        return { name: 'Personal Tier', color: 'bg-green-400' };
      case 'pro':
        return { name: 'Pro Tier', color: 'bg-blue-500' };
      case 'instant':
        return { name: 'Instant Deep Dive', color: 'bg-purple-500' };
      default:
        return { name: 'Free Tier', color: 'bg-gray-400' };
    }
  };
  
  const tierInfo = getTierInfo(currentTier);
  
  return (
    <div className="fixed bottom-16 left-4 z-50">
      <div className="bg-background p-2 border rounded-lg shadow-md flex flex-col items-start">
        <Select value={currentTier} onValueChange={handleTierChange}>
          <SelectTrigger className="w-auto min-w-[160px] h-8 text-xs px-3 border-0 shadow-none">
            <div className="flex items-center justify-between space-x-2">
              <span className="font-semibold">Test Tier:</span>
              <div className="flex items-center">
                <span>{tierInfo.name}</span>
                <span className={`ml-2 inline-block w-3 h-3 rounded-full ${tierInfo.color}`}></span>
              </div>
            </div>
          </SelectTrigger>
          <SelectContent align="start" side="top">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-end px-2 py-1 border-b">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs max-w-[200px]">
                    Switch between tiers to test different feature sets.
                    Changes take effect immediately.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <SelectItem value="free" className="text-xs">
              <div className="flex items-center justify-between w-full">
                <span>Free Tier</span>
                <span className="inline-block w-3 h-3 rounded-full bg-gray-400"></span>
              </div>
            </SelectItem>
            
            <SelectItem value="personal" className="text-xs">
              <div className="flex items-center justify-between w-full">
                <span>Personal Tier</span>
                <span className="inline-block w-3 h-3 rounded-full bg-green-400"></span>
              </div>
            </SelectItem>
            
            <SelectItem value="pro" className="text-xs">
              <div className="flex items-center justify-between w-full">
                <span>Pro Tier</span>
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
              </div>
            </SelectItem>
            
            <SelectItem value="instant" className="text-xs">
              <div className="flex items-center justify-between w-full">
                <span>Instant Deep Dive</span>
                <span className="inline-block w-3 h-3 rounded-full bg-purple-500"></span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}