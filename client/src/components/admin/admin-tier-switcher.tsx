import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import type { Tier } from '@/lib/trial-utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  RefreshCwIcon
} from 'lucide-react';

/**
 * A special tier switcher for the admin user only - for testing purposes
 */
export function AdminTierSwitcher() {
  const { user, isLoading } = useAuth();
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  
  // Only show for the admin@dramallamaconsultancy.com account
  const isAdminEmail = user?.email === 'dramallamaconsultancy@gmail.com';
  
  useEffect(() => {
    if (user?.tier) {
      setCurrentTier(user.tier as Tier);
    }
    
    // Auto-show the tier switcher for admin
    if (isAdminEmail) {
      setVisible(true);
    }
  }, [user, isAdminEmail]);
  
  // Toggle visibility with the keyboard shortcut (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  if (isLoading || !isAdminEmail) return null;
  
  if (!visible) return null;
  
  const handleTierChange = async (tier: Tier) => {
    try {
      if (!user?.id) return;
      
      await apiRequest('PUT', `/api/admin/user/tier`, {
        userId: user.id,
        tier
      });
      
      setCurrentTier(tier);
      
      toast({
        title: 'Tier updated',
        description: `Your tier has been updated to ${tier}.`,
      });
      
      // Reload the page to apply the new tier
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast({
        title: 'Failed to update tier',
        description: 'There was an error updating your tier.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-72 shadow-lg border-primary/20 bg-background/95 backdrop-blur">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Admin Tier Testing</CardTitle>
            <CardDescription className="text-xs">
              Change your tier for testing purposes
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setVisible(prev => !prev)}
            className="h-8 w-8"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Select 
              value={currentTier || undefined} 
              onValueChange={(value) => handleTierChange(value as Tier)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="instant">Instant</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              size="icon" 
              variant="outline"
              onClick={() => window.location.reload()}
              title="Refresh page"
              className="h-9 w-9"
            >
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Current email: {user?.email}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}