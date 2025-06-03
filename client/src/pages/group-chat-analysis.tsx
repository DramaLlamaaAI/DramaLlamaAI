import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BackHomeButton from "@/components/back-home-button";

export default function GroupChatAnalysis() {
  return (
    <div className="container mx-auto px-4 py-8">
      <BackHomeButton />
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-2">WhatsApp Group Chat Analysis</CardTitle>
            <CardDescription>Analyze group conversations and dynamics</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg p-8 text-center">
              <Users className="mx-auto h-16 w-16 text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold text-purple-800 mb-2">
                Coming Soon
              </h3>
              <p className="text-purple-700 mb-4">
                WhatsApp Group Chat analysis is currently under development and will be available in a future update.
              </p>
              <p className="text-sm text-purple-600">
                This feature will allow you to analyze group conversations with multiple participants. Stay tuned for updates!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}