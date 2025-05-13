import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubscriptionManager } from './subscription-manager';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  BarChart4, 
  History,
  ArrowLeft
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Analysis {
  id: number;
  userId: number;
  title: string;
  type: string;
  content: string;
  createdAt: string;
}

interface UserData {
  id: number;
  username: string;
  email: string;
  tier: string;
  isAdmin: boolean;
  emailVerified: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  discountPercentage: number;
  discountExpiryDate: string | null;
  createdAt?: string;
}

interface UserDetailViewProps {
  user: UserData;
  onBack: () => void;
}

export function UserDetailView({ user, onBack }: UserDetailViewProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Query user analyses
  const { 
    data: analyses,
    isLoading: analysesLoading
  } = useQuery<Analysis[]>({
    queryKey: [`/api/admin/users/${user.id}/analyses`],
    enabled: activeTab === 'analyses',
  });

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* User Profile Card */}
        <Card className="md:w-1/3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <User className="w-5 h-5 mr-2" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <span className="text-2xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-xl font-bold">{user.username}</h3>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Mail className="h-4 w-4 mr-1" />
                {user.email}
              </div>
              <div className="mt-3 flex gap-2">
                {user.tier === 'free' && <Badge className="bg-gray-500">Free</Badge>}
                {user.tier === 'personal' && <Badge className="bg-blue-500">Personal</Badge>}
                {user.tier === 'pro' && <Badge className="bg-purple-500">Pro</Badge>}
                {user.tier === 'instant' && <Badge className="bg-amber-500">Instant</Badge>}
                
                {user.isAdmin && (
                  <Badge className="bg-red-500">Admin</Badge>
                )}
                
                {user.emailVerified ? (
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    Unverified
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-medium">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Created:</span>
                <span className="font-medium">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium">
                  {user.discountPercentage > 0 
                    ? `${user.discountPercentage}% (Expires: ${formatDate(user.discountExpiryDate)})` 
                    : 'None'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="flex-1">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="analyses">Analyses</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <BarChart4 className="w-5 h-5 mr-2" />
                    Account Overview
                  </CardTitle>
                  <CardDescription>
                    Summary of user activity and account status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium">Usage Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Chat Analyses:</span>
                            <span className="font-medium">--</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Message Analyses:</span>
                            <span className="font-medium">--</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">De-escalation Requests:</span>
                            <span className="font-medium">--</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Usage:</span>
                            <span className="font-medium">--</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="text-center py-6 text-muted-foreground">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No recent activity data available</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">
                    This information is for administrative purposes only.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="subscription">
              <SubscriptionManager user={user} />
            </TabsContent>
            
            <TabsContent value="analyses">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    Analysis History
                  </CardTitle>
                  <CardDescription>
                    Past analyses performed by this user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysesLoading ? (
                    <div className="py-8 text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading analyses...</p>
                    </div>
                  ) : !analyses || analyses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No analyses found for this user</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analyses.map((analysis) => (
                        <Card key={analysis.id}>
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{analysis.title}</CardTitle>
                              <Badge>
                                {analysis.type === 'chat' && 'Chat Analysis'}
                                {analysis.type === 'message' && 'Message Analysis'}
                                {analysis.type === 'deescalate' && 'De-escalation'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="py-2">
                            <p className="text-sm text-muted-foreground">
                              Created: {formatDate(analysis.createdAt)}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}