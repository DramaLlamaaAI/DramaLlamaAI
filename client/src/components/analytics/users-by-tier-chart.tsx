import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface UsersByTierChartProps {
  data: { [tier: string]: number };
  isLoading: boolean;
}

// Colors for different tiers
const TIER_COLORS = {
  free: "#94a3b8", // slate-400
  personal: "#3b82f6", // blue-500
  pro: "#a855f7", // purple-500
};

export default function UsersByTierChart({ data, isLoading }: UsersByTierChartProps) {
  // Convert data to format required by Recharts
  const chartData = Object.entries(data).map(([tier, count]) => ({
    name: tier.charAt(0).toUpperCase() + tier.slice(1),
    value: count,
    color: TIER_COLORS[tier as keyof typeof TIER_COLORS] || "#cbd5e1",
  }));
  
  // Calculate percentages for each tier
  const total = Object.values(data).reduce((acc, count) => acc + count, 0);
  const getPercentage = (value: number) => {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  };
  
  // Customize the tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-2 shadow-md">
          <p className="font-medium">{payload[0].name} Tier</p>
          <p className="text-sm">
            {payload[0].value} users ({getPercentage(payload[0].value)})
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Users by Tier</CardTitle>
        <CardDescription>
          Distribution of users across different subscription tiers
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Skeleton className="h-[250px] w-[250px] rounded-full" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}