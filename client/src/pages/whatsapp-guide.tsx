import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, MessageCircle, Download, FolderOpen, Upload, CheckCircle } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: "Open WhatsApp",
    description: "Launch WhatsApp on your mobile device",
    icon: MessageCircle,
    content: (
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">Step 1: Open WhatsApp</h3>
          <p className="text-green-700">Open the WhatsApp application on your mobile device.</p>
        </div>
        <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
          <div className="w-full h-48 bg-gradient-to-b from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <MessageCircle className="h-16 w-16 text-white" />
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">WhatsApp App Icon</p>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Select the Chat",
    description: "Navigate to the conversation you want to analyze",
    icon: MessageCircle,
    content: (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Step 2: Select Your Chat</h3>
          <p className="text-blue-700">Find and tap on the conversation you want to analyze.</p>
        </div>
        <div className="space-y-2">
          <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            <div>
              <p className="font-medium">Contact Name</p>
              <p className="text-sm text-gray-500">Last message preview...</p>
            </div>
          </div>
          <div className="bg-green-100 p-3 rounded-lg border-2 border-green-300 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-300 rounded-full"></div>
            <div>
              <p className="font-medium">Chat to Analyze</p>
              <p className="text-sm text-gray-500">Tap this conversation</p>
            </div>
            <ChevronRight className="h-5 w-5 text-green-600 ml-auto" />
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Access Chat Options",
    description: "Tap the three dots menu in the top right corner",
    icon: MessageCircle,
    content: (
      <div className="space-y-4">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-2">Step 3: Open Chat Menu</h3>
          <p className="text-purple-700">In the chat, tap the three dots (⋮) in the top right corner.</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <span className="font-medium">Contact Name</span>
            </div>
            <div className="flex flex-col space-y-1">
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            </div>
          </div>
          <div className="text-center text-sm text-gray-500">Chat interface with menu button highlighted</div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Export Chat",
    description: "Select 'Export chat' from the dropdown menu",
    icon: Download,
    content: (
      <div className="space-y-4">
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h3 className="font-semibold text-orange-800 mb-2">Step 4: Export the Chat</h3>
          <p className="text-orange-700">From the menu, select "Export chat" option.</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2">
          <div className="p-2 hover:bg-gray-50 rounded">View contact</div>
          <div className="p-2 hover:bg-gray-50 rounded">Media, links, and docs</div>
          <div className="p-2 bg-orange-100 border border-orange-300 rounded font-medium text-orange-800">
            📤 Export chat
          </div>
          <div className="p-2 hover:bg-gray-50 rounded">Clear chat</div>
          <div className="p-2 hover:bg-gray-50 rounded text-red-600">Delete chat</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Choose "Without Media" when prompted to keep the file size manageable.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Choose Export Option",
    description: "Select 'Without Media' for optimal file size",
    icon: Download,
    content: (
      <div className="space-y-4">
        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
          <h3 className="font-semibold text-teal-800 mb-2">Step 5: Export Without Media</h3>
          <p className="text-teal-700">Choose "Without Media" to create a text-only export file.</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center space-y-4">
          <h4 className="font-medium">Export chat</h4>
          <p className="text-sm text-gray-600">Choose an option:</p>
          <div className="space-y-3">
            <Button variant="outline" className="w-full">
              📎 With Media
            </Button>
            <Button className="w-full bg-teal-600 hover:bg-teal-700">
              📄 Without Media (Recommended)
            </Button>
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">
            <strong>Recommended:</strong> Select "Without Media" as it creates a .txt file that's perfect for analysis.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Save to Files",
    description: "Choose where to save your exported chat file",
    icon: FolderOpen,
    content: (
      <div className="space-y-4">
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <h3 className="font-semibold text-indigo-800 mb-2">Step 6: Save the File</h3>
          <p className="text-indigo-700">Select "Save to Files" or similar option to save the .txt file to your device.</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <h4 className="font-medium text-center">Share via...</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mx-auto mb-1"></div>
              <span className="text-xs">Email</span>
            </div>
            <div className="text-center p-2 bg-indigo-100 border border-indigo-300 rounded">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg mx-auto mb-1 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium">Files</span>
            </div>
            <div className="text-center p-2">
              <div className="w-12 h-12 bg-green-500 rounded-lg mx-auto mb-1"></div>
              <span className="text-xs">Drive</span>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            The file will typically be saved in your "Downloads" or "My Files" folder.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 7,
    title: "Locate the File",
    description: "Find your exported chat file in My Files or Downloads",
    icon: FolderOpen,
    content: (
      <div className="space-y-4">
        <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
          <h3 className="font-semibold text-pink-800 mb-2">Step 7: Find Your File</h3>
          <p className="text-pink-700">Open "My Files" or "File Manager" and locate your exported chat.</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="h-5 w-5 text-blue-600" />
            <span className="font-medium">My Files / Downloads</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
              <div className="w-8 h-8 bg-gray-300 rounded"></div>
              <span className="text-sm">Other file.pdf</span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-pink-100 border border-pink-300 rounded">
              <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">TXT</span>
              </div>
              <span className="text-sm font-medium">WhatsApp Chat - Contact Name.txt</span>
            </div>
            <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
              <div className="w-8 h-8 bg-gray-300 rounded"></div>
              <span className="text-sm">Another file.jpg</span>
            </div>
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">
            Look for a .txt file with "WhatsApp Chat" in the name - this is your exported conversation.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 8,
    title: "Upload to Drama Llama",
    description: "Upload your .txt file to our chat analysis tool",
    icon: Upload,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-lg border border-pink-200">
          <h3 className="font-semibold text-pink-800 mb-2">Step 8: Upload for Analysis</h3>
          <p className="text-pink-700">Now upload your .txt file to Drama Llama for AI-powered analysis.</p>
        </div>
        <div className="bg-white p-6 rounded-lg border-2 border-dashed border-pink-300">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-pink-400 mb-4" />
            <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
            <p className="text-sm text-gray-500">Supports .txt files (WhatsApp exports)</p>
            <Button className="mt-4 bg-pink-500 hover:bg-pink-600">
              Choose File
            </Button>
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded-full mt-0.5 flex-shrink-0"></div>
            <div className="text-sm text-blue-800">
              <strong>Analysis Note:</strong> Only the most recent 3 months of messages are analyzed for optimal relevance and performance. For analysis of longer conversations, please contact support@dramallama.ai
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 9,
    title: "Analysis Complete",
    description: "View your comprehensive relationship insights",
    icon: CheckCircle,
    content: (
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">Step 9: Get Your Results</h3>
          <p className="text-green-700">Your chat has been analyzed! View detailed insights about your conversation.</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium">Analysis Results Ready</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="font-medium text-blue-800">Health Score</div>
              <div className="text-blue-600">Relationship wellness rating</div>
            </div>
            <div className="bg-purple-50 p-3 rounded border border-purple-200">
              <div className="font-medium text-purple-800">Communication Tone</div>
              <div className="text-purple-600">Emotional analysis</div>
            </div>
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <div className="font-medium text-orange-800">Red Flags</div>
              <div className="text-orange-600">Warning indicators</div>
            </div>
            <div className="bg-teal-50 p-3 rounded border border-teal-200">
              <div className="font-medium text-teal-800">Participant Analysis</div>
              <div className="text-teal-600">Individual insights</div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-lg border border-pink-200 text-center">
          <p className="text-pink-800 font-medium">
            🎉 Congratulations! You've successfully analyzed your WhatsApp conversation.
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