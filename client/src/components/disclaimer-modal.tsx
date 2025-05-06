import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import llamaImage from "@assets/FB Profile Pic.png";

interface DisclaimerModalProps {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg mx-auto fade-in border-2 border-primary overflow-hidden">
        <div className="bg-primary py-4 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-center">
              <img 
                src={llamaImage} 
                alt="Drama Llama" 
                className="w-16 h-16 rounded-full object-cover border-2 border-white" 
              />
              <CardTitle className="text-2xl ml-4 text-white">Drama Llama</CardTitle>
            </div>
          </CardHeader>
        </div>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-3 text-secondary">Important Disclaimer</h3>
          <p className="mb-4 text-muted-foreground">
            Drama Llama is an AI-powered tool for personal insight. It is not a diagnostic or clinical product. Interpret AI feedback with care and your own judgment.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            By continuing, you agree to use this tool responsibly and understand its limitations.
          </p>
          <p className="text-sm text-primary underline cursor-pointer">
            Read our full disclaimer
          </p>
        </CardContent>
        <CardFooter className="justify-end pb-6">
          <Button onClick={onAccept} className="bg-secondary hover:bg-secondary-dark text-white">
            I Understand
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
