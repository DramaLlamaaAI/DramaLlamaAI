import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, ExternalLink, Heart, Shield, Users } from 'lucide-react';

interface SupportLine {
  id: string;
  name: string;
  phone: string;
  website?: string;
  description: string;
  category: 'crisis' | 'domestic' | 'mental_health' | 'relationships' | 'general';
  available: string;
  isRecommended?: boolean;
}

const supportLines: SupportLine[] = [
  {
    id: 'samaritans',
    name: 'Samaritans',
    phone: '116 123',
    website: 'https://www.samaritans.org',
    description: 'Free, confidential emotional support for anyone in distress',
    category: 'crisis',
    available: '24/7, 365 days a year'
  },
  {
    id: 'domestic_violence',
    name: 'National Domestic Violence Helpline',
    phone: '0808 2000 247',
    website: 'https://www.nationaldahelpline.org.uk',
    description: 'Confidential support for women experiencing domestic violence',
    category: 'domestic',
    available: '24/7'
  },
  {
    id: 'mens_advice',
    name: "Men's Advice Line",
    phone: '0808 8010 327',
    website: 'https://www.mensadviceline.org.uk',
    description: 'Confidential support for men experiencing domestic violence and abuse',
    category: 'domestic',
    available: 'Mon-Fri 9am-5pm'
  },
  {
    id: 'mind',
    name: 'Mind Infoline',
    phone: '0300 123 3393',
    website: 'https://www.mind.org.uk',
    description: 'Mental health information and support',
    category: 'mental_health',
    available: 'Mon-Fri 9am-6pm'
  },
  {
    id: 'relate',
    name: 'Relate',
    phone: '0300 003 0396',
    website: 'https://www.relate.org.uk',
    description: 'Relationship counselling and support services',
    category: 'relationships',
    available: 'Mon-Fri 9am-5pm'
  },
  {
    id: 'childline',
    name: 'Childline',
    phone: '0800 1111',
    website: 'https://www.childline.org.uk',
    description: 'Free, confidential support for young people under 19',
    category: 'crisis',
    available: '24/7'
  }
];

interface SupportHelpLinesProps {
  analysisResult?: any;
  showRecommended?: boolean;
  title?: string;
}

export function SupportHelpLines({ analysisResult, showRecommended = false, title = "Support & Help Lines" }: SupportHelpLinesProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Determine recommended lines based on analysis
  const getRecommendedLines = () => {
    if (!analysisResult || !showRecommended) return [];
    
    const { healthScore, redFlags, toneAnalysis } = analysisResult;
    const recommended: string[] = [];

    // Crisis support for severe situations
    if (healthScore?.score < 30 || (redFlags && redFlags.some((flag: any) => flag.severity >= 8))) {
      recommended.push('samaritans');
    }

    // Domestic violence support if abuse flags detected
    if (redFlags && redFlags.some((flag: any) => 
      flag.type?.toLowerCase().includes('control') || 
      flag.type?.toLowerCase().includes('manipulation') ||
      flag.type?.toLowerCase().includes('gaslighting')
    )) {
      recommended.push('domestic_violence', 'mens_advice');
    }

    // Mental health support for emotional distress
    if (toneAnalysis?.emotionalState?.some((emotion: any) => 
      emotion.emotion === 'depression' || emotion.emotion === 'anxiety' || emotion.intensity > 0.8
    )) {
      recommended.push('mind');
    }

    // Relationship counselling for communication issues
    if (healthScore?.score < 60) {
      recommended.push('relate');
    }

    return recommended;
  };

  const recommendedIds = getRecommendedLines();
  const displayLines = supportLines.map(line => ({
    ...line,
    isRecommended: recommendedIds.includes(line.id)
  }));

  const categories = [
    { id: 'crisis', name: 'Crisis Support', icon: Shield, color: 'bg-red-100 text-red-800' },
    { id: 'domestic', name: 'Domestic Violence', icon: Heart, color: 'bg-purple-100 text-purple-800' },
    { id: 'mental_health', name: 'Mental Health', icon: Heart, color: 'bg-blue-100 text-blue-800' },
    { id: 'relationships', name: 'Relationships', icon: Users, color: 'bg-green-100 text-green-800' }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          {title}
        </CardTitle>
        {showRecommended && recommendedIds.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Based on your analysis, we recommend the highlighted support services below.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map(category => {
          const categoryLines = displayLines.filter(line => line.category === category.id);
          if (categoryLines.length === 0) return null;

          const hasRecommended = categoryLines.some(line => line.isRecommended);

          return (
            <div key={category.id} className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className={`w-full justify-between ${hasRecommended && showRecommended ? 'ring-2 ring-pink-300 bg-pink-50' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <category.icon className="h-4 w-4" />
                  <span>{category.name}</span>
                  {hasRecommended && showRecommended && (
                    <Badge variant="secondary" className="bg-pink-100 text-pink-700 text-xs">
                      Recommended
                    </Badge>
                  )}
                </div>
                <span className="text-xs">{categoryLines.length} service{categoryLines.length > 1 ? 's' : ''}</span>
              </Button>

              {expandedCategory === category.id && (
                <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                  {categoryLines.map(line => (
                    <div 
                      key={line.id} 
                      className={`p-3 rounded-lg border ${line.isRecommended && showRecommended ? 'border-pink-300 bg-pink-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{line.name}</h4>
                            {line.isRecommended && showRecommended && (
                              <Badge variant="secondary" className="bg-pink-100 text-pink-700 text-xs">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{line.description}</p>
                          <p className="text-xs text-muted-foreground">Available: {line.available}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="text-xs">
                          <Phone className="h-3 w-3 mr-1" />
                          {line.phone}
                        </Button>
                        {line.website && (
                          <Button size="sm" variant="outline" className="text-xs" asChild>
                            <a href={line.website} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Website
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        <div className="text-xs text-muted-foreground mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="font-medium mb-1">Emergency Services</p>
          <p>If you or someone else is in immediate danger, call <strong>999</strong> for emergency services.</p>
        </div>
      </CardContent>
    </Card>
  );
}