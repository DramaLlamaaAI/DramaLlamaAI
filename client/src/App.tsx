import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import DisclaimerModal from "./components/disclaimer-modal";
import { hasAcceptedDisclaimer, saveDisclaimerAcceptance } from "./lib/utils";
import { AuthProvider } from "@/hooks/use-auth";
import Home from "./pages/home";
import NotFound from "@/pages/not-found";
import SubscriptionPage from "@/pages/subscription";
import CheckoutPage from "@/pages/checkout";
import AuthPage from "@/pages/auth-page";
import VerifyEmailPage from "@/pages/verify-email-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import PrivacyPolicy from "@/pages/privacy-policy";
import PricingRedirect from "@/pages/pricing-redirect";
import InstantDeepDivePage from "@/pages/instant-deep-dive";
import AdminDashboardEnhanced from "@/pages/admin-dashboard-enhanced";
import AdminLoginPage from "@/pages/admin-login";
// Support helplines converted to dialog component
import ChatAnalysisFixed2 from "./components/chat-analysis-fixed2";
import GroupChatAnalysis from "./components/group-chat-analysis";
import GroupChatAnalysisImproved from "./components/group-chat-analysis-improved";
import GroupChatAnalysisPage from "./pages/group-chat-analysis";
import MessageAnalysis from "./components/message-analysis";
import VentMode from "./components/de-escalate";
import LiveTalk from "./components/live-talk";
import { AdminTierSwitcher } from "./components/admin/admin-tier-switcher";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Re-enabled using the fixed component */}
      <Route path="/chat-analysis" component={ChatAnalysisFixed2} />
      <Route path="/group-chat-analysis" component={GroupChatAnalysisPage} />
      <Route path="/message-analysis" component={MessageAnalysis} />
      <Route path="/de-escalate" component={VentMode} />
      <Route path="/live-talk" component={LiveTalk} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      {/* Pricing page now redirects to subscription */}
      <Route path="/pricing" component={PricingRedirect} />
      <Route path="/instant-deep-dive" component={InstantDeepDivePage} />
      <Route path="/admin" component={AdminDashboardEnhanced} />
      <Route path="/admin-login" component={AdminLoginPage} />
      {/* Support helplines converted to dialog component */}
      <Route component={NotFound} />
    </Switch>
  );
}

import Header from "./components/header";
import Footer from "./components/footer";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-16">
        {children}
      </main>
      <Footer />
    </div>
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
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          {showDisclaimer && (
            <DisclaimerModal onAccept={handleAcceptDisclaimer} />
          )}
          <AdminTierSwitcher />
          <Layout>
            <Router />
          </Layout>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
