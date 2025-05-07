import { useState, useEffect } from "react";
import { resetFreeTrial } from "@/lib/trial-utils";
import { queryClient } from "@/lib/queryClient";

// localStorage key for dev mode status
const DEV_MODE_KEY = 'drama_llama_dev_mode';

export function DevModeToggle() {
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Initialize from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem(DEV_MODE_KEY);
      setIsDevMode(storedValue === 'true');
    }
  }, []);
  
  const handleToggleDevMode = () => {
    const newValue = !isDevMode;
    setIsDevMode(newValue);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEV_MODE_KEY, newValue.toString());
      
      // Reset trial usage when toggling dev mode on
      if (newValue) {
        resetFreeTrial();
        // Force refresh user tier data
        queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
      }
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background p-3 border rounded-lg shadow-md">
      <button 
        onClick={handleToggleDevMode}
        className={`px-3 py-1 rounded text-sm font-medium ${isDevMode ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}
      >
        {isDevMode ? 'Developer Mode: ON' : 'Developer Mode: OFF'}
      </button>
    </div>
  );
}