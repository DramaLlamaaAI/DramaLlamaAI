import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface HelplineCategory {
  title: string;
  description: string;
  helplines: Helpline[];
}

interface Helpline {
  name: string;
  description: string;
  phone?: string;
  website?: string;
  hours?: string;
  tags?: string[]; // Tags to match against analysis results
}

const SupportHelplines = () => {
  const [location] = useLocation();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [relevantTags, setRelevantTags] = useState<string[]>([]);
  
  // Try to get last analysis from localStorage
  useEffect(() => {
    try {
      const lastAnalysis = localStorage.getItem('lastAnalysisResult');
      if (lastAnalysis) {
        const parsed = JSON.parse(lastAnalysis);
        setAnalysisData(parsed);
        
        // Extract relevant tags based on analysis
        const tags: string[] = [];
        
        // Check for overall tone
        const overallTone = parsed?.toneAnalysis?.overallTone?.toLowerCase() || '';
        if (overallTone.includes('hostile') || overallTone.includes('abusive')) {
          tags.push('abuse', 'crisis');
        }
        if (overallTone.includes('anxiety') || overallTone.includes('stress')) {
          tags.push('anxiety', 'mental-health');
        }
        if (overallTone.includes('depression') || overallTone.includes('sad')) {
          tags.push('depression', 'mental-health');
        }
        
        // Check red flags
        const redFlags = parsed?.redFlags || [];
        redFlags.forEach((flag: any) => {
          const flagType = flag.type?.toLowerCase() || '';
          const flagDesc = flag.description?.toLowerCase() || '';
          
          if (flagType.includes('abuse') || flagDesc.includes('abuse')) {
            tags.push('abuse', 'domestic-violence');
          }
          if (flagType.includes('self-harm') || flagDesc.includes('self-harm')) {
            tags.push('crisis', 'suicide');
          }
          if (flagType.includes('manipulation') || flagDesc.includes('manipulation')) {
            tags.push('coercive-control', 'abuse');
          }
        });
        
        // Health score
        const healthScore = parsed?.healthScore?.score || 0;
        if (healthScore < 30) {
          tags.push('crisis', 'urgent');
        } else if (healthScore < 50) {
          tags.push('mental-health', 'relationship-counseling');
        }
        
        // Filter unique tags
        const uniqueTags: string[] = [];
        tags.forEach(tag => {
          if (!uniqueTags.includes(tag)) {
            uniqueTags.push(tag);
          }
        });
        setRelevantTags(uniqueTags);
      }
    } catch (error) {
      console.error('Error parsing last analysis:', error);
    }
  }, [location]);
  
  // Function to check if a helpline is recommended based on analysis
  const isRecommended = (helpline: Helpline) => {
    if (!helpline.tags || !relevantTags.length) return false;
    return helpline.tags.some(tag => relevantTags.includes(tag));
  };
  
  const categories: HelplineCategory[] = [
    {
      title: "Crisis & Emotional Support",
      description: "Immediate support for those in emotional distress or crisis",
      helplines: [
        {
          name: "Samaritans",
          description: "Confidential emotional support for anyone in distress or despair.",
          phone: "116 123",
          website: "https://www.samaritans.org",
          hours: "24/7",
          tags: ["crisis", "suicide", "depression", "anxiety", "mental-health", "urgent"]
        },
        {
          name: "Shout",
          description: "Free, confidential, 24/7 text messaging support service for anyone struggling to cope.",
          phone: "Text SHOUT to 85258",
          website: "https://giveusashout.org",
          hours: "24/7",
          tags: ["crisis", "anxiety", "depression", "mental-health", "urgent"]
        },
        {
          name: "Mind",
          description: "Information and advice about mental health problems, support and advocacy.",
          phone: "0300 123 3393",
          website: "https://www.mind.org.uk",
          hours: "Monday to Friday, 9am to 6pm",
          tags: ["mental-health", "anxiety", "depression"]
        }
      ]
    },
    {
      title: "Domestic Violence & Relationship Abuse",
      description: "Support for those experiencing abuse in relationships",
      helplines: [
        {
          name: "National Domestic Abuse Helpline",
          description: "Support, crisis intervention, and referral service for those experiencing domestic abuse.",
          phone: "0808 2000 247",
          website: "https://www.nationaldahelpline.org.uk",
          hours: "24/7",
          tags: ["abuse", "domestic-violence", "coercive-control", "urgent"]
        },
        {
          name: "Refuge",
          description: "Support and shelter for women and children experiencing domestic violence.",
          phone: "0808 2000 247",
          website: "https://www.refuge.org.uk",
          hours: "24/7",
          tags: ["abuse", "domestic-violence", "coercive-control", "women"]
        },
        {
          name: "Men's Advice Line",
          description: "Support for men experiencing domestic abuse.",
          phone: "0808 8010 327",
          website: "https://mensadviceline.org.uk",
          hours: "Monday to Friday, 9am to 8pm",
          tags: ["abuse", "domestic-violence", "men"]
        }
      ]
    },
    {
      title: "LGBTQ+ Support Services",
      description: "Support specifically for LGBTQ+ individuals",
      helplines: [
        {
          name: "Switchboard LGBT+ Helpline",
          description: "Information, support and referral service for LGBTQ+ people.",
          phone: "0300 330 0630",
          website: "https://switchboard.lgbt",
          hours: "10am to 10pm, 365 days a year"
        },
        {
          name: "LGBT Foundation",
          description: "Support for lesbian, gay, bisexual and trans people.",
          phone: "0345 3 30 30 30",
          website: "https://lgbt.foundation",
          hours: "Monday to Friday, 9am to 9pm"
        },
        {
          name: "Galop - LGBT+ Anti-Violence Charity",
          description: "Support for LGBTQ+ people experiencing hate crime, domestic abuse, or sexual violence.",
          phone: "0800 999 5428",
          website: "https://galop.org.uk",
          hours: "Varies by service"
        }
      ]
    },
    {
      title: "Counseling & Mental Health Resources",
      description: "Professional therapy and counseling services",
      helplines: [
        {
          name: "NHS Mental Health Services",
          description: "Find NHS mental health services in your area.",
          website: "https://www.nhs.uk/service-search/mental-health",
        },
        {
          name: "British Association for Counselling and Psychotherapy",
          description: "Find a registered therapist in the UK.",
          website: "https://www.bacp.co.uk/search/Therapists",
        },
        {
          name: "Counselling Directory",
          description: "Directory of UK counsellors and psychotherapists.",
          website: "https://www.counselling-directory.org.uk",
        }
      ]
    },
    {
      title: "Specialist Support Services",
      description: "Helplines for specific issues and demographics",
      helplines: [
        {
          name: "Childline",
          description: "Support service for children and young people under 19.",
          phone: "0800 1111",
          website: "https://www.childline.org.uk",
          hours: "24/7"
        },
        {
          name: "Campaign Against Living Miserably (CALM)",
          description: "Leading movement against suicide in men.",
          phone: "0800 58 58 58",
          website: "https://www.thecalmzone.net",
          hours: "5pm to midnight, 365 days a year"
        },
        {
          name: "Age UK",
          description: "Information, advice and support for older people.",
          phone: "0800 055 6112",
          website: "https://www.ageuk.org.uk",
          hours: "8am to 7pm, 365 days a year"
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Support Helplines</h1>
        <Button variant="outline" onClick={() => window.history.back()} className="flex items-center gap-2">
          <ArrowLeft size={16} />
          <span>Back to Analysis</span>
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Get Support When You Need It</CardTitle>
          <CardDescription>
            If you're experiencing emotional distress, relationship issues, or need someone to talk to, 
            these helplines and resources are available to provide support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Remember: If you're in immediate danger, please call emergency services (999 in the UK) right away.
          </p>
          
          {relevantTags.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
              <h3 className="font-medium text-green-700 mb-2">Personalized Recommendations</h3>
              <div className="text-sm text-green-800">
                <p className="mb-2">Based on your last conversation analysis, we've highlighted resources that may be particularly helpful for you.</p>
                <div className="flex items-center">
                  Look for the <Badge className="bg-green-100 text-green-800 mx-2">Recommended</Badge> badge next to specific helplines.
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 mb-6">
            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
              <h3 className="font-medium text-pink-700 mb-2">Privacy Note</h3>
              <p className="text-sm text-pink-800">
                Drama Llama does not store your conversations or share them with any third parties.
                The links below will take you to external resources where you can seek professional help.
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-700 mb-2">Disclaimer</h3>
              <p className="text-sm text-blue-800">
                Drama Llama is not a substitute for professional help. If you're in crisis or 
                experiencing serious issues, please reach out to a qualified professional.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {categories.map((category, idx) => (
        <Card key={idx} className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold">{category.title}</CardTitle>
            <CardDescription>{category.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {category.helplines.map((helpline, hdx) => (
              <div key={hdx} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{helpline.name}</h3>
                  {isRecommended(helpline) && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900">
                      Recommended
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{helpline.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {helpline.phone && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium mr-2">Phone:</span>
                      <a href={`tel:${helpline.phone.replace(/[^0-9]/g, '')}`} className="text-blue-600 hover:underline">
                        {helpline.phone}
                      </a>
                    </div>
                  )}
                  
                  {helpline.website && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium mr-2">Website:</span>
                      <a href={helpline.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Visit Website
                      </a>
                    </div>
                  )}
                  
                  {helpline.hours && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium mr-2">Hours:</span>
                      <span>{helpline.hours}</span>
                    </div>
                  )}
                </div>
                
                {hdx < category.helplines.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      
      <Card className="mb-8 bg-slate-50">
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            For more information about relationship communication, conflict resolution, and mental health,
            consider checking out these resources:
          </p>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <a 
                href="https://www.gottman.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                The Gottman Institute
              </a>
              <span className="text-sm block text-muted-foreground">
                Research-based relationship therapy and resources
              </span>
            </li>
            <li>
              <a 
                href="https://www.nimh.nih.gov/health" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                National Institute of Mental Health
              </a>
              <span className="text-sm block text-muted-foreground">
                Information on mental health conditions and research
              </span>
            </li>
            <li>
              <a 
                href="https://www.apa.org/topics/relationships" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                American Psychological Association
              </a>
              <span className="text-sm block text-muted-foreground">
                Articles and resources on healthy relationships
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
      
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>
          <Button variant="outline" onClick={() => window.history.back()} size="sm" className="mx-auto">
            <ArrowLeft size={14} className="mr-2" />
            Return to Analysis
          </Button>
        </p>
      </div>
    </div>
  );
};

export default SupportHelplines;