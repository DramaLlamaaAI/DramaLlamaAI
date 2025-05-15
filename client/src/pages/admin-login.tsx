import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('dramallamaconsultancy@gmail.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Query to fetch current user
  const { data: currentUser, isLoading: userLoading } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // If user is already admin, redirect to admin page
  useEffect(() => {
    if (currentUser?.isAdmin) {
      toast({
        title: 'Already Authenticated',
        description: 'You are already logged in as an admin.',
      });
      setLocation('/admin');
    }
  }, [currentUser, setLocation, toast]);

  const handleLoginAsAdmin = async () => {
    setIsLoading(true);
    try {
      console.log('Attempting admin login with:', { email });
      
      const response = await apiRequest('POST', '/api/auth/login', {
        email,
        password: password || 'Drama11ama#2025' // Use default if empty
      });
      
      const data = await response.json();
      console.log('Login response:', data);
      
      // Invalidate the user query to refresh authentication state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: 'Admin Login Successful',
        description: 'You have been logged in as an admin user.',
      });
      
      setLocation('/admin');
    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: 'Login Failed',
        description: 'Unable to log in with the provided credentials.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <CardDescription>
            Enter your admin credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (or leave blank for default)" 
            />
            <p className="text-xs text-muted-foreground">
              Default: Drama11ama#2025
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            disabled={isLoading}
            onClick={handleLoginAsAdmin}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Log in as Admin'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}