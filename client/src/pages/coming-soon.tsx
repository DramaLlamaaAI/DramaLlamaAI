import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ArrowLeft, Users, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-16">
      <div className="max-w-2xl mx-auto px-4">
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <Card className="text-center">
          <CardContent className="p-12">
            {/* Icon */}
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-yellow-800" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              WhatsApp Groups
            </h1>
            
            {/* Subtitle */}
            <h2 className="text-xl text-gray-600 mb-6 flex items-center justify-center gap-2">
              <Clock className="h-5 w-5" />
              Coming Soon
            </h2>

            {/* Description */}
            <p className="text-lg text-gray-700 mb-8 max-w-lg mx-auto leading-relaxed">
              We're working on an exciting new feature that will analyze WhatsApp group conversations 
              to help you understand group dynamics, identify communication patterns, and spot potential conflicts.
            </p>

            {/* Features Preview */}
            <div className="grid gap-4 mb-8 text-left max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2"></div>
                <span className="text-gray-700">Group conversation analysis</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <span className="text-gray-700">Multiple participant insights</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-teal-500 rounded-full mt-2"></div>
                <span className="text-gray-700">Group dynamic health scores</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <span className="text-gray-700">Conflict detection and resolution</span>
              </div>
            </div>

            {/* Call to Action */}
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Thank you for your interest in this upcoming feature!
              </p>
              <Link href="/">
                <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white">
                  Back to Home
                </Button>
              </Link>
            </div>

            {/* Timeline */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Expected launch: <span className="font-semibold text-gray-700">Q2 2025</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}