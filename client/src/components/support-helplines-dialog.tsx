import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, Phone, Globe, Clock } from "lucide-react";

interface SupportHelpLinesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Helpline {
  name: string;
  description: string;
  phone?: string;
  website?: string;
  hours?: string;
  tags?: string[]; // Tags to match against analysis results
}

interface HelplineCategory {
  title: string;
  description: string;
  helplines: Helpline[];
}

const SupportHelpLinesDialog: React.FC<SupportHelpLinesDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [relevantTags, setRelevantTags] = useState<string[]>([]);

  // Extract relevant tags from the last analysis result
  useEffect(() => {
    try {
      const savedAnalysis = localStorage.getItem('lastAnalysisResult');
      if (savedAnalysis) {
        const analysisData = JSON.parse(savedAnalysis);
        console.log('Analysis data for helplines:', analysisData);
        
        const extractedTags: string[] = [];
        
        // Extract tone tags
        if (analysisData.toneAnalysis?.overallTone) {
          const toneWords = analysisData.toneAnalysis.overallTone.toLowerCase().split(/\s+/);
          extractedTags.push(...toneWords);
          
          // Add common implicit tags based on tone
          const tone = analysisData.toneAnalysis.overallTone.toLowerCase();
          if (tone.includes('hostile') || tone.includes('aggressive')) {
            extractedTags.push('conflict', 'relationship');
          }
          if (tone.includes('defensive')) {
            extractedTags.push('communication');
          }
          if (tone.includes('anxious') || tone.includes('stress')) {
            extractedTags.push('anxiety', 'mental');
          }
          if (tone.includes('depressed') || tone.includes('sad')) {
            extractedTags.push('depression', 'mental');
          }
          if (tone.includes('control') || tone.includes('manipulative')) {
            extractedTags.push('controlling', 'domestic');
          }
        }
        
        // Extract from red flags
        if (analysisData.redFlags && analysisData.redFlags.length > 0) {
          console.log('Red flags for helplines:', analysisData.redFlags);
          analysisData.redFlags.forEach((flag: any) => {
            if (flag.type) extractedTags.push(flag.type.toLowerCase());
            if (flag.description) {
              const descWords = flag.description.toLowerCase().split(/\s+/);
              extractedTags.push(...descWords);
              
              // Add implicit tags based on flag descriptions
              const desc = flag.description.toLowerCase();
              if (desc.includes('control') || desc.includes('manipulat')) {
                extractedTags.push('controlling', 'domestic', 'abuse');
              }
              if (desc.includes('threat') || desc.includes('harm')) {
                extractedTags.push('violence', 'crisis');
              }
              if (desc.includes('blame') || desc.includes('gaslighting')) {
                extractedTags.push('abuse', 'domestic');
              }
            }
          });
        }
        
        // Extract from communication patterns
        if (analysisData.communication?.patterns) {
          console.log('Communication patterns for helplines:', analysisData.communication.patterns);
          analysisData.communication.patterns.forEach((pattern: string) => {
            const patternWords = pattern.toLowerCase().split(/\s+/);
            extractedTags.push(...patternWords);
            
            // Add implicit tags based on patterns
            const patternLower = pattern.toLowerCase();
            if (patternLower.includes('conflict') || patternLower.includes('argue')) {
              extractedTags.push('relationships', 'communication');
            }
            if (patternLower.includes('withdraw') || patternLower.includes('avoid')) {
              extractedTags.push('communication');
            }
          });
        }
        
        // Extract from tension contributions if available
        if (analysisData.tensionContributions) {
          for (const participant in analysisData.tensionContributions) {
            const contributions = analysisData.tensionContributions[participant];
            if (Array.isArray(contributions)) {
              contributions.forEach((contribution: string) => {
                extractedTags.push(...contribution.toLowerCase().split(/\s+/));
              });
            }
          }
        }
        
        // Filter to relevant keywords - expanded list
        const significantTags = [
          'abuse', 'suicidal', 'self-harm', 'violence', 'crisis', 
          'depression', 'anxiety', 'mental', 'addiction', 'substance', 'alcohol', 'drug', 
          'gambling', 'debt', 'financial', 'domestic', 'sexual', 'trauma', 'manipulative',
          'controlling', 'isolated', 'lonely', 'hopeless', 'bullying', 'harassment',
          'relationships', 'family', 'communication', 'conflict', 'parent', 'child',
          'anger', 'hostility', 'threat', 'divorce', 'separation'
        ];
        
        const relevantMatches = significantTags.filter(tag => 
          extractedTags.some(extracted => extracted.includes(tag) || tag.includes(extracted))
        );
        
        console.log('Extracted tags:', extractedTags);
        console.log('Relevant matches:', relevantMatches);
        
        setRelevantTags(relevantMatches);
      }
    } catch (error) {
      console.error('Error extracting tags from analysis:', error);
    }
  }, [open]);

  const isRecommended = (helpline: Helpline) => {
    if (!helpline.tags || relevantTags.length === 0) return false;
    
    // Check for matches between helpline tags and relevant tags from analysis
    const hasMatch = helpline.tags.some(tag => 
      relevantTags.some(relevant => 
        tag.toLowerCase().includes(relevant) || relevant.includes(tag.toLowerCase())
      )
    );
    
    console.log(`Helpline: ${helpline.name}, Tags: ${helpline.tags?.join(', ')}, Recommended: ${hasMatch}`);
    return hasMatch;
  };

  const helplineCategories: HelplineCategory[] = [
    {
      title: "Crisis Support",
      description: "Immediate help for those in crisis or experiencing suicidal thoughts",
      helplines: [
        {
          name: "Samaritans",
          description: "24/7 support for anyone in emotional distress, struggling to cope, or at risk of suicide.",
          phone: "116 123",
          website: "https://www.samaritans.org/",
          hours: "24/7",
          tags: ["crisis", "suicide", "emotional distress", "self-harm", "depression"]
        },
        {
          name: "SHOUT",
          description: "Text message support service for anyone struggling with mental health issues.",
          phone: "Text SHOUT to 85258",
          website: "https://giveusashout.org/",
          hours: "24/7",
          tags: ["crisis", "anxiety", "depression", "suicidal", "isolation", "bullying"]
        },
        {
          name: "Papyrus HOPELINEUK",
          description: "Support and advice for young people thinking about suicide and anyone concerned about a young person.",
          phone: "0800 068 4141",
          website: "https://www.papyrus-uk.org/",
          hours: "9am to midnight, every day",
          tags: ["suicide", "young people", "self-harm", "hopeless"]
        }
      ]
    },
    {
      title: "Mental Health Support",
      description: "Help for those experiencing mental health issues",
      helplines: [
        {
          name: "Mind",
          description: "Advice and support for anyone experiencing a mental health problem.",
          phone: "0300 123 3393",
          website: "https://www.mind.org.uk/",
          hours: "9am to 6pm, Monday to Friday",
          tags: ["mental health", "anxiety", "depression", "therapy", "support groups"]
        },
        {
          name: "Rethink Mental Illness",
          description: "Support and advice for people living with mental illness.",
          phone: "0808 801 0525",
          website: "https://www.rethink.org/",
          hours: "9:30am to 4pm, Monday to Friday",
          tags: ["severe mental illness", "schizophrenia", "bipolar", "community support"]
        },
        {
          name: "CALM (Campaign Against Living Miserably)",
          description: "Support for men in the UK, of any age, who are down or in crisis.",
          phone: "0800 58 58 58",
          website: "https://www.thecalmzone.net/",
          hours: "5pm to midnight, everyday",
          tags: ["men", "suicide", "depression", "crisis", "isolation"]
        }
      ]
    },
    {
      title: "Domestic Abuse Support",
      description: "Help for those experiencing abuse or violence in relationships",
      helplines: [
        {
          name: "National Domestic Abuse Helpline",
          description: "Support for women experiencing domestic abuse, their family, friends, and others calling on their behalf.",
          phone: "0808 2000 247",
          website: "https://www.nationaldahelpline.org.uk/",
          hours: "24/7",
          tags: ["domestic abuse", "violence", "controlling", "women", "relationships"]
        },
        {
          name: "Men's Advice Line",
          description: "Support for men experiencing domestic abuse from a partner, ex-partner, or family member.",
          phone: "0808 801 0327",
          website: "https://mensadviceline.org.uk/",
          hours: "Monday to Friday, 9am to 8pm",
          tags: ["men", "domestic abuse", "relationships", "violence", "controlling"]
        },
        {
          name: "Galop",
          description: "Support for LGBT+ people experiencing domestic abuse.",
          phone: "0800 999 5428",
          website: "https://galop.org.uk/",
          hours: "Monday to Friday, 10am to 4pm",
          tags: ["lgbt", "domestic abuse", "hate crime", "violence", "relationships"]
        }
      ]
    },
    {
      title: "Substance Abuse & Addiction",
      description: "Support for those dealing with alcohol, drug, or other addictions",
      helplines: [
        {
          name: "Talk to FRANK",
          description: "Friendly, confidential advice about drugs and substance misuse.",
          phone: "0300 1236600",
          website: "https://www.talktofrank.com/",
          hours: "24/7",
          tags: ["drugs", "substance abuse", "addiction", "harm reduction"]
        },
        {
          name: "Drinkline",
          description: "National alcohol helpline offering support and advice.",
          phone: "0300 123 1110",
          website: "https://www.drinkaware.co.uk/",
          hours: "Weekdays 9am to 8pm, weekends 11am to 4pm",
          tags: ["alcohol", "addiction", "dependency", "drinking problems"]
        },
        {
          name: "GamCare",
          description: "Support for problem gambling and those affected by someone else's gambling.",
          phone: "0808 8020 133",
          website: "https://www.gamcare.org.uk/",
          hours: "24/7",
          tags: ["gambling", "addiction", "debt", "financial problems"]
        }
      ]
    },
    {
      title: "Relationship Support",
      description: "Help for relationship difficulties and communication problems",
      helplines: [
        {
          name: "Relate",
          description: "Relationship counselling and support services.",
          phone: "0300 003 0396",
          website: "https://www.relate.org.uk/",
          hours: "Monday to Thursday 8am to 8pm, Friday 8am to 6pm",
          tags: ["relationships", "couples counselling", "family therapy", "communication", "conflict"]
        },
        {
          name: "Family Lives",
          description: "Support for family issues, parenting, and relationship difficulties.",
          phone: "0808 800 2222",
          website: "https://www.familylives.org.uk/",
          hours: "Monday to Friday 9am to 9pm, weekends 10am to 3pm",
          tags: ["family", "parenting", "children", "teenagers", "relationships", "conflict"]
        },
        {
          name: "Separated Parents Information Programme",
          description: "Support for separated parents to focus on children's needs.",
          website: "https://www.cafcass.gov.uk/grown-ups/parents-and-carers/directory-of-providers/programmes/separated-parents-information-programme/",
          tags: ["co-parenting", "separation", "divorce", "children", "conflict"]
        },
        {
          name: "OnePlusOne",
          description: "Helps couples deal with relationship difficulties and strengthen family life.",
          website: "https://www.oneplusone.org.uk/",
          tags: ["relationships", "couples", "family", "communication", "conflict"]
        }
      ]
    },
    {
      title: "Parenting Support",
      description: "Resources for parenting challenges and co-parenting after separation",
      helplines: [
        {
          name: "NSPCC",
          description: "Advice and support for parents and anyone concerned about a child.",
          phone: "0808 800 5000",
          website: "https://www.nspcc.org.uk/",
          hours: "Monday to Friday 8am to 10pm, weekends 9am to 6pm",
          tags: ["parenting", "children", "abuse", "child protection"]
        },
        {
          name: "Young Minds Parents Helpline",
          description: "Support for parents worried about a child's mental health.",
          phone: "0808 802 5544",
          website: "https://www.youngminds.org.uk/",
          hours: "Monday to Friday 9:30am to 4pm",
          tags: ["children", "teenagers", "mental health", "parenting"]
        },
        {
          name: "Gingerbread",
          description: "Support for single parent families.",
          phone: "0808 802 0925",
          website: "https://www.gingerbread.org.uk/",
          hours: "Monday, Thursday 10am to 6pm, Tuesday, Wednesday, Friday 10am to 4pm",
          tags: ["single parents", "parenting", "separation", "divorce"]
        },
        {
          name: "Family Mediation Council",
          description: "Find mediators to help resolve family disputes without court.",
          website: "https://www.familymediationcouncil.org.uk/",
          tags: ["family", "mediation", "divorce", "separation", "co-parenting", "conflict"]
        }
      ]
    },
    {
      title: "General Emotional Support",
      description: "Help for those feeling overwhelmed or needing someone to talk to",
      helplines: [
        {
          name: "Samaritans",
          description: "Confidential emotional support for anyone in distress or despair.",
          phone: "116 123",
          website: "https://www.samaritans.org/",
          hours: "24/7",
          tags: ["emotional support", "listening", "distress", "crisis", "depression"]
        },
        {
          name: "Mind",
          description: "Advice and support for anyone experiencing mental health problems.",
          phone: "0300 123 3393",
          website: "https://www.mind.org.uk/",
          hours: "Monday to Friday 9am to 6pm",
          tags: ["mental health", "anxiety", "depression", "emotional support"]
        },
        {
          name: "The Mix",
          description: "Support for young people under 25 with any challenge they're facing.",
          phone: "0808 808 4994",
          website: "https://www.themix.org.uk/",
          hours: "7 days a week, 3pm to 12am",
          tags: ["young people", "relationships", "mental health", "emotional support"]
        }
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-2xl font-bold text-primary">Support Helplines</DialogTitle>
          <DialogDescription>
            UK-based support services available for various issues
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 pb-6 h-[70vh]">
          {relevantTags.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
              <h3 className="font-medium text-green-700 mb-2">Personalized Recommendations</h3>
              <div className="text-sm text-green-800">
                <p className="mb-2">Based on your conversation analysis, we've highlighted resources that may be particularly helpful for you.</p>
                <div className="flex items-center">
                  Look for the <Badge className="bg-green-100 text-green-800 mx-2">Recommended</Badge> badge next to specific helplines.
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 mb-6">
            {helplineCategories.map((category, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="bg-primary/10 pb-2">
                  <CardTitle className="text-lg font-semibold">{category.title}</CardTitle>
                  <CardDescription className="text-xs">{category.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {category.helplines.map((helpline, j) => (
                    <div key={j} className="mb-4 last:mb-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-medium">{helpline.name}</div>
                        {isRecommended(helpline) && (
                          <Badge className="bg-green-100 text-green-800">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{helpline.description}</p>
                      <div className="flex flex-col gap-1 text-sm">
                        {helpline.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <span>{helpline.phone}</span>
                          </div>
                        )}
                        {helpline.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            <a href={helpline.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              Website
                            </a>
                          </div>
                        )}
                        {helpline.hours && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>{helpline.hours}</span>
                          </div>
                        )}
                      </div>
                      {j < category.helplines.length - 1 && <Separator className="my-3" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-6">
            <h3 className="font-medium text-blue-700 mb-2">Important Note</h3>
            <p className="text-sm text-blue-800">
              If you or someone you know is in immediate danger, please call emergency services on <strong>999</strong>. 
              This information is provided for reference purposes only and should not be considered a substitute for 
              professional medical or psychological advice.
            </p>
          </div>
        </ScrollArea>
        
        <DialogFooter className="px-6 py-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupportHelpLinesDialog;