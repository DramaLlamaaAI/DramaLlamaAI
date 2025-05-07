import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import DisclaimerModal from "./components/disclaimer-modal";
import { hasAcceptedDisclaimer, saveDisclaimerAcceptance } from "./lib/utils";
import { DevModeToggle } from "./components/dev-mode-toggle";
import Home from "./pages/home";
import NotFound from "@/pages/not-found";
import ChatAnalysis from "./components/chat-analysis";
import MessageAnalysis from "./components/message-analysis";
import VentMode from "./components/vent-mode";
import LiveTalk from "./components/live-talk";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat-analysis" component={ChatAnalysis} />
      <Route path="/message-analysis" component={MessageAnalysis} />
      <Route path="/vent-mode" component={VentMode} />
      <Route path="/live-talk" component={LiveTalk} />
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
        <DevModeToggle />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
