import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Clock, HelpCircle } from "lucide-react";

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Need help? Have questions? We're here to support you on your communication journey.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Support Email Card */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Email Support</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                Get direct help from our support team. We're here to assist with any questions about Drama Llama AI.
              </p>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-600 mb-2">Send us an email at:</p>
                <a 
                  href="mailto:support@dramallama.ai"
                  className="text-lg font-semibold text-purple-700 hover:text-purple-800 transition-colors"
                >
                  support@dramallama.ai
                </a>
              </div>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => window.location.href = 'mailto:support@dramallama.ai'}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>

          {/* FAQ & Response Time Card */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Support Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Response Time</h3>
                  <p className="text-gray-600 text-sm">We typically respond within 24 hours during business days.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <MessageCircle className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">What to Include</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Detailed description of your issue</li>
                    <li>• Steps you've already tried</li>
                    <li>• Your account email (if applicable)</li>
                    <li>• Screenshots if helpful</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Common Questions</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Account and subscription issues</li>
                  <li>• Technical problems with analysis</li>
                  <li>• Feature requests and feedback</li>
                  <li>• Privacy and data concerns</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">We're Here to Help</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Drama Llama AI is designed to improve your communication skills and relationships. 
                If you're experiencing any issues or have suggestions for improvement, don't hesitate to reach out. 
                Your feedback helps us make the platform better for everyone.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}