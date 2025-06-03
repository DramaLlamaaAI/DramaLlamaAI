import { BrainCircuit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LiveTalk() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-2">Live Talk</CardTitle>
            <CardDescription>Real-time conversation recording and analysis</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="border-2 border-dashed border-orange-300 bg-orange-50 rounded-lg p-8 text-center">
              <BrainCircuit className="mx-auto h-16 w-16 text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold text-orange-800 mb-2">
                Coming Soon
              </h3>
              <p className="text-orange-700 mb-4">
                Live Talk recording and analysis is currently under development and will be available in a future update.
              </p>
              <p className="text-sm text-orange-600">
                This feature will allow you to record live conversations and get real-time analysis. Stay tuned for updates!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}