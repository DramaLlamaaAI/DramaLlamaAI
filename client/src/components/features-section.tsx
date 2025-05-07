import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MessageSquare, MessageCircle, Zap } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="mb-12">
      <h2 className="text-3xl font-bold mb-6 text-primary">Analyze Your Communication</h2>
      
      <div className="max-w-3xl mx-auto bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-8 mb-10">
        <p className="text-lg text-center mb-8">
          Choose from our powerful AI-powered communication analysis tools to gain insights into your conversations.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 flex-wrap">
          <Link href="/chat-analysis">
            <Button size="lg" className="min-w-40 bg-primary hover:bg-primary-dark text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Chat Analysis
            </Button>
          </Link>
          
          <Link href="/vent-mode">
            <div className="relative inline-block">
              <Button size="lg" className="min-w-40 flex items-center gap-2 pr-10" 
                style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)', color: 'white' }}>
                <Zap className="w-5 h-5" />
                Vent Mode
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                  FREE
                </span>
              </Button>
            </div>
          </Link>
          
          <Link href="/message-analysis">
            <Button size="lg" className="min-w-40 bg-secondary hover:bg-secondary-dark text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Message Analysis
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-primary mx-auto mb-2" />
            <h3 className="text-lg font-semibold mb-2 text-primary">Chat Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Upload or paste a conversation to get detailed insights about communication patterns and emotional tone.
            </p>
          </div>
          
          <div className="text-center relative">
            <Zap className="w-12 h-12 mx-auto mb-2" style={{ color: '#FF69B4' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Vent Mode
              <span className="absolute top-0 -right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                FREE
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Rewrite emotional messages into calmer, more effective communication while preserving intent.
            </p>
          </div>
          
          <div className="text-center">
            <MessageCircle className="w-12 h-12 text-secondary mx-auto mb-2" />
            <h3 className="text-lg font-semibold mb-2 text-secondary">Message Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Get quick insights on the tone and intent of a single message without context.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
