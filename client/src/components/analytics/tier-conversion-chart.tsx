import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface TierConversionChartProps {
  data: Array<{
    fromTier: string;
    toTier: string;
    count: number;
  }>;
  isLoading?: boolean;
}

export default function TierConversionChart({ data, isLoading = false }: TierConversionChartProps) {
  // Process data for display
  const chartData = (data || []).map(item => ({
    ...item,
    name: `${getTierDisplayName(item.fromTier)} → ${getTierDisplayName(item.toTier)}`,
  }));

  // Helper function to get tier display name
  function getTierDisplayName(tier: string): string {
    const displayNames: Record<string, string> = {
      'free': 'Free',
      'personal': 'Personal',
      'pro': 'Pro',
      'instant': 'Instant'
    };
    return displayNames[tier] || tier;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tier Conversions</CardTitle>
          <CardDescription>User movements between different subscription tiers</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tier Conversions</CardTitle>
        <CardDescription>User movements between different subscription tiers</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No tier conversion data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                top: 20,
                right: 30,
                left: 100,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" />
              <Tooltip formatter={(value) => [value, 'Conversions']} />
              <Bar dataKey="count" fill="#FF69B4">
                <LabelList dataKey="count" position="right" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}