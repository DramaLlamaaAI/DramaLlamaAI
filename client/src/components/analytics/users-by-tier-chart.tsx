import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from "recharts";

interface UsersByTierChartProps {
  data: {
    [tier: string]: number;
  };
  isLoading?: boolean;
}

export default function UsersByTierChart({ data, isLoading = false }: UsersByTierChartProps) {
  // Transform data for the chart
  const chartData = Object.entries(data || {}).map(([tier, count]) => ({
    name: getTierDisplayName(tier),
    value: count,
    tier
  }));

  // Custom colors for different tiers
  const COLORS = {
    'free': '#22C9C9', // turquoise
    'personal': '#FF69B4', // pink
    'pro': '#9370DB', // purple
    'instant': '#FFD700', // gold
  };

  // Default colors for any other tiers
  const DEFAULT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users by Tier</CardTitle>
          <CardDescription>Distribution of users across different tiers</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  // Helper function to get tier display name
  function getTierDisplayName(tier: string): string {
    const displayNames: Record<string, string> = {
      'free': 'Free',
      'personal': 'Personal',
      'pro': 'Pro',
      'instant': 'Instant Deep Dive'
    };
    return displayNames[tier] || tier;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users by Tier</CardTitle>
        <CardDescription>Distribution of users across different tiers</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No tier data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => 
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.tier as keyof typeof COLORS] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value} users`, 'Count']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}