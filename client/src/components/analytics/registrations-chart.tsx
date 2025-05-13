import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RegistrationsChartProps {
  data: Array<{
    date: string;
    count: number;
  }>;
  isLoading?: boolean;
}

export default function RegistrationsChart({ data, isLoading = false }: RegistrationsChartProps) {
  // Format dates for display
  const formattedData = (data || []).map(item => ({
    ...item,
    formattedDate: formatDate(item.date)
  }));

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Registrations</CardTitle>
          <CardDescription>New user registrations over the last 30 days</CardDescription>
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
        <CardTitle>User Registrations</CardTitle>
        <CardDescription>New user registrations over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No registration data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={formattedData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="formattedDate" />
              <YAxis />
              <Tooltip formatter={(value) => [value, 'Registrations']} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#22C9C9"
                fill="#22C9C9"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}