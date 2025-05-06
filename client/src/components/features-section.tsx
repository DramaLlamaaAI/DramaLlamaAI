import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MessageSquare, MessageCircle, Zap } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="mb-12">
      <h2 className="text-2xl font-bold mb-6">Analyze Your Communication</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1">
          <div className="h-40 overflow-hidden bg-gradient-to-r from-primary/30 to-primary/10 flex items-center justify-center">
            <MessageSquare className="w-20 h-20 text-primary/70" />
          </div>
          <CardContent className="p-5">
            <h3 className="text-xl font-semibold mb-2">Chat Analysis</h3>
            <p className="text-muted-foreground mb-4">
              Upload or paste a conversation to get detailed insights about communication patterns and emotional tone.
            </p>
            <Link href="#chatAnalysis">
              <Button className="w-full" variant="default">
                Analyze Chat
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1">
          <div className="h-40 overflow-hidden bg-gradient-to-r from-secondary/30 to-secondary/10 flex items-center justify-center">
            <MessageCircle className="w-20 h-20 text-secondary/70" />
          </div>
          <CardContent className="p-5">
            <h3 className="text-xl font-semibold mb-2">One Message Analysis</h3>
            <p className="text-muted-foreground mb-4">
              Get quick insights on the tone and intent of a single message without context.
            </p>
            <Link href="#messageAnalysis">
              <Button className="w-full" variant="default">
                Analyze Message
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1">
          <div className="h-40 overflow-hidden bg-gradient-to-r from-accent/30 to-accent/10 flex items-center justify-center">
            <Zap className="w-20 h-20 text-accent/70" />
          </div>
          <CardContent className="p-5">
            <h3 className="text-xl font-semibold mb-2">Vent Mode</h3>
            <p className="text-muted-foreground mb-4">
              Rewrite emotional messages into calmer, more effective communication while preserving intent.
            </p>
            <Link href="#ventMode">
              <Button className="w-full" variant="default">
                Use Vent Mode
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
