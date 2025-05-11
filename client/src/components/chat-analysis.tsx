import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Archive, FileText, AlertCircle, Calendar, Download } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, processImageOcr, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64, validateConversation, getParticipantColor } from "@/lib/utils";
import { getUserUsage } from "@/lib/openai";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cleanPatternForDisplay, cleanCommunicationPatterns } from "@/lib/analysis-utils";
import { CommunicationStyles } from "@/components/communication-styles";
import { RedFlags } from "@/components/red-flags";
import { AccountabilityMeters } from "@/components/accountability-meters";
import { BehavioralPatterns } from "@/components/behavioral-patterns-filtered";
import { EmotionTracking } from "@/components/emotion-tracking";
import { PersonalizedSuggestions } from "@/components/personalized-suggestions";
import { TensionContributions } from "@/components/tension-contributions";
import { HealthScoreDisplay } from "@/components/health-score-display";
import { AdvancedTrendLines } from "@/components/advanced-trend-lines";
import { EvasionPowerDynamics } from "@/components/evasion-power-dynamics";
import { EmotionalShiftsTimeline } from "@/components/emotional-shifts-timeline";
import { SelfReflection } from "@/components/self-reflection";
import html2pdf from 'html2pdf.js';
import { toJpeg } from 'html-to-image';
import { FreeTierAnalysis } from "@/components/free-tier-analysis";

