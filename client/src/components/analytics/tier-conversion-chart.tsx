import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";

interface TierConversionChartProps {
  data: { fromTier: string; toTier: string; count: number }[];
  isLoading: boolean;
}

export default function TierConversionChart({ data, isLoading }: TierConversionChartProps) {
  // Process data for chart - group by fromTier and aggregate counts for each toTier
  const processData = () => {
    // Create a map to store the data
    const dataMap = new Map<string, { name: string; [key: string]: string | number }>();
    
    // Process each data point
    data.forEach(item => {
      const fromTier = item.fromTier.charAt(0).toUpperCase() + item.fromTier.slice(1);
      const toTier = item.toTier.charAt(0).toUpperCase() + item.toTier.slice(1);
      
      // If this fromTier doesn't exist in the map yet, add it
      if (!dataMap.has(fromTier)) {
        dataMap.set(fromTier, { name: fromTier });
      }
      
      // Add or update the count for this toTier
      const entry = dataMap.get(fromTier)!;
      entry[toTier] = (entry[toTier] as number || 0) + item.count;
    });
    
    // Convert the map to an array
    return Array.from(dataMap.values());
  };
  
  const chartData = processData();
  
  // Define colors for bars
  const barColors = {
    Free: "#94a3b8", // slate-400
    Personal: "#3b82f6", // blue-500
    Pro: "#a855f7", // purple-500
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-2 shadow-md">
          <p className="font-medium">{label} → {payload[0].name}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            {payload[0].value} conversions
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Get all unique toTiers
  const toTiers = new Set<string>();
  data.forEach(item => {
    toTiers.add(item.toTier.charAt(0).toUpperCase() + item.toTier.slice(1));
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tier Conversions</CardTitle>
        <CardDescription>
          Number of users who upgraded or changed subscription tiers
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
          <div className="h-full w-full flex flex-col gap-3">
            <Skeleton className="h-[250px] w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No conversion data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
              
              {/* Generate a bar for each toTier */}
              {Array.from(toTiers).map(tier => (
                <Bar 
                  key={tier} 
                  dataKey={tier} 
                  stackId="a" 
                  name={tier} 
                  fill={barColors[tier as keyof typeof barColors] || "#cbd5e1"} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}