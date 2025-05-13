import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersByTierChart from '@/components/analytics/users-by-tier-chart';
import RegistrationsChart from '@/components/analytics/registrations-chart';
import TierConversionChart from '@/components/analytics/tier-conversion-chart';
import UserStatsCards from '@/components/analytics/user-stats-cards';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

// Interface for user data
interface User {
  id: number;
  username: string;
  email: string;
  tier: string;
  isAdmin: boolean;
  emailVerified: boolean;
  discountPercentage: number;
  discountExpiryDate: string | null;
}

// Define the user type for the current user
interface CurrentUser {
  id: number;
  username: string;
  email: string;
  tier: string;
  isAdmin: boolean;
  emailVerified: boolean;
}

// Interface for analytics data
interface AnalyticsSummary {
  totalUsers: number;
  usersByTier: { [tier: string]: number };
  registrationsByDate: { date: string; count: number }[];
  tierConversionRate: { fromTier: string; toTier: string; count: number }[];
}

// Define schemas for form validation
const discountSchema = z.object({
  discountPercentage: z.coerce.number().min(0).max(100),
  expiryDays: z.coerce.number().min(1).optional(),
});

type DiscountFormValues = z.infer<typeof discountSchema>;

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  
  // Form for setting user discount
  const discountForm = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      discountPercentage: 0,
      expiryDays: 30,
    },
  });

  // Query to fetch current user
  const { data: currentUser, isLoading: currentUserLoading } = useQuery<CurrentUser | null>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });
  
  // Check if the user is admin and has the right email
  useEffect(() => {
    if (!currentUserLoading && currentUser) {
      if (!currentUser.isAdmin || currentUser.email !== 'dramallamaconsultancy@gmail.com') {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access this page.',
          variant: 'destructive',
        });
        setLocation('/');
      }
    } else if (!currentUserLoading && !currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access this page.',
      });
      setLocation('/auth');
    }
  }, [currentUser, currentUserLoading, setLocation, toast]);

  // Query to fetch all users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: !!currentUser?.isAdmin,
  });
  
  // Query to fetch analytics data
  const { 
    data: analyticsData, 
    isLoading: analyticsLoading,
    refetch: refetchAnalytics 
  } = useQuery<AnalyticsSummary>({
    queryKey: ['/api/admin/analytics'],
    enabled: !!currentUser?.isAdmin,
  });

  // Mutation to update user tier
  const updateTierMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: number; tier: string }) => {
      const res = await apiRequest('PUT', '/api/admin/user/tier', { userId, tier });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Tier Updated',
        description: 'User tier has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Update Tier',
        description: error.message || 'An error occurred while updating user tier.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to set user discount
  const setDiscountMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      discountPercentage, 
      expiryDays 
    }: { 
      userId: number; 
      discountPercentage: number; 
      expiryDays?: number;
    }) => {
      const res = await apiRequest('PUT', '/api/admin/user/discount', { 
        userId, 
        discountPercentage, 
        expiryDays 
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Discount Applied',
        description: 'User discount has been successfully applied.',
      });
      setSelectedUser(null);
      discountForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Apply Discount',
        description: error.message || 'An error occurred while applying the discount.',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission for discounts
  const onDiscountSubmit = (values: DiscountFormValues) => {
    if (!selectedUser) return;
    
    setDiscountMutation.mutate({
      userId: selectedUser.id,
      discountPercentage: values.discountPercentage,
      expiryDays: values.expiryDays,
    });
  };

  // Handle tier change
  const handleTierChange = (userId: number, tier: string) => {
    updateTierMutation.mutate({ userId, tier });
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (currentUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser?.isAdmin || currentUser.email !== 'dramallamaconsultancy@gmail.com') {
    return null; // Redirect happens via useEffect
  }

  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users, tiers, and discounts for Drama Llama.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Verified</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users?.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.id}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Select 
                                defaultValue={user.tier}
                                onValueChange={(value) => handleTierChange(user.id, value)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue placeholder="Select tier" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="personal">Personal</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                  <SelectItem value="instant">Instant</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {user.emailVerified ? (
                                <span className="text-green-500">Verified</span>
                              ) : (
                                <span className="text-red-500">Not Verified</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.discountPercentage > 0 ? (
                                <div className="flex flex-col">
                                  <span className="text-green-500">{user.discountPercentage}%</span>
                                  <span className="text-xs text-gray-500">
                                    Expires: {formatDate(user.discountExpiryDate)}
                                  </span>
                                </div>
                              ) : (
                                <span>None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                Apply Discount
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedUser && (
            <Card>
              <CardHeader>
                <CardTitle>Apply Discount for {selectedUser.username}</CardTitle>
                <CardDescription>
                  Set a discount percentage and expiry period for this user.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...discountForm}>
                  <form onSubmit={discountForm.handleSubmit(onDiscountSubmit)} className="space-y-6">
                    <FormField
                      control={discountForm.control}
                      name="discountPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Percentage (%)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" min="0" max="100" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter a value between 0-100%
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={discountForm.control}
                      name="expiryDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Period (days)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="30" min="1" {...field} />
                          </FormControl>
                          <FormDescription>
                            Number of days before the discount expires
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex gap-2">
                      <Button type="submit" disabled={setDiscountMutation.isPending}>
                        {setDiscountMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Apply Discount
                      </Button>
                      <Button 
                        variant="outline" 
                        type="button" 
                        onClick={() => setSelectedUser(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>
                  View user statistics and engagement metrics for Drama Llama.
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchAnalytics()}
                disabled={analyticsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${analyticsLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Analytics Cards */}
              <UserStatsCards 
                data={analyticsData || {
                  totalUsers: 0,
                  usersByTier: {},
                  registrationsByDate: [],
                  tierConversionRate: []
                }} 
                isLoading={analyticsLoading} 
              />
              
              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <UsersByTierChart 
                  data={analyticsData?.usersByTier || {}} 
                  isLoading={analyticsLoading} 
                />
                
                <RegistrationsChart 
                  data={analyticsData?.registrationsByDate || []} 
                  isLoading={analyticsLoading}
                />
              </div>
              
              <TierConversionChart 
                data={analyticsData?.tierConversionRate || []} 
                isLoading={analyticsLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}