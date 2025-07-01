import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, ExternalLink, Heart, Shield, Brain, Users } from "lucide-react";

interface HelplineRecommendation {
  type: string;
  badge: string;
  title: string;
  contact: string;
  description: string;
  website?: string;
  icon: React.ReactNode;
  severity: 'critical' | 'important' | 'helpful';
}

interface HelplineRecommendationsProps {
  redFlags?: any[];
  healthScore?: number;
  analysisType?: string;
  country?: string;
}

export default function HelplineRecommendations({ 
  redFlags = [], 
  healthScore = 100, 
  analysisType = 'relationship',
  country = 'US' 
}: HelplineRecommendationsProps) {
  
  const getRecommendations = (): HelplineRecommendation[] => {
    const recommendations: HelplineRecommendation[] = [];
    const redFlagTypes = redFlags.map(flag => flag.type?.toLowerCase() || '');
    
    // Critical emergency support for severe red flags
    if (redFlagTypes.some(type => 
      type.includes('abuse') || type.includes('threat') || type.includes('violence') || 
      type.includes('control') || type.includes('isolation') || type.includes('stalking') ||
      type.includes('physical') || type.includes('sexual')
    )) {
      recommendations.push({
        type: 'Emergency Support',
        badge: '🆘 Critical',
        title: 'National Domestic Violence Hotline',
        contact: '1-800-799-7233',
        description: 'Free, confidential support available 24/7. Chat available at thehotline.org',
        website: 'https://www.thehotline.org',
        icon: <Shield className="h-5 w-5" />,
        severity: 'critical'
      });
    }

    // Suicide prevention for severe mental health indicators
    if (redFlagTypes.some(type => 
      type.includes('suicide') || type.includes('self-harm') || type.includes('depression') ||
      type.includes('hopeless')
    ) || healthScore < 20) {
      recommendations.push({
        type: 'Crisis Support',
        badge: '🆘 Critical',
        title: '988 Suicide & Crisis Lifeline',
        contact: '988',
        description: 'Free, confidential crisis support 24/7. Text or chat available',
        website: 'https://988lifeline.org',
        icon: <Heart className="h-5 w-5" />,
        severity: 'critical'
      });
    }

    // Relationship counseling for moderate issues
    if (healthScore < 70 || redFlagTypes.some(type => 
      type.includes('communication') || type.includes('conflict') || type.includes('emotional')
    )) {
      recommendations.push({
        type: 'Professional Support',
        badge: '💬 Recommended',
        title: 'Relationship Counseling',
        contact: 'Find Local Therapists',
        description: 'Professional guidance for communication improvement and conflict resolution',
        website: 'https://www.psychologytoday.com/us/therapists',
        icon: <Users className="h-5 w-5" />,
        severity: 'important'
      });
    }

    // Mental health support
    if (redFlagTypes.some(type => 
      type.includes('anxiety') || type.includes('manipulation') || type.includes('gaslighting') ||
      type.includes('emotional') || type.includes('mental')
    ) || healthScore < 50) {
      recommendations.push({
        type: 'Mental Health',
        badge: '🧠 Helpful',
        title: 'Crisis Text Line',
        contact: 'Text HOME to 741741',
        description: 'Free crisis counseling via text message, available 24/7',
        website: 'https://www.crisistextline.org',
        icon: <Brain className="h-5 w-5" />,
        severity: 'helpful'
      });
    }

    // Teen-specific support
    if (analysisType === 'teen' || redFlagTypes.some(type => 
      type.includes('teen') || type.includes('young') || type.includes('parent')
    )) {
      recommendations.push({
        type: 'Teen Support',
        badge: '👥 Teen Support',
        title: 'Teen Line',
        contact: '1-800-852-8336',
        description: 'Confidential support for teenagers by teenagers, 6pm-10pm PST',
        website: 'https://teenlineonline.org',
        icon: <Users className="h-5 w-5" />,
        severity: 'helpful'
      });
    }

    // LGBTQ+ specific support
    if (redFlagTypes.some(type => type.includes('lgbtq') || type.includes('identity'))) {
      recommendations.push({
        type: 'LGBTQ+ Support',
        badge: '🏳️‍🌈 LGBTQ+',
        title: 'Trevor Project',
        contact: '1-866-488-7386',
        description: 'Crisis support and suicide prevention for LGBTQ+ youth',
        website: 'https://www.thetrevorproject.org',
        icon: <Heart className="h-5 w-5" />,
        severity: 'important'
      });
    }

    // National Sexual Assault Hotline
    if (redFlagTypes.some(type => 
      type.includes('sexual') || type.includes('assault') || type.includes('harassment')
    )) {
      recommendations.push({
        type: 'Sexual Assault Support',
        badge: '🆘 Critical',
        title: 'RAINN National Sexual Assault Hotline',
        contact: '1-800-656-4673',
        description: 'Free, confidential support for survivors of sexual violence, 24/7',
        website: 'https://www.rainn.org',
        icon: <Shield className="h-5 w-5" />,
        severity: 'critical'
      });
    }

    // Workplace harassment
    if (redFlagTypes.some(type => 
      type.includes('workplace') || type.includes('harassment') || type.includes('professional')
    )) {
      recommendations.push({
        type: 'Workplace Support',
        badge: '💼 Workplace',
        title: 'EEOC Helpline',
        contact: '1-800-669-4000',
        description: 'Equal Employment Opportunity Commission support for workplace issues',
        website: 'https://www.eeoc.gov',
        icon: <Users className="h-5 w-5" />,
        severity: 'important'
      });
    }

    // If no specific recommendations, provide general support
    if (recommendations.length === 0 && healthScore < 80) {
      recommendations.push({
        type: 'General Support',
        badge: '💬 Helpful',
        title: '211 Helpline',
        contact: 'Dial 211',
        description: 'Connects you to local resources for support, counseling, and assistance',
        website: 'https://www.211.org',
        icon: <Phone className="h-5 w-5" />,
        severity: 'helpful'
      });
    }

    // Sort by severity
    return recommendations.sort((a, b) => {
      const severityOrder = { critical: 0, important: 1, helpful: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  };

  const recommendations = getRecommendations();

  if (recommendations.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'important': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'helpful': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className="mt-6 border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Heart className="h-5 w-5" />
          Support Resources & Helplines
        </CardTitle>
        <p className="text-sm text-blue-700">
          Based on your conversation analysis, here are some resources that might be helpful:
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {rec.icon}
                <h4 className="font-semibold text-gray-900">{rec.title}</h4>
              </div>
              <Badge className={getSeverityColor(rec.severity)}>
                {rec.badge}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => {
                  if (rec.contact.includes('988') || rec.contact.includes('211')) {
                    window.open(`tel:${rec.contact}`, '_self');
                  } else if (rec.contact.includes('741741')) {
                    // For text services, just copy to clipboard
                    navigator.clipboard.writeText(rec.contact);
                  } else if (rec.contact.includes('-')) {
                    window.open(`tel:${rec.contact}`, '_self');
                  }
                }}
              >
                <Phone className="h-4 w-4" />
                {rec.contact}
              </Button>
              
              {rec.website && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => window.open(rec.website, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Website
                </Button>
              )}
            </div>
          </div>
        ))}
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
          <p className="text-xs text-gray-600">
            <strong>Important:</strong> These resources are suggestions based on conversation patterns. 
            If you're in immediate danger, call 911. All hotlines listed provide free, confidential support.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}