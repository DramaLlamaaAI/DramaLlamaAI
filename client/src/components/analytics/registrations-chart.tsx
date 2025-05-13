import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface RegistrationsChartProps {
  data: { date: string; count: number }[];
  isLoading: boolean;
}

export default function RegistrationsChart({ data, isLoading }: RegistrationsChartProps) {
  // Process data for chart
  const processedData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count
  }));
  
  // Get max value for YAxis domain
  const maxCount = Math.max(...data.map(item => item.count), 10);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-2 shadow-md">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-primary">
            {payload[0].value} new users
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>New Registrations</CardTitle>
        <CardDescription>
          Daily user registration activity
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
          <div className="h-full w-full flex flex-col gap-3">
            <Skeleton className="h-[250px] w-full" />
          </div>
        ) : processedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No registration data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={processedData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C9C9" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22C9C9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                domain={[0, maxCount + Math.ceil(maxCount * 0.1)]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#22C9C9" 
                fillOpacity={1} 
                fill="url(#colorCount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}