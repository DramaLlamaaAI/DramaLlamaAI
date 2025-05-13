import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserCheck, UserCog } from "lucide-react";

interface AnalyticsSummary {
  totalUsers: number;
  usersByTier: { [tier: string]: number };
  registrationsByDate: { date: string; count: number }[];
  tierConversionRate: { fromTier: string; toTier: string; count: number }[];
}

interface UserStatsCardsProps {
  data: AnalyticsSummary;
  isLoading?: boolean;
}

export default function UserStatsCards({ data, isLoading = false }: UserStatsCardsProps) {
  // Calculate conversions: from free to paid tiers
  const freeToAnyPaid = data?.tierConversionRate?.filter(
    tc => tc.fromTier === 'free' && ['personal', 'pro', 'instant'].includes(tc.toTier)
  ).reduce((sum, item) => sum + item.count, 0) || 0;

  // Last 7 days registrations
  const last7DaysRegistrations = data?.registrationsByDate?.slice(-7).reduce(
    (sum, item) => sum + item.count, 0
  ) || 0;

  // Get total paid users
  const totalPaidUsers = getTotalPaidUsers(data?.usersByTier || {});

  function getTotalPaidUsers(usersByTier: {[tier: string]: number}): number {
    const paidTiers = ['personal', 'pro', 'instant'];
    return Object.entries(usersByTier)
      .filter(([tier]) => paidTiers.includes(tier))
      .reduce((sum, [_, count]) => sum + count, 0);
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Loading...</CardTitle>
              <div className="h-4 w-4 rounded-full bg-muted"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.totalUsers || 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Users (7 days)</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{last7DaysRegistrations}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPaidUsers}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Free-to-Paid Conversions</CardTitle>
          <UserCog className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{freeToAnyPaid}</div>
        </CardContent>
      </Card>
    </div>
  );
}