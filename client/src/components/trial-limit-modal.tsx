import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

interface PricingFeature {
  name: string;
  free: boolean;
  personal: boolean;
  pro: boolean;
  instant: boolean;
}

// Pricing features table data
const features: PricingFeature[] = [
  { name: "Overall Tone Analysis", free: true, personal: true, pro: true, instant: true },
  { name: "Conversation Health Meter", free: true, personal: true, pro: true, instant: true },
  { name: "Key Conversation Quotes", free: true, personal: true, pro: true, instant: true },
  { name: "Communication Insights", free: true, personal: true, pro: true, instant: true },
  { name: "PDF Export", free: true, personal: true, pro: true, instant: true },
  { name: "Red Flag Detection", free: false, personal: true, pro: true, instant: true },
  { name: "Communication Styles Analysis", free: false, personal: true, pro: true, instant: true },
  { name: "Emotion Tracking Per Participant", free: false, personal: true, pro: true, instant: true },
  { name: "Conversation Dynamics", free: false, personal: true, pro: true, instant: true },
  { name: "Accountability Indicators", free: false, personal: true, pro: true, instant: true },
  { name: "Behavioral Patterns Detection", free: false, personal: true, pro: true, instant: true },
  { name: "Drama Score™", free: false, personal: false, pro: true, instant: true },
  { name: "Power Dynamics Analysis", free: false, personal: false, pro: true, instant: true },
  { name: "Emotional Shifts Timeline", free: false, personal: false, pro: true, instant: true },
  { name: "Message Dominance Analysis", free: false, personal: false, pro: true, instant: true },
  { name: "Historical Pattern Recognition", free: false, personal: false, pro: true, instant: true },
  { name: "Unlimited Analyses", free: false, personal: false, pro: true, instant: true },
];

interface TrialLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier: string) => void;
  onSignIn: () => void;
}

export default function TrialLimitModal({
  isOpen,
  onClose,
  onUpgrade,
  onSignIn
}: TrialLimitModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Free Trial Complete</DialogTitle>
          <DialogDescription>
            You've used your free analysis! Create an account to continue using Drama Llama.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <h3 className="text-lg font-semibold mb-4">Choose a plan that's right for you</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Free Plan */}
            <div className="rounded-lg border p-6 bg-background shadow-sm">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <p className="text-2xl font-bold mb-4">£0</p>
              <p className="text-muted-foreground mb-6">Basic emotional tone analysis</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>1 chat analysis per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Overall Tone</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Conversation Health Meter</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Key conversation quotes</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Communication insights</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>PDF export</span>
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={onSignIn}
              >
                Sign In
              </Button>
            </div>
            
            {/* Personal Plan */}
            <div className="rounded-lg border p-6 bg-primary/5 border-primary shadow-md">
              <div className="bg-primary text-primary-foreground text-xs py-1 px-3 rounded-full w-fit mb-2">Popular</div>
              <h3 className="text-xl font-bold mb-2">Personal Plan</h3>
              <p className="text-2xl font-bold mb-1">£4.78</p>
              <p className="text-xs text-muted-foreground mb-4">per month</p>
              <p className="text-muted-foreground mb-6">Everything in Free tier, plus:</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>10 chat analyses per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Advanced analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Key quotes with manipulation score</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>🚩 Red Flag Detection</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>🚩 Red Flag Meters</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Communication styles</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                onClick={() => onUpgrade('personal')}
              >
                Choose Personal
              </Button>
            </div>
            
            {/* Pro Plan */}
            <div className="rounded-lg border p-6 bg-background shadow-sm">
              <h3 className="text-xl font-bold mb-2">Pro/Relationship</h3>
              <p className="text-2xl font-bold mb-1">£9.99</p>
              <p className="text-xs text-muted-foreground mb-4">per month</p>
              <p className="text-muted-foreground mb-6">Everything in Personal, plus:</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Unlimited chat uploads</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Advanced trend lines</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Drama Score™</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Evasion Identification</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Power Dynamics Analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Red Flags Timeline</span>
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onUpgrade('pro')}
              >
                Choose Pro
              </Button>
            </div>
            
            {/* Instant Deep Dive Plan */}
            <div className="rounded-lg border p-6 bg-secondary/5 border-secondary shadow-md">
              <div className="bg-secondary text-white text-xs py-1 px-3 rounded-full w-fit mb-2">One-time</div>
              <h3 className="text-xl font-bold mb-2">Instant Deep Dive</h3>
              <p className="text-2xl font-bold mb-1">£2.49</p>
              <p className="text-xs text-muted-foreground mb-4">one-off payment</p>
              <p className="text-muted-foreground mb-6">No subscription necessary</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-secondary" />
                  <span>Everything in Pro plan</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-secondary" />
                  <span>Drama Score™</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-secondary" />
                  <span>Message Dominance Analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-secondary" />
                  <span>Emotional Shifts Timeline</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-secondary" />
                  <span>Power Dynamics Analysis</span>
                </li>
              </ul>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => onUpgrade('instant')}
              >
                Buy Deep Dive
              </Button>
            </div>
          </div>
          
          <div className="mt-8 border rounded-lg">
            <h4 className="text-md font-semibold p-4 border-b">Feature Comparison</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Feature</TableHead>
                  <TableHead className="text-center">Free</TableHead>
                  <TableHead className="text-center">Personal</TableHead>
                  <TableHead className="text-center">Pro</TableHead>
                  <TableHead className="text-center text-secondary">Deep Dive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((feature) => (
                  <TableRow key={feature.name}>
                    <TableCell>{feature.name}</TableCell>
                    <TableCell className="text-center">
                      {feature.free ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {feature.personal ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {feature.pro ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {feature.instant ? <Check className="mx-auto h-4 w-4 text-secondary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <Button variant="ghost" onClick={onClose}>Maybe Later</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSignIn}>Sign In</Button>
            <Button onClick={() => onUpgrade('personal')}>Upgrade Now</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}