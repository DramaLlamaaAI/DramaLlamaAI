import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import DisclaimerModal from "./components/disclaimer-modal";
import { hasAcceptedDisclaimer, saveDisclaimerAcceptance } from "./lib/utils";
import Home from "./pages/home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(!hasAcceptedDisclaimer());

  const handleAcceptDisclaimer = () => {
    saveDisclaimerAcceptance();
    setShowDisclaimer(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {showDisclaimer && (
          <DisclaimerModal onAccept={handleAcceptDisclaimer} />
        )}
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
