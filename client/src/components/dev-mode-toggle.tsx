import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { resetFreeTrial } from "@/lib/trial-utils";
import { queryClient } from "@/lib/queryClient";

// localStorage key for dev mode status
const DEV_MODE_KEY = 'drama_llama_dev_mode';

export function DevModeToggle() {
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Initialize from localStorage on component mount
  useEffect(() => {
    const storedValue = localStorage.getItem(DEV_MODE_KEY);
    setIsDevMode(storedValue === 'true');
  }, []);
  
  const handleToggleDevMode = (checked: boolean) => {
    setIsDevMode(checked);
    localStorage.setItem(DEV_MODE_KEY, checked.toString());
    
    // Reset trial usage when toggling dev mode
    if (checked) {
      resetFreeTrial();
      // Force refresh user tier data
      queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center space-x-2 bg-background p-3 border rounded-lg shadow-md">
      <Switch 
        id="dev-mode" 
        checked={isDevMode} 
        onCheckedChange={handleToggleDevMode} 
      />
      <Label htmlFor="dev-mode" className="font-medium text-sm">Developer Mode</Label>
      {isDevMode && (
        <div className="absolute -top-10 right-0 bg-yellow-100 text-yellow-800 p-2 rounded text-xs whitespace-nowrap">
          Trial restrictions disabled
        </div>
      )}
    </div>
  );
}