export default function ChatAnalysis() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileIsZip, setFileIsZip] = useState(false);
  const [result, setResult] = useState<ChatAnalysisResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enableDateFilter, setEnableDateFilter] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const tier = usage?.tier || 'free';
  const usedAnalyses = usage?.used || 0;
  const limit = usage?.limit || 1;
  const canUseFeature = usedAnalyses < limit;

  const analysisMutation = useMutation({
    mutationFn: analyzeChatConversation,
    onSuccess: (data) => {
      setErrorMessage(null);
      setResult(data);
      setShowResults(true);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Could not analyze conversation");
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze conversation",
        variant: "destructive",
      });
    },
  });

  const detectNamesMutation = useMutation({
    mutationFn: detectParticipants,
    onSuccess: (data) => {
      setMe(data.me);
      setThem(data.them);
      toast({
        title: "Names Detected",
        description: `Found participants: ${data.me} and ${data.them}`,
      });
    },
    onError: () => {
      toast({
        title: "Detection Failed",
        description: "Could not detect names automatically",
        variant: "destructive",
      });
    },
  });
  
  // Export as formal branded document with text copying
  const exportToPdf = async () => {
    if (!result) {
      toast({
        title: "Export Failed",
        description: "Could not create document. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Create a temporary container for the formal document
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);
      
      // Render our formal document component to string
      const formalDocumentContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Drama Llama Analysis</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 0;
              background: white;
            }
            
            .drama-llama-document {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background-color: white;
              color: #333;
            }
            
            .document-header {
              display: flex;
              align-items: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #22C9C9;
            }
            
            .logo-container {
              width: 80px;
              margin-right: 20px;
            }
            
            .logo-container img {
              width: 100%;
              height: auto;
            }
            
            .header-text {
              flex: 1;
            }
            
            .header-text h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              color: #22C9C9;
            }
            
            .header-text p {
              margin: 5px 0 0;
              font-size: 16px;
              color: #666;
            }
            
            .document-title {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 20px;
              color: #333;
            }
            
            .document-section {
              margin-bottom: 25px;
            }
            
            .section-title {
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 15px;
              color: #22C9C9;
            }
            
            .section-content {
              font-size: 16px;
              line-height: 1.6;
            }
            
            .emotion-item {
              display: flex;
              align-items: center;
              margin-bottom: 10px;
            }
            
            .emotion-label {
              min-width: 120px;
              font-weight: 500;
            }
            
            .emotion-bar-container {
              flex: 1;
              height: 12px;
              background-color: #eee;
              border-radius: 6px;
              overflow: hidden;
            }
            
            .emotion-bar {
              height: 100%;
              background-color: #22C9C9;
            }
            
            .health-score {
              display: flex;
              align-items: center;
              margin: 15px 0;
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 8px;
            }
            
            .health-score-label {
              font-weight: 600;
              margin-right: 15px;
            }
            
            .health-score-value {
              font-size: 18px;
              font-weight: 700;
            }
            
            .health-score-red {
              color: #e53e3e;
            }
            
            .health-score-yellow {
              color: #d69e2e;
            }
            
            .health-score-light-green {
              color: #38a169;
            }
            
            .health-score-green {
              color: #2f855a;
            }
            
            .red-flags-count {
              font-weight: 600;
              color: #e53e3e;
            }
            
            .pattern-list {
              margin: 0;
              padding-left: 20px;
            }
            
            .pattern-item {
              margin-bottom: 8px;
            }
            
            .document-footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 14px;
              color: #666;
              text-align: center;
            }
            
            .participants {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            
            .participant {
              flex: 1;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
            }
            
            .participant-me {
              background-color: rgba(34, 201, 201, 0.1);
              margin-right: 10px;
            }
            
            .participant-them {
              background-color: rgba(255, 105, 180, 0.1);
              margin-left: 10px;
            }
            
            .participant-name {
              font-weight: 600;
              font-size: 18px;
              margin-bottom: 5px;
            }
            
            .participant-tone {
              color: #666;
            }
            
            /* Mobile styles */
            @media (max-width: 640px) {
              .document-header {
                flex-direction: column;
                text-align: center;
              }
              
              .logo-container {
                margin: 0 auto 15px;
              }
              
              .participants {
                flex-direction: column;
              }
              
              .participant-me, .participant-them {
                margin: 0 0 10px 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="drama-llama-document">
            <div class="document-header">
              <div class="logo-container">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDI1IiBoZWlnaHQ9IjQyNSIgdmlld0JveD0iMCAwIDQyNSA0MjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0yNDguNSA0MDAuNUMyMjEuNTAzIDQwMC41IDEzNyA0MDAuNSA5MCA0MDAuNUM0MyA0MDAuNSA0MyAzNDIgNDMgMzAwQzQzIDI1OCA0MyAyMTYgNDMgMTgwQzQzIDE0NCA0MyAxMDggOTAgMTAwQzEzNyA5MiAyMTAuNzU2IDk2LjI2NTEgMjQ4LjUgMTE0LjVDMjg2LjI0NCAxMzIuNzM1IDM1MS45MDIgMTkyLjYyOSAzODIgMjIwQzQxMi4wOTggMjQ3LjM3MSAzODIgMzAwIDM1MSAzMjBDMzIwIDM0MCAyNzUuNDk3IDQwMC41IDI0OC41IDQwMC41WiIgZmlsbD0iIzIyQzlDOSIvPgo8cGF0aCBkPSJNMjc0IDI0MFYyNzNMMTk3IDI0MGwtMS41IC0zM0wyNzQgMjQwWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTEyNyAyNzAuNVYzMDBMMTk3IDI3M2wtMiAtMzNMMTI3IDI3MC41WiIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iMTk3LjUiIGN5PSIxOTAuNSIgcj0iNzYuNSIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTIyMiAyMjRDMjIyIDIxNSAyMTkgMjAxLjUgMjExLjUgMTk1QzIwNiAxOTAuMiAyMDEuMzMzIDE4OS4zMzMgMTk5LjUgMTg5LjVMMTk4IDIxN0wxODEuNSAyMTdMMTgwIDIxNC41TDE4MC41IDE4OS41QzE3NyAxOTAuMzMzIDE3MCAxOTQgMTcwIDIwMkMxNzAgMjEwIDE2NyAyMjMuNSAxNzIuNSAyMzBDMTc4IDIzNi41IDE5MS41IDI0MCAxOTggMjM5LjVDMjA0LjUgMjM5IDIxOSAyMzUuNSAyMjIgMjI0WiIgZmlsbD0iIzIyQzlDOSIvPgo8Y2lyY2xlIGN4PSIxOTAuNSIgY3k9IjE3NiIgcj0iMTUuNSIgZmlsbD0iYmxhY2siLz4KPGNpcmNsZSBjeD0iMTkwLjUiIGN5PSIxNzMiIHI9IjQuNSIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==" alt="Drama Llama Logo" />
              </div>
              <div class="header-text">
                <h1>Drama Llama AI</h1>
                <p>Conversation Analysis Report</p>
                <p>Generated on: ${new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>
              </div>
            </div>
            
            <div class="document-title">
              Chat Analysis Results
            </div>
            
            <div class="participants">
              <div class="participant participant-me">
                <div class="participant-name">${me}</div>
                ${result.toneAnalysis.participantTones ? 
                  `<div class="participant-tone">${result.toneAnalysis.participantTones[me] || ''}</div>` : 
                  ''}
              </div>
              <div class="participant participant-them">
                <div class="participant-name">${them}</div>
                ${result.toneAnalysis.participantTones ? 
                  `<div class="participant-tone">${result.toneAnalysis.participantTones[them] || ''}</div>` : 
                  ''}
              </div>
            </div>
            
            <div class="document-section">
              <div class="section-title">Overall Tone</div>
              <div class="section-content">
                ${result.toneAnalysis.overallTone}
              </div>
            </div>
            
            ${result.healthScore ? `
            <div class="document-section">
              <div class="section-title">Conversation Health</div>
              <div class="health-score">
                <div class="health-score-label">Health Score:</div>
                <div class="health-score-value health-score-${result.healthScore.color}">
                  ${result.healthScore.label} (${result.healthScore.score}/10)
                </div>
              </div>
            </div>
            ` : ''}
            
            ${result.toneAnalysis.emotionalState && result.toneAnalysis.emotionalState.length > 0 ? `
            <div class="document-section">
              <div class="section-title">Emotional States</div>
              <div class="section-content">
                ${result.toneAnalysis.emotionalState.map((emotion: any) => `
                <div class="emotion-item">
                  <div class="emotion-label">${emotion.emotion}</div>
                  <div class="emotion-bar-container">
                    <div 
                      class="emotion-bar" 
                      style="width: ${emotion.intensity * 100}%"
                    ></div>
                  </div>
                </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
            
            ${result.redFlagsCount !== undefined ? `
            <div class="document-section">
              <div class="section-title">Red Flags</div>
              <div class="section-content">
                <p>
                  <span class="red-flags-count">
                    ${result.redFlagsCount} potential red flag${result.redFlagsCount !== 1 ? 's' : ''}
                  </span> ${result.redFlagsCount === 0 ? 'were' : 'was'} identified in this conversation.
                  ${result.redFlagsCount > 0 ? ' Upgrade to see detailed analysis of each red flag.' : ''}
                </p>
              </div>
            </div>
            ` : ''}
            
            ${result.communication && result.communication.patterns ? `
            <div class="document-section">
              <div class="section-title">Communication Patterns</div>
              <div class="section-content">
                <ul class="pattern-list">
                  ${result.communication.patterns.map((pattern: string) => `
                  <li class="pattern-item">${pattern}</li>
                  `).join('')}
                </ul>
              </div>
            </div>
            ` : ''}
            
            ${result.tensionMeaning ? `
            <div class="document-section">
              <div class="section-title">What This Means</div>
              <div class="section-content">
                ${result.tensionMeaning}
              </div>
            </div>
            ` : ''}
            
            ${result.tensionContributions ? `
            <div class="document-section">
              <div class="section-title">Individual Contributions to Tension</div>
              <div class="section-content">
                ${Object.entries(result.tensionContributions).map(([participant, contributions]) => `
                <div style="margin-bottom: 15px">
                  <div style="font-weight: 600; margin-bottom: 5px">${participant}:</div>
                  <ul class="pattern-list">
                    ${(contributions as string[]).map((item: string) => `
                    <li class="pattern-item">${item}</li>
                    `).join('')}
                  </ul>
                </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
            
            <div class="document-footer">
              <p>This analysis was generated by Drama Llama AI.</p>
              <p>Results should be interpreted as general guidance only.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Show the formal document in a modal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex flex-col z-50 p-0 md:p-4';
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg w-full h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
          <div class="p-3 flex justify-between items-center bg-primary text-white">
            <h3 class="text-lg font-bold">Drama Llama Analysis</h3>
            <div class="flex items-center">
              <button id="copy-document" class="px-3 py-1 bg-white/20 text-sm rounded mr-2">
                Copy Document
              </button>
              <button id="close-document-preview" class="px-3 py-1 bg-white/20 text-sm rounded">
                Close
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-auto p-0 bg-white" id="document-preview-container"></div>
        </div>
      `;
      
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
      
      // Set the document preview
      const previewContainer = document.getElementById('document-preview-container');
      if (previewContainer) {
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        previewContainer.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(formalDocumentContent);
          iframeDoc.close();
        }
      }
      
      // Add copy handler
      document.getElementById('copy-document')?.addEventListener('click', () => {
        try {
          // Create temporary textarea for reliable copying
          const textarea = document.createElement('textarea');
          textarea.value = formalDocumentContent;
          textarea.style.position = 'fixed';  // Make the textarea out of viewport
          document.body.appendChild(textarea);
          textarea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);
          
          if (successful) {
            toast({
              title: "Copied to Clipboard",
              description: "Document HTML copied! You can paste it in a text editor and save as .html",
              duration: 3000,
            });
          } else {
            throw new Error("Copy command failed");
          }
        } catch (err) {
          console.error("Old-style clipboard copy failed:", err);
          
          // Try modern clipboard API as fallback
          navigator.clipboard.writeText(formalDocumentContent)
            .then(() => {
              toast({
                title: "Copied to Clipboard",
                description: "Document HTML copied! You can paste it in a text editor and save as .html",
                duration: 3000,
              });
            })
            .catch(clipboardErr => {
              console.error("Modern clipboard API also failed:", clipboardErr);
              toast({
                title: "Copy Failed",
                description: "Please try again or take screenshots instead.",
                variant: "destructive",
              });
            });
        }
      });
      
      // Add close handler
      document.getElementById('close-document-preview')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = ''; // Restore scrolling
      });
      
      // Remove the temporary container
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error("Document export failed:", error);
      toast({
        title: "Export Failed",
        description: "Please try taking screenshots instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Extremely simplified screenshot feature for mobile compatibility
  const exportAsImage = async () => {
    if (!resultsRef.current || !result) {
      toast({
        title: "Screenshot Failed",
        description: "Could not create image. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      toast({
        title: "Creating Image",
        description: "Please wait...",
        duration: 3000,
      });
      
      try {
        // Generate image with minimal settings for better mobile compatibility
        const element = resultsRef.current;
        const dataUrl = await toJpeg(element, { 
          cacheBust: true,
          quality: 0.8,
          backgroundColor: 'white',
          canvasWidth: 1000,
          pixelRatio: 1
        });
        
        // Skip trying to download directly, just show the image for saving
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/95 flex flex-col z-50';
        
        modal.innerHTML = `
          <div class="p-3 flex justify-between items-center bg-gray-900 text-white">
            <h3 class="text-sm font-bold">Long-press on image to save</h3>
            <button id="close-fullscreen-image" class="px-3 py-1 bg-gray-700 text-sm rounded">
              Close
            </button>
          </div>
          <div class="flex-1 overflow-auto flex items-center justify-center">
            <img src="${dataUrl}" alt="Analysis Result" class="max-w-full" />
          </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
        
        // Add close handler
        document.getElementById('close-fullscreen-image')?.addEventListener('click', () => {
          document.body.removeChild(modal);
          document.body.style.overflow = ''; // Restore scrolling
        });
        
        toast({
          title: "Screenshot Ready",
          description: "Long-press on the image to save it to your phone",
          duration: 5000,
        });
        
      } catch (error) {
        console.error("Screenshot generation failed:", error);
        toast({
          title: "Screenshot Failed",
          description: "Please try taking a manual screenshot instead.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Image export error:", error);
      toast({
        title: "Screenshot Failed",
        description: "Please try taking a manual screenshot instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setFileName(file.name);
      
      // First check if it's a text file
      if (file.type === "text/plain" || file.name.endsWith('.txt')) {
        setFileIsZip(false);
        const text = await file.text();
        setConversation(text);
        toast({
          title: "Text File Imported",
          description: `Successfully imported ${file.name}`,
        });
        return;
      }
      
      // Otherwise treat as ZIP
      setFileIsZip(true);
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/extract-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: base64 }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract chat from ZIP');
      }
      
      const data = await response.json();
      setConversation(data.text);
      
      toast({
        title: "ZIP File Imported",
        description: `Successfully extracted WhatsApp chat from ${file.name}`,
      });
    } catch (err: any) {
      console.error("File upload error:", err);
      toast({
        title: "Import Failed",
        description: err.message || "Could not process file",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = () => {
    if (!conversation.trim()) {
      setErrorMessage("Please enter a conversation to analyze");
      return;
    }
    
    if (!me.trim() || !them.trim()) {
      if (conversation.trim()) {
        detectNamesMutation.mutate(conversation);
      } else {
        setErrorMessage("Please enter names of both participants");
      }
      return;
    }
    
    // Create request with date filtering if enabled
    const request = { 
      conversation, 
      me, 
      them, 
      tier,
      // Include date filtering options if enabled
      dateFilter: enableDateFilter ? {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      } : undefined
    };
    
    analysisMutation.mutate(request);
  };

  const handleDetectNames = () => {
    if (!conversation.trim()) {
      setErrorMessage("Please enter a conversation first");
      return;
    }
    
    detectNamesMutation.mutate(conversation);
  };
  
  // Function to switch the detected names if they're incorrect
  const handleSwitchRoles = () => {
    const tempMe = me;
    setMe(them);
    setThem(tempMe);
    
    toast({
      title: "Names Switched",
      description: `Switched names: You are now ${them}, they are ${tempMe}`,
    });
  };

  return (
    <section className="container py-10">
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Chat Analysis</h2>
            <p className="text-muted-foreground">
              Upload or paste a conversation to analyze the emotional dynamics and communication patterns.
            </p>
            
            {/* Usage Meter */}
            <div className="mt-4 bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Analysis Usage</span>
                <span className="text-sm">{usedAnalyses} of {limit} used</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full mb-1 overflow-hidden">
                <div 
                  style={{width: `${Math.min(100, (usedAnalyses / limit) * 100)}%`}}
                  className={`h-full ${usedAnalyses >= limit ? 'bg-red-500' : 'bg-primary'}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {canUseFeature 
                  ? `You have ${limit - usedAnalyses} analysis${limit - usedAnalyses === 1 ? '' : 'es'} remaining${tier === 'free' ? ' on your free plan' : ''}.` 
                  : "You've reached your limit. Upgrade for more analyses."}
              </p>
            </div>
          </div>
          
          {!showResults ? (
            <>
              {/* Error Message Display */}
              {errorMessage && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}
              
              <Tabs value={tabValue} onValueChange={setTabValue} className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>
                <TabsContent value="paste" className="mt-4">
                  <Textarea 
                    placeholder="Paste your WhatsApp or other chat here..."
                    value={conversation}
                    onChange={(e) => setConversation(e.target.value)}
                    className="min-h-[200px]"
                  />
                </TabsContent>
                <TabsContent value="upload" className="mt-4">
                  <div className="grid grid-cols-1 gap-6">
                    {/* WhatsApp Export UI with blue styling */}
                    <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
                      <p className="text-xs text-blue-800 font-medium">✨ New Feature:</p>
                      <p className="text-xs text-blue-700">You can now directly upload WhatsApp chat export files (.txt) without needing to use ZIP files!</p>
                    </div>
                    <div className="border border-blue-200 border-dashed rounded-lg p-6 text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream,text/plain,.txt"
                        className="hidden"
                      />
                      
                      <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Archive className="h-8 w-8 text-blue-500" />
                      </div>
                      
                      <h3 className="text-xl font-medium text-blue-800 mb-2">WhatsApp Chat Exports</h3>
                      <p className="text-sm text-blue-600 mb-6 max-w-md mx-auto">
                        Upload a WhatsApp chat export (.txt file or .zip archive). On WhatsApp, tap ⋮ on a chat, "More" → "Export chat" → "Without media"
                      </p>
                      
                      <Button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        Choose File
                      </Button>
                      
                      {fileName && (
                        <div className="mt-4 bg-blue-50 p-3 rounded">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-blue-500 mr-2" />
                            <span className="text-sm text-blue-800">{fileName}</span>
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            {fileIsZip 
                              ? "ZIP file detected: we will extract the chat automatically."
                              : "Text file detected: directly using the file content."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Your Name</label>
                  <div className="flex space-x-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Your name in the chat"
                      value={me}
                      onChange={(e) => setMe(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Other Person's Name</label>
                  <div className="flex space-x-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Other person's name"
                      value={them}
                      onChange={(e) => setThem(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <Button
                  variant="outline"
                  onClick={handleDetectNames}
                  disabled={!conversation.trim() || detectNamesMutation.isPending}
                >
                  {detectNamesMutation.isPending ? "Detecting..." : "Auto-Detect Names"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleSwitchRoles}
                  disabled={!me || !them}
                >
                  Switch Names
                </Button>
              </div>
              
              {/* Date Filtering Section */}
              <div className="mb-6 border border-blue-100 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="date-filter"
                      checked={enableDateFilter}
                      onCheckedChange={setEnableDateFilter}
                    />
                    <Label htmlFor="date-filter" className="text-blue-800 font-medium">
                      Focus on Recent Messages
                    </Label>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs text-blue-700 bg-blue-100 py-1 px-2 rounded-full">✨ New</span>
                  </div>
                </div>
                
                {enableDateFilter && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="from-date" className="block text-sm mb-2 text-blue-800">
                        From Date (Include messages after this date)
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="from-date"
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!startDate ? "text-muted-foreground" : ""}`}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Select start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {startDate && (
                        <Button 
                          variant="ghost" 
                          onClick={() => setStartDate(undefined)}
                          className="mt-1 h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear date
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="to-date" className="block text-sm mb-2 text-blue-800">
                        To Date (Optional - limit to messages before this date)
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="to-date"
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!endDate ? "text-muted-foreground" : ""}`}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            disabled={(date) => startDate ? date < startDate : false}
                          />
                        </PopoverContent>
                      </Popover>
                      {endDate && (
                        <Button 
                          variant="ghost" 
                          onClick={() => setEndDate(undefined)}
                          className="mt-1 h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear date
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {enableDateFilter && (
                  <div className="mt-3 text-sm text-blue-800">
                    <p>The AI will focus on analyzing messages {startDate ? `from ${format(startDate, "PPP")}` : ""} 
                    {endDate ? ` through ${format(endDate, "PPP")}` : startDate ? " to the present" : ""}.
                    This helps focus on recent and relevant conversations, especially in long chat histories.</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={!canUseFeature || !conversation.trim() || analysisMutation.isPending}
                >
                  {analysisMutation.isPending ? "Analyzing..." : "Analyze Chat"}
                </Button>
              </div>
              
              {!canUseFeature && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {tier === 'free' 
                      ? "You have reached your free tier limit of 1 chat analysis per month. Upgrade for more analyses."
                      : tier === 'personal'
                      ? "You have reached your personal plan limit of 10 chat analyses per month. Upgrade for unlimited analyses."
                      : "You have reached your plan limit. Please contact support if you need more analyses."}
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div id="analysisResults" ref={resultsRef} className="mt-8 slide-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Analysis Results</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchRoles}
                  disabled={!me || !them}
                >
                  Switch Names
                </Button>
              </div>
              
              {result && (
                <>
                  {/* Show different UI based on tier */}
                  {tier === 'free' ? (
                    <FreeTierAnalysis result={result} me={me} them={them} />
                  ) : (
                    <>
                      <div className="bg-muted p-4 rounded-lg mb-4">
                        <h4 className="font-medium mb-2">Overall Tone</h4>
                        <div className="mb-4">
                      <p className="text-lg font-medium mb-1">{result.toneAnalysis.overallTone.split('.')[0]}</p>
                      <p className="text-base text-gray-700">
                        {result.toneAnalysis.overallTone.includes('.') ? 
                          result.toneAnalysis.overallTone.substring(result.toneAnalysis.overallTone.indexOf('.')+1).trim() : 
                          "This analysis provides insights into the communication dynamics between participants."}
                      </p>
                    </div>
                    
                    {result.toneAnalysis.participantTones && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="font-medium mb-2 text-sm uppercase tracking-wide text-muted-foreground">Participant Analysis</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(34, 201, 201, 0.1)', border: '1px solid rgba(34, 201, 201, 0.3)' }}>
                            <span style={{ color: '#22C9C9' }} className="font-medium">{me}</span>
                            <p style={{ color: 'rgba(34, 201, 201, 0.9)' }} className="mt-1">{result.toneAnalysis.participantTones[me]}</p>
                          </div>
                          <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(255, 105, 180, 0.1)', border: '1px solid rgba(255, 105, 180, 0.3)' }}>
                            <span style={{ color: '#FF69B4' }} className="font-medium">{them}</span>
                            <p style={{ color: 'rgba(255, 105, 180, 0.9)' }} className="mt-1">{result.toneAnalysis.participantTones[them]}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Health Score Display - using our new component */}
                  <HealthScoreDisplay 
                    healthScore={result.healthScore}
                    me={me}
                    them={them}
                    tier={tier}
                  />
                  
                  {/* Tension Contributions Section - only show if present */}
                  {/* Tension Contributions section is now rendered by the TensionContributions component below */}
                  
                  {/* Communication Insights Section */}
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2">Communication Insights</h4>
                    {(result.communication && result.communication.patterns && result.communication.patterns.length > 0) ? (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Communication Patterns</h5>
                        <div className="space-y-3">
                          {/* Show patterns with highlighted participant names */}
                          {Array.from(new Set(result.communication.patterns)).map((pattern, idx) => {
                            // Highlight participant names in the pattern text
                            let highlightedPattern = pattern;
                            
                            // Check if pattern contains participant names
                            if (pattern.includes(me)) {
                              highlightedPattern = pattern.replace(
                                new RegExp(me, 'g'), 
                                `<span class="font-semibold text-[#22C9C9]">${me}</span>`
                              );
                            }
                            
                            if (pattern.includes(them)) {
                              highlightedPattern = highlightedPattern.replace(
                                new RegExp(them, 'g'), 
                                `<span class="font-semibold text-[#FF69B4]">${them}</span>`
                              );
                            }
                            
                            return (
                              <div key={idx} className="p-3 rounded bg-white border border-gray-200 shadow-sm">
                                <p><span className="text-gray-700" dangerouslySetInnerHTML={{ __html: highlightedPattern }}></span></p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Communication Patterns</h5>
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-blue-600">
                            {result.healthScore && result.healthScore.score > 85 ? 
                              <>Both <span className="font-semibold text-[#22C9C9]">{me}</span> and <span className="font-semibold text-[#FF69B4]">{them}</span> engage in supportive dialogue with positive emotional tone.</> :
                              result.healthScore && result.healthScore.score < 60 ? 
                              <>Some tension detected between <span className="font-semibold text-[#22C9C9]">{me}</span> and <span className="font-semibold text-[#FF69B4]">{them}</span> with moments of accusatory language.</> : 
                              <>Mixed communication patterns between <span className="font-semibold text-[#22C9C9]">{me}</span> and <span className="font-semibold text-[#FF69B4]">{them}</span> with a generally neutral emotional tone.</>}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {result.communication.suggestions && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Personalized Suggestions</h5>
                        <div className="space-y-3 mt-2">
                          {result.communication.suggestions.map((suggestion, idx) => {
                            // Determine if suggestion is specifically for one participant
                            const forMe = suggestion.toLowerCase().includes(me.toLowerCase());
                            const forThem = suggestion.toLowerCase().includes(them.toLowerCase());
                            
                            return (
                              <div 
                                key={idx} 
                                className="p-3 rounded border"
                                style={{
                                  backgroundColor: forMe 
                                    ? 'rgba(34, 201, 201, 0.1)'
                                    : forThem 
                                      ? 'rgba(255, 105, 180, 0.1)'
                                      : 'rgba(147, 51, 234, 0.1)',
                                  borderColor: forMe 
                                    ? 'rgba(34, 201, 201, 0.3)'
                                    : forThem 
                                      ? 'rgba(255, 105, 180, 0.3)'
                                      : 'rgba(147, 51, 234, 0.3)'
                                }}
                              >
                                <div className="flex items-start">
                                  <div className="mt-1 mr-2" style={{
                                    color: forMe 
                                      ? '#22C9C9'
                                      : forThem 
                                        ? '#FF69B4'
                                        : '#9333EA'
                                  }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                    </svg>
                                  </div>
                                  <div>
                                    {forMe && (
                                      <div className="text-xs font-medium mb-1" style={{ color: '#22C9C9' }}>For {me}</div>
                                    )}
                                    {forThem && (
                                      <div className="text-xs font-medium mb-1" style={{ color: '#FF69B4' }}>For {them}</div>
                                    )}
                                    {!forMe && !forThem && (
                                      <div className="text-xs font-medium mb-1" style={{ color: '#9333EA' }}>For both participants</div>
                                    )}
                                    <p className="text-sm" style={{
                                      color: forMe 
                                        ? 'rgba(34, 201, 201, 0.9)'
                                        : forThem 
                                          ? 'rgba(255, 105, 180, 0.9)'
                                          : 'rgba(147, 51, 234, 0.9)'
                                    }}>
                                      {suggestion}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Key Quotes Section - Pro Tier Only */}
                  {result.keyQuotes && result.keyQuotes.length > 0 && (tier === 'pro' || tier === 'instant') && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
                      <h4 className="font-medium mb-2 text-blue-700">Key Quotes Analysis</h4>
                      <div className="space-y-3">
                        {result.keyQuotes.map((quote, idx) => {
                          // Determine which participant's quote
                          const isMeQuote = quote.speaker === me;
                          const isThemQuote = quote.speaker === them;
                          
                          // Set color based on speaker
                          const speakerColor = isMeQuote 
                            ? '#22C9C9' 
                            : isThemQuote 
                              ? '#FF69B4' 
                              : '#3B82F6';
                          
                          // Set background color based on speaker
                          const bgColor = isMeQuote 
                            ? 'rgba(34, 201, 201, 0.1)' 
                            : isThemQuote 
                              ? 'rgba(255, 105, 180, 0.1)' 
                              : 'rgba(59, 130, 246, 0.1)';
                          
                          // Set border color based on speaker
                          const borderColor = isMeQuote 
                            ? 'rgba(34, 201, 201, 0.3)' 
                            : isThemQuote 
                              ? 'rgba(255, 105, 180, 0.3)' 
                              : 'rgba(59, 130, 246, 0.3)';
                              
                          return (
                            <div 
                              key={idx} 
                              className="bg-white p-3 rounded border" 
                              style={{ borderColor }}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span 
                                  className="font-semibold" 
                                  style={{ color: speakerColor }}
                                >
                                  {quote.speaker}
                                </span>
                                <span 
                                  className="text-xs px-2 py-1 rounded"
                                  style={{ backgroundColor: bgColor, color: speakerColor }}
                                >
                                  Quote #{idx + 1}
                                </span>
                              </div>
                              <p 
                                className="italic mb-2"
                                style={{ color: 'rgba(75, 85, 99, 0.9)' }}
                              >
                                "{quote.quote}"
                              </p>
                              <div className="space-y-2">
                                <p 
                                  className="text-sm p-2 rounded"
                                  style={{ backgroundColor: bgColor, color: 'rgba(75, 85, 99, 0.9)' }}
                                >
                                  <span 
                                    className="font-medium"
                                    style={{ color: speakerColor }}
                                  >
                                    Analysis:
                                  </span> {quote.analysis}
                                </p>
                                {quote.improvement && (
                                  <div 
                                    className="text-sm p-2 rounded border"
                                    style={{ 
                                      backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                                      borderColor: 'rgba(34, 197, 94, 0.3)',
                                      color: 'rgba(75, 85, 99, 0.9)'
                                    }}
                                  >
                                    <span 
                                      className="font-medium"
                                      style={{ color: 'rgba(34, 197, 94, 0.9)' }}
                                    >
                                      Possible Reframe:
                                    </span> {quote.improvement}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Removed duplicate Health Score Display */}
                  
                  {/* Emotion Tracking Per Participant (Personal+ Tier) */}
                  <EmotionTracking
                    me={me}
                    them={them}
                    tier={tier}
                    emotionalState={result.toneAnalysis.emotionalState}
                    participantTones={result.toneAnalysis.participantTones}
                  />
                  
                  {/* Red Flags Detection (Personal+ Tier) */}
                  <RedFlags 
                    redFlags={result.redFlags} 
                    tier={tier}
                    conversation={conversation} 
                  />
                  
                  {/* Communication Styles Breakdown (Personal+ Tier) */}
                  <CommunicationStyles 
                    me={me} 
                    them={them} 
                    participantConflictScores={result.participantConflictScores}
                    overallTone={result.toneAnalysis?.overallTone} 
                  />
                  
                  {/* Tension Contributions (Personal+ Tier) */}
                  <TensionContributions
                    me={me}
                    them={them}
                    tier={tier}
                    tensionContributions={result.tensionContributions}
                  />
                  
                  {/* Personalized Suggestions (Pro Tier Only) */}
                  {(tier === 'pro' || tier === 'instant') && (
                    <PersonalizedSuggestions
                      me={me}
                      them={them}
                      tier={tier}
                      suggestions={result.communication?.suggestions}
                    />
                  )}
                  
                  {/* Self-Reflection Section removed as requested */}
                  
                  {/* Behavioral Patterns Detection (Pro+ Tier) */}
                  <BehavioralPatterns 
                    tier={tier} 
                    conversation={conversation}
                    dynamics={result.communication?.dynamics}
                    me={me}
                    them={them}
                  />
                  
                  {/* Pro-tier Advanced Features */}
                  <AdvancedTrendLines 
                    tier={tier} 
                    conversation={conversation} 
                  />
                  
                  <EvasionPowerDynamics 
                    tier={tier} 
                    me={me} 
                    them={them} 
                    conversation={conversation}
                  />
                  
                  <EmotionalShiftsTimeline
                    tier={tier}
                    me={me}
                    them={them}
                    conversation={conversation}
                    emotionalState={result.toneAnalysis.emotionalState}
                  />
                  
                  <div className="mt-6 flex justify-end">
                    <Button
                      variant="outline"
                      className="mr-2"
                      onClick={() => setShowResults(false)}
                    >
                      Back to Analysis
                    </Button>
                    <Button
                      onClick={exportToPdf}
                      disabled={isExporting}
                      className="mr-2"
                    >
                      {isExporting ? 'Creating...' : 'Export as Text'}
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={exportAsImage}
                      disabled={isExporting}
                    >
                      {isExporting ? 'Creating...' : 'View as Image'}
                    </Button>
                  </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}