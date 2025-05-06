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
import { hasAcceptedDisclaimer, saveDisclaimerAcceptance } from "@/lib/utils";

interface DisclaimerModalProps {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  const [open, setOpen] = useState(false);

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
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl text-center mb-2">
            Welcome to Drama Llama
          </AlertDialogTitle>
          <div className="w-full flex justify-center mb-4">
            <img 
              src="/drama-llama-logo.svg" 
              alt="Drama Llama Logo" 
              className="h-16 w-16 opacity-80"
            />
          </div>
          <AlertDialogDescription className="space-y-4 text-base">
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
            
            <p>
              By clicking "I understand" below, you acknowledge that you're using this tool at your own 
              discretion, and that you understand its purpose and limitations.
            </p>
            
            <p className="italic text-sm text-muted-foreground">
              Drama Llama respects your privacy. Your conversations are not permanently stored 
              after analysis unless you explicitly save them to your account.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
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