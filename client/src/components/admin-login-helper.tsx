import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function AdminLoginHelper() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const loginAsAdmin = async () => {
    setIsLoading(true);
    try {
      // Using the default admin credentials
      console.log('Attempting admin login');
      const response = await apiRequest('POST', '/api/auth/login', {
        email: 'dramallamaconsultancy@gmail.com',
        password: 'Drama11ama#2025'
      });
      
      const data = await response.json();
      console.log('Login response:', data);
      
      // Invalidate the user query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: 'Admin Login',
        description: 'Successfully logged in as admin',
      });
    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: 'Login Failed',
        description: 'Could not log in with admin credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Admin Login Helper</h3>
      <p className="text-sm mb-4">
        If you're having trouble accessing the admin section, click below to log in with the default admin credentials.
      </p>
      <Button 
        onClick={loginAsAdmin}
        disabled={isLoading}
        className="bg-amber-500 hover:bg-amber-600 text-white"
      >
        {isLoading ? 'Logging in...' : 'Login as Admin'}
      </Button>
    </div>
  );
}