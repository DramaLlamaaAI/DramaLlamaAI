import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface RedFlagEntry {
  id: string;
  name: string;
  category: 'Emotional Manipulation' | 'Communication Control' | 'Relationship Dynamics' | 'Behavioral Patterns';
  definition: string;
  soundsLike: string[];
  whyItMatters: string;
  healthyAlternative: string;
  commonContext: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

const redFlagLibrary: RedFlagEntry[] = [
  {
    id: 'guilt-tripping',
    name: 'Guilt Tripping',
    category: 'Emotional Manipulation',
    definition: 'Using guilt to influence or control another person\'s choices.',
    soundsLike: [
      '"After all I\'ve done for you, this is how you treat me?"',
      '"I guess I\'m just not important to you anymore."',
      '"Fine, I\'ll just do everything myself like always."'
    ],
    whyItMatters: 'It shifts blame unfairly and creates emotional pressure.',
    healthyAlternative: '"I feel hurt because I put a lot into this and felt unseen."',
    commonContext: 'Arises during conflict or when someone wants their way.',
    severity: 'Medium'
  },
  {
    id: 'gaslighting',
    name: 'Gaslighting',
    category: 'Emotional Manipulation',
    definition: 'Making someone question their own memory, perception, or judgment.',
    soundsLike: [
      '"That never happened, you\'re imagining things."',
      '"You\'re being too sensitive."',
      '"I never said that, you\'re crazy."'
    ],
    whyItMatters: 'It undermines confidence and creates self-doubt.',
    healthyAlternative: '"I remember it differently. Let\'s talk about what happened."',
    commonContext: 'When accountability is avoided or during disagreements.',
    severity: 'Critical'
  },
  {
    id: 'stonewalling',
    name: 'Stonewalling',
    category: 'Communication Control',
    definition: 'Refusing to communicate or engage in discussion.',
    soundsLike: [
      'Complete silence during important conversations',
      '"I\'m not talking about this."',
      'Leaving the room without explanation'
    ],
    whyItMatters: 'It prevents resolution and creates emotional distance.',
    healthyAlternative: '"I need a break to process this. Can we talk in an hour?"',
    commonContext: 'During heated arguments or when feeling overwhelmed.',
    severity: 'High'
  },
  {
    id: 'dismissive-language',
    name: 'Dismissive Language',
    category: 'Communication Control',
    definition: 'Minimizing or invalidating another person\'s feelings or concerns.',
    soundsLike: [
      '"You\'re overreacting."',
      '"That\'s not a big deal."',
      '"Whatever, I don\'t care."'
    ],
    whyItMatters: 'It shuts down communication and invalidates emotions.',
    healthyAlternative: '"I can see this is important to you. Help me understand."',
    commonContext: 'When someone feels defensive or wants to avoid discussion.',
    severity: 'Medium'
  },
  {
    id: 'personal-attacks',
    name: 'Personal Attacks',
    category: 'Behavioral Patterns',
    definition: 'Attacking character rather than addressing the specific issue.',
    soundsLike: [
      '"You always do this."',
      '"You\'re such a [negative label]."',
      '"You never listen to me."'
    ],
    whyItMatters: 'It damages self-esteem and escalates conflict.',
    healthyAlternative: '"When you do X, I feel Y because Z."',
    commonContext: 'During arguments when emotions run high.',
    severity: 'High'
  },
  {
    id: 'love-bombing',
    name: 'Love Bombing',
    category: 'Relationship Dynamics',
    definition: 'Overwhelming someone with excessive affection to gain control.',
    soundsLike: [
      'Excessive compliments and gifts early in relationship',
      '"You\'re perfect, I\'ve never felt this way."',
      'Constant contact and attention'
    ],
    whyItMatters: 'It creates unhealthy dependency and can mask controlling behavior.',
    healthyAlternative: 'Gradual, consistent affection that respects boundaries.',
    commonContext: 'Early stages of relationships or after conflicts.',
    severity: 'High'
  },
  {
    id: 'triangulation',
    name: 'Triangulation',
    category: 'Relationship Dynamics',
    definition: 'Bringing a third party into a two-person conflict.',
    soundsLike: [
      '"Even [person] thinks you\'re wrong."',
      '"I was talking to [person] about us..."',
      'Comparing you unfavorably to others'
    ],
    whyItMatters: 'It avoids direct communication and creates insecurity.',
    healthyAlternative: '"Let\'s work this out between us without involving others."',
    commonContext: 'When direct resolution feels difficult or threatening.',
    severity: 'Medium'
  },
  {
    id: 'emotional-blackmail',
    name: 'Emotional Blackmail',
    category: 'Emotional Manipulation',
    definition: 'Using fear, obligation, or guilt to control behavior.',
    soundsLike: [
      '"If you loved me, you would..."',
      '"I\'ll hurt myself if you leave."',
      '"After everything I\'ve sacrificed for you..."'
    ],
    whyItMatters: 'It removes free choice and creates toxic obligation.',
    healthyAlternative: '"I\'d really appreciate it if you could help me with this."',
    commonContext: 'When someone wants compliance or fears abandonment.',
    severity: 'Critical'
  }
];

interface RedFlagLibraryProps {
  trigger?: React.ReactNode;
  highlightFlag?: string;
}

export function RedFlagLibrary({ trigger, highlightFlag }: RedFlagLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFlag, setSelectedFlag] = useState<RedFlagEntry | null>(null);
  const { user } = useAuth();

  const categories = ['All', 'Emotional Manipulation', 'Communication Control', 'Relationship Dynamics', 'Behavioral Patterns'];

  const filteredFlags = redFlagLibrary.filter(flag => {
    const matchesSearch = flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flag.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || flag.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const RedFlagCard = ({ flag }: { flag: RedFlagEntry }) => (
    <div 
      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
        highlightFlag === flag.id ? 'ring-2 ring-pink-500 bg-pink-50' : 'hover:border-pink-300'
      }`}
      onClick={() => setSelectedFlag(flag)}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg">{flag.name}</h3>
        <Badge className={getSeverityColor(flag.severity)}>
          {flag.severity}
        </Badge>
      </div>
      <p className="text-sm text-gray-600 mb-2">{flag.definition}</p>
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {flag.category}
        </Badge>
        <ExternalLink size={16} className="text-gray-400" />
      </div>
    </div>
  );

  const RedFlagDetail = ({ flag }: { flag: RedFlagEntry }) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{flag.name}</h2>
          <Badge className={getSeverityColor(flag.severity)}>
            {flag.severity} Severity
          </Badge>
        </div>
        <Button variant="outline" onClick={() => setSelectedFlag(null)}>
          Back to Library
        </Button>
      </div>

      <div className="grid gap-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Definition</h3>
          <p className="text-blue-700">{flag.definition}</p>
        </div>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <h3 className="font-semibold text-red-800 mb-2">What it sounds like</h3>
          <ul className="space-y-1">
            {flag.soundsLike.map((example, index) => (
              <li key={index} className="text-red-700 italic">"{example}"</li>
            ))}
          </ul>
        </div>

        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h3 className="font-semibold text-orange-800 mb-2">Why it matters</h3>
          <p className="text-orange-700">{flag.whyItMatters}</p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">What's healthy instead</h3>
          <p className="text-green-700 italic">"{flag.healthyAlternative}"</p>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-2">Common context</h3>
          <p className="text-purple-700">{flag.commonContext}</p>
        </div>

        {!user && (
          <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-pink-600" size={20} />
              <h3 className="font-semibold text-pink-800">Want to detect this in your chats?</h3>
            </div>
            <p className="text-pink-700 mb-3">
              Register for free to scan your conversations and see if this red flag appears in your communication patterns.
            </p>
            <Button className="bg-pink-600 hover:bg-pink-700 text-white">
              Register Now - It's Free!
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const defaultTrigger = (
    <Button variant="outline" className="flex items-center gap-2">
      <span className="text-red-500">🟥</span>
      Red Flag Library
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-red-500">🟥</span>
            Red Flag Library
          </DialogTitle>
        </DialogHeader>

        {selectedFlag ? (
          <RedFlagDetail flag={selectedFlag} />
        ) : (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search red flags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Red Flag Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {filteredFlags.map(flag => (
                <RedFlagCard key={flag.id} flag={flag} />
              ))}
            </div>

            {filteredFlags.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No red flags found matching your search.
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t text-center text-sm text-gray-600">
              <p>Understanding red flags can help improve communication patterns and relationship health.</p>
              {!user && (
                <p className="mt-2 text-pink-600 font-medium">
                  Register to scan your conversations and detect these patterns automatically!
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Utility function to get a learn more link for a specific red flag
export function LearnMoreLink({ flagType }: { flagType: string }) {
  const normalizedType = flagType.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <RedFlagLibrary 
      highlightFlag={normalizedType}
      trigger={
        <Button variant="link" size="sm" className="h-auto p-0 text-pink-600 hover:text-pink-800">
          Learn more about this red flag
        </Button>
      }
    />
  );
}