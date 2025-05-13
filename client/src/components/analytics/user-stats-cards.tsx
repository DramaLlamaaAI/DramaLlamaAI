import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ArrowUpRight, TrendingUp, Layers } from "lucide-react";

interface UserStatsCardsProps {
  data: {
    totalUsers: number;
    usersByTier: { [tier: string]: number };
    registrationsByDate: { date: string; count: number }[];
    tierConversionRate: { fromTier: string; toTier: string; count: number }[];
  };
  isLoading: boolean;
}

export default function UserStatsCards({ data, isLoading }: UserStatsCardsProps) {
  // Calculate upgrade percentage - example calculation
  const calculateUpgradePercentage = () => {
    if (!data.tierConversionRate || data.tierConversionRate.length === 0) return 0;
    
    // Count upgrades (free to paid tiers)
    const upgrades = data.tierConversionRate.filter(
      item => item.fromTier === "free" && (item.toTier === "personal" || item.toTier === "pro")
    ).reduce((acc, item) => acc + item.count, 0);
    
    // Calculate percentage based on free users
    const freeUsers = data.usersByTier.free || 0;
    if (freeUsers === 0) return 0;
    
    return Math.round((upgrades / freeUsers) * 100);
  };
  
  // Calculate weekly registrations - example calculation
  const calculateWeeklyRegistrations = () => {
    if (!data.registrationsByDate || data.registrationsByDate.length === 0) return 0;
    
    // Sum registrations from the last 7 days
    const lastWeekRegistrations = data.registrationsByDate
      .slice(-7)
      .reduce((acc, item) => acc + item.count, 0);
    
    return lastWeekRegistrations;
  };
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Users Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Users
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <>
              <div className="text-2xl font-bold">{data.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active registered users
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Conversion Rate Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Upgrade Rate
          </CardTitle>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {calculateUpgradePercentage()}%
              </div>
              <p className="text-xs text-muted-foreground">
                Free users who upgraded
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Weekly Signups Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Weekly Signups
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {calculateWeeklyRegistrations()}
              </div>
              <p className="text-xs text-muted-foreground">
                New users in last 7 days
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Pro Users Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Paid Users
          </CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {(data.usersByTier.personal || 0) + (data.usersByTier.pro || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Personal & Pro tier users
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}