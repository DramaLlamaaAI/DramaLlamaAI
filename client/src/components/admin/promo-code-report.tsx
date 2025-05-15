import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

interface PromoCodeUsage {
  code: string;
  usageCount: number;
  conversionRate: number;
  discountAmount: number;
}

export function PromoCodeReport() {
  const [promoUsageData, setPromoUsageData] = useState<PromoCodeUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPromoCodeUsage = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest("GET", "/api/admin/promo-codes/report");
        const data = await response.json();
        setPromoUsageData(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load promo code usage data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromoCodeUsage();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (promoUsageData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Promo Code Usage</CardTitle>
          <CardDescription>Analytics for promotional code performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No promo code usage data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort data by usage count for display
  const sortedData = [...promoUsageData].sort((a, b) => b.usageCount - a.usageCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Promo Code Usage</CardTitle>
        <CardDescription>Analytics for promotional code performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-medium mb-2">Usage by Code</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedData}>
                  <XAxis dataKey="code" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="usageCount" fill="#22C9C9" name="Usage Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Top Performing Codes</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Code</th>
                    <th className="text-left py-2 px-4">Usage</th>
                    <th className="text-left py-2 px-4">Conversion Rate</th>
                    <th className="text-left py-2 px-4">Total Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.slice(0, 5).map((item) => (
                    <tr key={item.code} className="border-b">
                      <td className="py-2 px-4 font-medium">{item.code}</td>
                      <td className="py-2 px-4">{item.usageCount}</td>
                      <td className="py-2 px-4">{(item.conversionRate * 100).toFixed(1)}%</td>
                      <td className="py-2 px-4">£{item.discountAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}