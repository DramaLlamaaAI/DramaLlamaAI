import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MessageSquare, MessageCircle, Zap } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="mb-12">
      <h2 className="text-3xl font-bold mb-6 text-primary">Analyze Your Communication</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 border-primary/20">
          <div className="h-40 overflow-hidden bg-primary flex items-center justify-center">
            <MessageSquare className="w-20 h-20 text-white" />
          </div>
          <CardContent className="p-5">
            <h3 className="text-xl font-semibold mb-2 text-primary">Chat Analysis</h3>
            <p className="text-muted-foreground mb-4">
              Upload or paste a conversation to get detailed insights about communication patterns and emotional tone.
            </p>
            <Link href="#chatAnalysis">
              <Button className="w-full bg-primary hover:bg-primary-dark text-white">
                Analyze Chat
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 border-secondary/20">
          <div className="h-40 overflow-hidden bg-secondary flex items-center justify-center">
            <MessageCircle className="w-20 h-20 text-white" />
          </div>
          <CardContent className="p-5">
            <h3 className="text-xl font-semibold mb-2 text-secondary">One Message Analysis</h3>
            <p className="text-muted-foreground mb-4">
              Get quick insights on the tone and intent of a single message without context.
            </p>
            <Link href="#messageAnalysis">
              <Button className="w-full bg-secondary hover:bg-secondary-dark text-white">
                Analyze Message
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 border-primary/20">
          <div className="h-40 overflow-hidden bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
            <Zap className="w-20 h-20 text-white" />
          </div>
          <CardContent className="p-5">
            <h3 className="text-xl font-semibold mb-2" style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Vent Mode
            </h3>
            <p className="text-muted-foreground mb-4">
              Rewrite emotional messages into calmer, more effective communication while preserving intent.
            </p>
            <Link href="#ventMode">
              <Button className="w-full" style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)', color: 'white' }}>
                Use Vent Mode
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
