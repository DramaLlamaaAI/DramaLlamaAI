import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DevModeFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [selectedTier, setSelectedTier] = useState('free');
  const { toast } = useToast();

  // Check for existing developer mode cookies on component mount
  useEffect(() => {
    const devModeCookie = document.cookie.split('; ').find(row => row.startsWith('dev_mode='));
    const devTierCookie = document.cookie.split('; ').find(row => row.startsWith('dev_tier='));
    
    if (devModeCookie) {
      setDevMode(devModeCookie.split('=')[1] === 'true');
    }
    
    if (devTierCookie) {
      setSelectedTier(devTierCookie.split('=')[1]);
    }
  }, []);

  const toggleDevMode = (checked: boolean) => {
    setDevMode(checked);
    if (checked) {
      // Set cookies for 24 hours (1 day)
      document.cookie = `dev_mode=true;path=/;max-age=${60 * 60 * 24}`;
      document.cookie = `dev_tier=${selectedTier};path=/;max-age=${60 * 60 * 24}`;
      
      toast({
        title: 'Developer Mode Activated',
        description: `Now using ${selectedTier.toUpperCase()} tier for testing.`,
      });
    } else {
      // Remove the cookies
      document.cookie = 'dev_mode=;path=/;max-age=0';
      document.cookie = 'dev_tier=;path=/;max-age=0';
      
      toast({
        title: 'Developer Mode Deactivated',
        description: 'Using actual database tier settings now.',
      });
    }
  };

  const changeTier = (value: string) => {
    setSelectedTier(value);
    if (devMode) {
      document.cookie = `dev_tier=${value};path=/;max-age=${60 * 60 * 24}`;
      
      toast({
        title: 'Test Tier Changed',
        description: `Now using ${value.toUpperCase()} tier for testing.`,
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className="w-64">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Developer Mode</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="floating-dev-mode" 
                checked={devMode}
                onCheckedChange={toggleDevMode}
              />
              <Label htmlFor="floating-dev-mode">Enable Testing</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="floating-tier-select">Test as Tier:</Label>
              <Select 
                disabled={!devMode} 
                value={selectedTier} 
                onValueChange={changeTier}
              >
                <SelectTrigger id="floating-tier-select" className="w-full">
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="instant">Instant Deep Dive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {devMode 
                ? `Currently testing as ${selectedTier.toUpperCase()} tier` 
                : "Developer mode disabled"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Button 
          variant="outline" 
          size="sm"
          className="rounded-full h-12 w-12 flex items-center justify-center shadow-md"
          onClick={() => setIsOpen(true)}
        >
          <Settings className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}