import { useState } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DisclaimerModal from "./components/disclaimer-modal";
import { hasAcceptedDisclaimer, saveDisclaimerAcceptance } from "./lib/utils";
import { AuthProvider } from "@/hooks/use-auth";
import { BetaPromoBanner } from "./components/beta-promo-banner";
import Home from "./pages/home";
import NotFound from "@/pages/not-found";
import SubscriptionPage from "@/pages/subscription";
import CheckoutPage from "@/pages/checkout";
import OneTimeCheckoutPage from "@/pages/one-time-checkout";
import AuthPage from "@/pages/auth-page";
import VerifyEmailPage from "@/pages/verify-email";
import VerifyEmailPageOld from "@/pages/verify-email-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import PrivacyPolicy from "@/pages/privacy-policy";
import PricingRedirect from "@/pages/pricing-redirect";
import InstantDeepDivePage from "@/pages/instant-deep-dive";
import AdminDashboardEnhanced from "@/pages/admin-dashboard-enhanced";
import AdminLoginPage from "@/pages/admin-login";
import ContactUs from "@/pages/contact-us";
import ComingSoonPage from "@/pages/coming-soon";
import WhatsAppGuide from "@/pages/whatsapp-guide";

import ChatAnalysisNew from "./components/chat-analysis-restored";
import ScreenshotAnalysis from "./components/screenshot-analysis";
import GroupChatAnalysis from "./components/group-chat-analysis";
import GroupChatAnalysisImproved from "./components/group-chat-analysis-improved";
import GroupChatAnalysisPage from "./pages/group-chat-analysis";
import MessageAnalysis from "./components/message-analysis";
import VentMode from "./components/de-escalate";
import LiveTalk from "./components/live-talk";
import ScriptBuilder from "./pages/script-builder";
import { AdminTierSwitcher } from "./components/admin/admin-tier-switcher";
import { LiveChatWidget } from "./components/live-chat-widget";

import Header from "./components/header";
import Footer from "./components/footer";
import type { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
};

function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-16">{children}</main>
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat-analysis" component={ChatAnalysisNew} />
      <Route path="/screenshot-analysis" component={ScreenshotAnalysis} />
      <Route path="/group-chat-analysis" component={GroupChatAnalysisPage} />
      <Route path="/message-analysis" component={MessageAnalysis} />
      <Route path="/de-escalate" component={VentMode} />
      <Route path="/vent-mode" component={VentMode} />
      <Route path="/script-builder" component={ScriptBuilder} />
      <Route path="/live-talk" component={LiveTalk} />
      <Route path="/whatsapp-guide" component={WhatsAppGuide} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/checkout/one-time" component={OneTimeCheckoutPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/verify" component={VerifyEmailPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/contact-us" component={ContactUs} />
      <Route path="/coming-soon" component={ComingSoonPage} />
      <Route path="/pricing" component={PricingRedirect} />
      <Route path="/instant-deep-dive" component={InstantDeepDivePage} />
      <Route path="/admin" component={AdminDashboardEnhanced} />
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
      <BetaPromoBanner />
      <LiveChatWidget />
    </QueryClientProvider>
  );
}

export default App;
