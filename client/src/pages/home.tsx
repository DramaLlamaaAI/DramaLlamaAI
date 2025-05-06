import Header from "@/components/header";
import Footer from "@/components/footer";
import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import PricingSection from "@/components/pricing-section";
import HowItWorks from "@/components/how-it-works";
import ChatAnalysis from "@/components/chat-analysis";
import MessageAnalysis from "@/components/message-analysis";
import VentMode from "@/components/vent-mode";
import { Helmet } from "react-helmet-async";

export default function Home() {
  // Support smooth scrolling for anchor links
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    id: string
  ) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Drama Llama - AI Powered Communication Analysis</title>
        <meta name="description" content="Drama Llama uses AI to analyze conversations, detect emotional tones, and provide clarity on communication dynamics." />
        <meta property="og:title" content="Drama Llama - AI Powered Communication Analysis" />
        <meta property="og:description" content="Get insights on your conversations with our AI-powered analysis tool." />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <HowItWorks />
      </main>
      
      <Footer />
    </>
  );
}
