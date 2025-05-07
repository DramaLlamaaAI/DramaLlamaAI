import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

interface PricingFeature {
  name: string;
  free: boolean;
  personal: boolean;
  pro: boolean;
}

// Pricing features table data
const features: PricingFeature[] = [
  { name: "Message Analysis", free: true, personal: true, pro: true },
  { name: "Vent Mode", free: true, personal: true, pro: true },
  { name: "Red Flag Detection", free: false, personal: true, pro: true },
  { name: "Communication Patterns", free: false, personal: true, pro: true },
  { name: "Actionable Advice", free: false, personal: true, pro: true },
  { name: "Detailed Quote Analysis", free: false, personal: true, pro: true },
  { name: "Alternative Wording Suggestions", free: false, personal: true, pro: true },
  { name: "Tension Trendline", free: false, personal: false, pro: true },
  { name: "Live Talk Recording & Analysis", free: false, personal: false, pro: true },
  { name: "Unlimited Analyses", free: false, personal: false, pro: true },
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Free Plan */}
            <div className="rounded-lg border p-6 bg-background shadow-sm">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <p className="text-2xl font-bold mb-4">$0</p>
              <p className="text-muted-foreground mb-6">Get started with basic analysis</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>1 free analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Basic conversation insights</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Simple tone analysis</span>
                </li>
                <li className="flex items-center">
                  <X className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Advanced features</span>
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
              <h3 className="text-xl font-bold mb-2">Personal</h3>
              <p className="text-2xl font-bold mb-1">$9.99</p>
              <p className="text-xs text-muted-foreground mb-4">per month</p>
              <p className="text-muted-foreground mb-6">Everything in Free, plus advanced analysis</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>10 analyses per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Red flag detection</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Pattern recognition</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Actionable advice</span>
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
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-2xl font-bold mb-1">$19.99</p>
              <p className="text-xs text-muted-foreground mb-4">per month</p>
              <p className="text-muted-foreground mb-6">Everything in Personal, plus unlimited usage</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Unlimited analyses</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Tension timeline tracking</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Live conversation analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>Priority support</span>
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