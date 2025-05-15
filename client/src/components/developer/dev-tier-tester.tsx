import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

/**
 * This is a developer tool for testing different tiers without having to modify the database.
 * It sets cookies that override the user's actual tier for testing purposes.
 */
export function DevTierTester() {
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
    <Card>
      <CardHeader>
        <CardTitle>Developer Mode</CardTitle>
        <CardDescription>
          Override tier settings for testing without changing the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch 
            id="dev-mode" 
            checked={devMode}
            onCheckedChange={toggleDevMode}
          />
          <Label htmlFor="dev-mode">Enable Developer Mode</Label>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tier-select">Test as Tier:</Label>
          <Select 
            disabled={!devMode} 
            value={selectedTier} 
            onValueChange={changeTier}
          >
            <SelectTrigger id="tier-select" className="w-full">
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
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Note: This only affects the client-side experience for testing. 
          Server-side restrictions may still apply.
        </p>
      </CardFooter>
    </Card>
  );
}