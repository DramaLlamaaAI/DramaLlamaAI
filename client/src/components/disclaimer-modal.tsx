import { useEffect, useState } from 'react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { hasAcceptedDisclaimer, saveDisclaimerAcceptance } from "@/lib/utils";

interface DisclaimerModalProps {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  const [open, setOpen] = useState(false);
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);

  useEffect(() => {
    // Check if the user has already accepted the disclaimer
    if (!hasAcceptedDisclaimer()) {
      setOpen(true);
    }
  }, []);

  const handleAccept = () => {
    saveDisclaimerAcceptance();
    setOpen(false);
    onAccept();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl text-center mb-2">
            Welcome to Drama Llama
          </AlertDialogTitle>
          <div className="w-full flex justify-center mb-2">
            <img 
              src="/drama-llama-logo.svg" 
              alt="Drama Llama Logo" 
              className="h-12 w-12 opacity-80"
            />
          </div>
          
          {/* Compact Important Information Box */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
            <p className="text-center font-medium mb-2">
              Drama Llama is an AI communication analysis tool for general guidance only.
            </p>
            <ul className="text-sm space-y-1 mb-3">
              <li className="flex items-start gap-1">
                <span className="text-red-500 font-bold">•</span> 
                <span>Not a substitute for professional advice</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-red-500 font-bold">•</span> 
                <span>Not a clinical assessment tool</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-red-500 font-bold">•</span> 
                <span>AI may misinterpret context or cultural differences</span>
              </li>
            </ul>
          </div>
          
          {/* Full Disclaimer Collapsible */}
          <Collapsible 
            open={showFullDisclaimer} 
            onOpenChange={setShowFullDisclaimer}
            className="mb-2"
          >
            <CollapsibleTrigger className="flex items-center justify-center w-full text-sm text-muted-foreground hover:text-primary transition-colors">
              {showFullDisclaimer ? "Hide Details" : "Read Full Disclaimer"} 
              <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showFullDisclaimer ? "transform rotate-180" : ""}`} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-3 space-y-4 text-sm">
              <AlertDialogDescription className="space-y-4 text-sm">
                <p>
                  <strong>Please read this disclaimer carefully before using Drama Llama.</strong>
                </p>
                
                <p>
                  Drama Llama is an AI-powered communication analysis tool designed to provide insights into 
                  conversational patterns. It's meant to be used for general guidance and educational purposes only.
                </p>
                
                <p>
                  <strong>Important limitations to know:</strong>
                </p>
                
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Drama Llama is <strong>not a substitute for professional advice</strong> from qualified 
                    counselors, therapists, or other mental health practitioners.
                  </li>
                  <li>
                    The analysis provided is <strong>not a clinical assessment</strong> and should not be 
                    used to diagnose or treat any psychological, emotional, or relationship issues.
                  </li>
                  <li>
                    Our AI models have inherent limitations and biases. They <strong>may misinterpret</strong> nuance, 
                    context, or cultural differences in communication.
                  </li>
                  <li>
                    All analyses are <strong>suggestions only</strong>. The app can't account for your unique 
                    circumstances, history, or the full context of your relationships.
                  </li>
                </ul>
                
                <p className="italic text-sm text-muted-foreground">
                  Drama Llama respects your privacy. Your conversations are not permanently stored 
                  after analysis unless you explicitly save them to your account.
                </p>
              </AlertDialogDescription>
            </CollapsibleContent>
          </Collapsible>
          
          <p className="text-center text-sm">
            By clicking "I understand" below, you acknowledge these limitations and use this tool at your own discretion.
          </p>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogAction 
            onClick={handleAccept}
            className="w-full"
          >
            I understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}