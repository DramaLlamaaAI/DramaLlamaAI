import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useState } from "react";

interface PricingFeature {
  name: string;
  free: boolean;
  personal: boolean;
  pro: boolean;
}

const pricingFeatures: PricingFeature[] = [
  { name: "Basic tone analysis", free: true, personal: true, pro: true },
  { name: "One-time use only", free: true, personal: false, pro: false },
  { name: "10 analyses per month", free: false, personal: true, pro: false },
  { name: "Unlimited analyses", free: false, personal: false, pro: true },
  { name: "Red flag detection", free: false, personal: true, pro: true },
  { name: "Communication pattern insights", free: false, personal: true, pro: true },
  { name: "Tone progression tracking", free: false, personal: false, pro: true },
  { name: "Replacements for problematic phrases", free: false, personal: true, pro: true },
  { name: "Live conversation recording & analysis", free: false, personal: false, pro: true },
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
  onSignIn,
}: TrialLimitModalProps) {
  const [selectedTab, setSelectedTab] = useState("pricing");
  const [showAnnualPricing, setShowAnnualPricing] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">You've reached your free trial limit</DialogTitle>
          <DialogDescription>
            Your free trial analysis has been used. Upgrade to continue using Drama Llama's powerful insights or sign in to your account.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pricing">Upgrade Options</TabsTrigger>
            <TabsTrigger value="login">Sign In</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="mt-4 space-y-4">
            <div className="flex items-center justify-end space-x-2">
              <span className="text-sm text-muted-foreground">Monthly</span>
              <Switch
                checked={showAnnualPricing}
                onCheckedChange={setShowAnnualPricing}
              />
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground">Annual</span>
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                  Save 20%
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Free Tier */}
              <div className="border rounded-lg p-4 flex flex-col relative">
                <h3 className="font-bold text-lg">Free</h3>
                <p className="text-2xl font-bold mt-2">$0</p>
                <p className="text-sm text-muted-foreground mb-4">One-time use</p>
                <div className="space-y-2 flex-grow">
                  {pricingFeatures.map((feature, i) => (
                    <div key={i} className="flex items-start">
                      {feature.free ? (
                        <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mr-2 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={feature.free ? "" : "text-gray-400"}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  disabled
                >
                  Current Plan
                </Button>
              </div>

              {/* Personal Tier */}
              <div className="border-2 border-primary rounded-lg p-4 flex flex-col relative">
                <div className="absolute -top-3 -right-3">
                  <Badge className="bg-primary text-white">Popular</Badge>
                </div>
                <h3 className="font-bold text-lg">Personal</h3>
                <p className="text-2xl font-bold mt-2">
                  ${showAnnualPricing ? "6.99" : "8.99"}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{showAnnualPricing ? "mo (billed yearly)" : "month"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mb-4">For individuals</p>
                <div className="space-y-2 flex-grow">
                  {pricingFeatures.map((feature, i) => (
                    <div key={i} className="flex items-start">
                      {feature.personal ? (
                        <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mr-2 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={feature.personal ? "" : "text-gray-400"}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => onUpgrade("personal")}
                >
                  Get Personal
                </Button>
              </div>

              {/* Pro Tier */}
              <div className="border rounded-lg p-4 flex flex-col relative">
                <h3 className="font-bold text-lg">Pro</h3>
                <p className="text-2xl font-bold mt-2">
                  ${showAnnualPricing ? "14.99" : "19.99"}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{showAnnualPricing ? "mo (billed yearly)" : "month"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mb-4">For power users</p>
                <div className="space-y-2 flex-grow">
                  {pricingFeatures.map((feature, i) => (
                    <div key={i} className="flex items-start">
                      {feature.pro ? (
                        <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mr-2 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={feature.pro ? "" : "text-gray-400"}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => onUpgrade("pro")}
                >
                  Get Pro
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="login" className="mt-4">
            <div className="flex flex-col items-center justify-center py-6">
              <h3 className="text-lg font-medium mb-2">Already have an account?</h3>
              <p className="text-center text-muted-foreground mb-6">
                Sign in to your Drama Llama account to continue your journey of improved communication.
              </p>
              <Button onClick={onSignIn} className="w-full max-w-xs">
                Sign In
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <div className="text-xs text-muted-foreground text-center sm:text-left w-full">
            Need help choosing? Contact us at support@dramallama.ai
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}