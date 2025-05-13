import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, RefreshCw, User as UserIcon, X, CheckSquare, ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

// Import the new components we've created
import { UserManagementFilters } from '@/components/admin/user-management-filters';
import { UserDetailView } from '@/components/admin/user-detail-view';
import { BulkDiscountActions } from '@/components/admin/bulk-discount-actions';
import { EmailNotifications } from '@/components/admin/email-notifications';
import { AdvancedDiscountManager } from '@/components/admin/advanced-discount-manager';

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
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt?: string;
}

// Interface for analytics data
interface AnalyticsSummary {
  totalUsers: number;
  usersByTier: { [tier: string]: number };
  registrationsByDate: { date: string; count: number }[];
  tierConversionRate: { fromTier: string; toTier: string; count: number }[];
}

export default function AdminDashboardEnhanced() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  
  // Query to fetch current user
  const { data: currentUser, isLoading: currentUserLoading } = useQuery<User | null>({
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
  const { 
    data: users = [], 
    isLoading: usersLoading,
    refetch: refetchUsers
  } = useQuery<User[]>({
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

  // State for bulk selection
  const [selectAll, setSelectAll] = useState(false);

  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Handle pagination
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Toggle select all users
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers([...currentUsers]);
    }
    setSelectAll(!selectAll);
  };

  // Toggle select individual user
  const toggleSelectUser = (user: User) => {
    if (selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedUsers([]);
    setSelectAll(false);
  };

  // Apply search and filters
  useEffect(() => {
    let result = [...users];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        user => 
          user.username.toLowerCase().includes(query) || 
          user.email.toLowerCase().includes(query)
      );
    }
    
    setFilteredUsers(result);
    setCurrentPage(1); // Reset to first page on filter change
  }, [users, searchQuery]);

  // Handle search query change
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handle tier filter change
  const handleFilterTier = (tier: string | null) => {
    let result = [...users];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        user => 
          user.username.toLowerCase().includes(query) || 
          user.email.toLowerCase().includes(query)
      );
    }
    
    // Apply tier filter
    if (tier) {
      result = result.filter(user => user.tier === tier);
    }
    
    setFilteredUsers(result);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle verified filter change
  const handleFilterVerified = (verified: boolean | null) => {
    let result = [...users];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        user => 
          user.username.toLowerCase().includes(query) || 
          user.email.toLowerCase().includes(query)
      );
    }
    
    // Apply verified filter
    if (verified !== null) {
      result = result.filter(user => user.emailVerified === verified);
    }
    
    setFilteredUsers(result);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setFilteredUsers(users);
    setCurrentPage(1);
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // After completing bulk actions
  const handleBulkActionComplete = () => {
    refetchUsers();
    clearSelections();
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
      {selectedUser ? (
        // Detailed user view
        <UserDetailView 
          user={selectedUser} 
          onBack={() => setSelectedUser(null)} 
        />
      ) : (
        // Main dashboard view
        <div>
          <div className="flex items-center justify-between mb-6">
            <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
            </Tabs>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          
          <TabsContent value="users">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users, tiers, and discounts for Drama Llama.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* User search and filters */}
                <UserManagementFilters 
                  onSearch={handleSearch}
                  onFilterTier={handleFilterTier}
                  onFilterVerified={handleFilterVerified}
                  onReset={resetFilters}
                />
                
                {/* Bulk actions */}
                {selectedUsers.length > 0 && (
                  <div className="mb-6 p-4 border rounded-md bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckSquare className="h-5 w-5 text-primary mr-2" />
                        <span>
                          <strong>{selectedUsers.length}</strong> users selected
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <BulkDiscountActions 
                          selectedUsers={selectedUsers}
                          onComplete={handleBulkActionComplete}
                        />
                        <EmailNotifications 
                          selectedUsers={selectedUsers}
                          onComplete={handleBulkActionComplete}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={clearSelections}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Advanced discount manager */}
                <div className="flex justify-end mb-4">
                  <AdvancedDiscountManager />
                </div>
                
                {/* Users table */}
                <div className="space-y-4">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">
                                <Checkbox 
                                  checked={selectAll} 
                                  onCheckedChange={toggleSelectAll} 
                                />
                              </TableHead>
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
                            {currentUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedUsers.some(u => u.id === user.id)}
                                    onCheckedChange={() => toggleSelectUser(user)}
                                  />
                                </TableCell>
                                <TableCell>{user.id}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                  <div className="inline-block font-medium px-2 py-1 rounded-full text-xs text-white bg-opacity-80 whitespace-nowrap
                                    ${user.tier === 'free' ? 'bg-gray-500' : 
                                    user.tier === 'personal' ? 'bg-blue-500' : 
                                    user.tier === 'pro' ? 'bg-purple-500' : 
                                    'bg-amber-500'}"
                                  >
                                    {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                                  </div>
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
                                    <UserIcon className="h-4 w-4 mr-2" />
                                    Manage
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => currentPage > 1 && paginate(currentPage - 1)}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  isActive={page === currentPage}
                                  onClick={() => paginate(page)}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
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
        </div>
      )}
    </div>
  );
}