import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import BackHomeButton from "@/components/back-home-button";
import { Link } from 'wouter';

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
}

const SupportHelplines = () => {
  const categories: HelplineCategory[] = [
    {
      title: "Crisis & Emotional Support",
      description: "Immediate support for those in emotional distress or crisis",
      helplines: [
        {
          name: "National Suicide Prevention Lifeline",
          description: "Free and confidential support for people in distress, prevention and crisis resources.",
          phone: "1-800-273-8255",
          website: "https://suicidepreventionlifeline.org",
          hours: "24/7"
        },
        {
          name: "Crisis Text Line",
          description: "Free crisis support via text message.",
          phone: "Text HOME to 741741",
          website: "https://www.crisistextline.org",
          hours: "24/7"
        },
        {
          name: "SAMHSA's National Helpline",
          description: "Treatment referral and information service for individuals facing mental health or substance use disorders.",
          phone: "1-800-662-4357",
          website: "https://www.samhsa.gov/find-help/national-helpline",
          hours: "24/7"
        }
      ]
    },
    {
      title: "Domestic Violence & Relationship Abuse",
      description: "Support for those experiencing abuse in relationships",
      helplines: [
        {
          name: "National Domestic Violence Hotline",
          description: "Support, crisis intervention, and referral service for those experiencing domestic violence.",
          phone: "1-800-799-7233",
          website: "https://www.thehotline.org",
          hours: "24/7"
        },
        {
          name: "Love Is Respect",
          description: "National resource to disrupt and prevent unhealthy relationships and intimate partner violence.",
          phone: "Text LOVEIS to 22522 or call 1-866-331-9474",
          website: "https://www.loveisrespect.org",
          hours: "24/7"
        }
      ]
    },
    {
      title: "LGBTQ+ Support Services",
      description: "Support specifically for LGBTQ+ individuals",
      helplines: [
        {
          name: "The Trevor Project",
          description: "Crisis intervention and suicide prevention for LGBTQ young people.",
          phone: "1-866-488-7386",
          website: "https://www.thetrevorproject.org",
          hours: "24/7"
        },
        {
          name: "LGBT National Help Center",
          description: "Peer-support, community connections and resource information.",
          phone: "1-888-843-4564",
          website: "https://www.glbthotline.org",
          hours: "Varies by service"
        }
      ]
    },
    {
      title: "Counseling & Mental Health Resources",
      description: "Professional therapy and counseling services",
      helplines: [
        {
          name: "Psychology Today Therapist Finder",
          description: "Find a therapist in your area with specific specialties.",
          website: "https://www.psychologytoday.com/us/therapists",
        },
        {
          name: "BetterHelp",
          description: "Online counseling platform with licensed therapists.",
          website: "https://www.betterhelp.com",
        },
        {
          name: "Talkspace",
          description: "Text, audio, and video-based therapy with licensed professionals.",
          website: "https://www.talkspace.com",
        }
      ]
    },
    {
      title: "International Resources",
      description: "Support services available outside the United States",
      helplines: [
        {
          name: "International Association for Suicide Prevention",
          description: "Directory of crisis centers around the world.",
          website: "https://www.iasp.info/resources/Crisis_Centres/",
        },
        {
          name: "Befrienders Worldwide",
          description: "Providing emotional support to prevent suicide worldwide.",
          website: "https://www.befrienders.org",
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Support Helplines</h1>
        <BackHomeButton />
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
            Remember: If you're in immediate danger, please call emergency services (911 in the US) right away.
          </p>
          
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
                <h3 className="font-semibold text-lg mb-1">{helpline.name}</h3>
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
        <p>If you need to return to your analysis, you can <Link href="/" className="text-primary hover:underline">go back to the home page</Link>.</p>
      </div>
    </div>
  );
};

export default SupportHelplines;