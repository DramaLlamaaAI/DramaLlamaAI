import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, MessageCircle, Download, FolderOpen, Upload, CheckCircle } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: "Open WhatsApp & Select Chat",
    description: "Launch WhatsApp and choose the conversation to analyze",
    icon: MessageCircle,
    content: (
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">Step 1: Open WhatsApp & Select Chat</h3>
          <p className="text-green-700">Open WhatsApp on your mobile device and navigate to the conversation you want to analyze.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="w-full h-32 bg-gradient-to-b from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-2">
              <MessageCircle className="h-12 w-12 text-white" />
            </div>
            <p className="text-sm text-gray-600">Open WhatsApp</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="bg-green-100 p-3 rounded-lg border border-green-300 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-300 rounded-full"></div>
              <div className="flex-1">
                <p className="font-medium text-sm">Chat to Analyze</p>
                <p className="text-xs text-gray-500">Tap this conversation</p>
              </div>
              <ChevronRight className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">Select your chat</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Export Chat Without Media",
    description: "Click the 3 dots menu and select 'Export > Without Media'",
    icon: Download,
    content: (
      <div className="space-y-4">
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h3 className="font-semibold text-orange-800 mb-2">Step 2: Export Chat Without Media</h3>
          <p className="text-orange-700">In the chat, tap the three dots (⋮) in the top right corner, then select "Export chat" {'>'}  "Without Media".</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                <span className="text-sm font-medium">Contact Name</span>
              </div>
              <div className="flex flex-col space-y-0.5 p-1 border border-gray-400 rounded">
                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="p-1 hover:bg-gray-50 rounded">View contact</div>
              <div className="p-1 bg-orange-100 border border-orange-300 rounded font-medium text-orange-800">
                📤 Export chat
              </div>
              <div className="p-1 hover:bg-gray-50 rounded">Clear chat</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <h4 className="text-sm font-medium mb-3">Export chat</h4>
            <div className="space-y-2">
              <Button variant="outline" className="w-full text-xs py-1">
                📎 With Media
              </Button>
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-xs py-1">
                📄 Without Media
              </Button>
            </div>
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">
            <strong>Important:</strong> Always choose "Without Media" to create a .txt file perfect for analysis.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Save to Device",
    description: "Choose where to save the chat on your device",
    icon: FolderOpen,
    content: (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Step 3: Save to Device</h3>
          <p className="text-blue-700">Select "Save to Files" or similar option to save the .txt file to your device's storage.</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-center mb-3">Share via...</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg mx-auto mb-1"></div>
              <span className="text-xs">Email</span>
            </div>
            <div className="text-center p-2 bg-blue-100 border-2 border-blue-300 rounded">
              <div className="w-10 h-10 bg-blue-500 rounded-lg mx-auto mb-1 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium">Files</span>
            </div>
            <div className="text-center p-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg mx-auto mb-1"></div>
              <span className="text-xs">Drive</span>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            The file will be saved in your "Downloads" or "My Files" folder with a name like "WhatsApp Chat - Contact Name.txt"
          </p>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Open Drama Llama",
    description: "Navigate to DramaLlama.ai and select 'Chat Analysis > Import Chat'",
    icon: Upload,
    content: (
      <div className="space-y-4">
        <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
          <h3 className="font-semibold text-pink-800 mb-2">Step 4: Open Drama Llama</h3>
          <p className="text-pink-700">Open your web browser, go to DramaLlama.ai, then navigate to Chat Analysis and click "Import Chat".</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="w-full h-24 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mb-2">
              <span className="text-white font-bold text-sm">Drama Llama AI</span>
            </div>
            <p className="text-xs text-gray-600">Visit DramaLlama.ai</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="bg-pink-100 border border-pink-300 rounded p-3 mb-2">
              <span className="font-medium text-pink-800 text-sm">📱 Chat Analysis</span>
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded p-2">
              <span className="text-pink-700 text-xs">Upload File Tab</span>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            The Chat Analysis page will have an upload area where you can import your WhatsApp export file.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Find & Upload File",
    description: "Locate the .txt file in your folders and upload it for analysis",
    icon: CheckCircle,
    content: (
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">Step 5: Find & Upload File</h3>
          <p className="text-green-700">Click "Choose File", browse to your Downloads or My Files folder, and select your WhatsApp export file.</p>
        </div>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-sm">My Files / Downloads</span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-green-100 border border-green-300 rounded">
              <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">TXT</span>
              </div>
              <span className="text-sm font-medium">WhatsApp Chat - Contact Name.txt</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border-2 border-dashed border-green-300">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-green-400 mb-4" />
              <p className="text-gray-600 mb-2">Click "Choose File" and select your .txt file</p>
              <Button className="mt-4 bg-green-500 hover:bg-green-600">
                Choose File
              </Button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">Ready for Analysis!</span>
          </div>
          <p className="text-sm text-gray-700">
            Once uploaded, your chat will be analyzed for relationship insights, communication patterns, and wellness indicators.
          </p>
        </div>
      </div>
    )
  }
];

export default function WhatsAppGuide() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const currentStepData = steps.find(step => step.id === currentStep)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent mb-4">
            WhatsApp Export Guide
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Follow this step-by-step guide to export your WhatsApp conversation and upload it to Drama Llama for AI-powered relationship analysis.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {steps.map((step) => {
                  const Icon = step.icon;
                  const isCompleted = completedSteps.includes(step.id);
                  const isCurrent = currentStep === step.id;
                  
                  return (
                    <div
                      key={step.id}
                      onClick={() => handleStepClick(step.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-pink-100 border-2 border-pink-300 text-pink-800'
                          : isCompleted
                          ? 'bg-green-100 border border-green-300 text-green-800'
                          : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`p-1 rounded ${
                        isCurrent
                          ? 'bg-pink-200'
                          : isCompleted
                          ? 'bg-green-200'
                          : 'bg-gray-200'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Icon className={`h-4 w-4 ${
                            isCurrent ? 'text-pink-600' : 'text-gray-500'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          Step {step.id}
                        </div>
                        <div className="text-xs opacity-75 truncate">
                          {step.title}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <currentStepData.icon className="h-8 w-8 text-pink-600" />
                      {currentStepData.title}
                    </CardTitle>
                    <p className="text-gray-600 mt-2">{currentStepData.description}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentStep} of {steps.length}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {currentStepData.content}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-8 rounded-full transition-all ${
                      index + 1 <= currentStep
                        ? 'bg-pink-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                disabled={currentStep === steps.length}
                className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600"
              >
                {currentStep === steps.length ? 'Complete' : 'Next'}
                {currentStep !== steps.length && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}