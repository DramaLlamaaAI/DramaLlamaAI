import React from 'react';
import { Lock, TrendingUp, Eye, Heart, MessageSquare, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LockedPreviewSectionsProps {
  userTier: string;
  onUpgrade?: () => void;
}

interface LockedSection {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  availableFrom: string;
  features: string[];
}

const TIER_HIERARCHY = ['free', 'personal', 'pro', 'instant'];

const LOCKED_SECTIONS: LockedSection[] = [
  {
    title: 'Detailed Red Flag Analysis',
    description: 'Identify specific warning signs and unhealthy communication patterns',
    icon: Eye,
    availableFrom: 'personal',
    features: [
      'Manipulation tactics detected',
      'Emotional abuse indicators',
      'Gaslighting patterns',
      'Control behavior analysis'
    ]
  },
  {
    title: 'Deep Communication Insights',
    description: 'Uncover hidden meaning and recurring patterns in conversations',
    icon: MessageSquare,
    availableFrom: 'personal',
    features: [
      'Power dynamic breakdown',
      'Speaking pattern analysis',
      'Conversation flow mapping',
      'Personalized improvement tips'
    ]
  },
  {
    title: 'Advanced Conflict Dynamics',
    description: 'Deep analysis of how conflicts develop and escalate in relationships',
    icon: TrendingUp,
    availableFrom: 'pro',
    features: [
      'Conflict escalation patterns',
      'De-escalation opportunities',
      'Power struggle indicators',
      'Resolution pathway suggestions'
    ]
  },
  {
    title: 'Relationship Trajectory Analysis',
    description: 'Understand where your relationship is heading based on communication patterns',
    icon: Heart,
    availableFrom: 'pro',
    features: [
      'Relationship health trends',
      'Compatibility indicators',
      'Growth vs. decline patterns',
      'Long-term outlook predictions'
    ]
  },
  {
    title: 'Expert Recommendations & Action Plans',
    description: 'Professional-grade guidance with personalized action steps',
    icon: Crown,
    availableFrom: 'instant',
    features: [
      'Therapist-level insights',
      'Step-by-step action plans',
      'Crisis intervention guidance',
      'Personalized communication scripts'
    ]
  }
];

export default function LockedPreviewSections({ userTier, onUpgrade }: LockedPreviewSectionsProps) {
  const currentTierIndex = TIER_HIERARCHY.indexOf(userTier);
  
  const getLockedSections = () => {
    return LOCKED_SECTIONS.filter(section => {
      const sectionTierIndex = TIER_HIERARCHY.indexOf(section.availableFrom);
      return sectionTierIndex > currentTierIndex;
    });
  };

  const getTierDisplayName = (tier: string) => {
    switch (tier) {
      case 'personal': return 'Personal';
      case 'pro': return 'Pro';
      case 'instant': return 'Instant Deep Dive';
      default: return tier;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'personal': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pro': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'instant': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const lockedSections = getLockedSections();

  if (lockedSections.length === 0) {
    return null; // User has access to all features
  }

  return (
    <div className="space-y-4">
      {lockedSections.map((section, index) => (
        <div key={index} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 relative overflow-hidden">
          {/* Overlay for locked effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50/90 to-gray-100/90 z-10"></div>
          
          {/* Lock icon overlay */}
          <div className="absolute top-4 right-4 z-20">
            <div className="bg-white rounded-full p-2 shadow-md">
              <Lock className="h-4 w-4 text-gray-500" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-0">
            <div className="flex items-center mb-4">
              <section.icon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-500">{section.title}</h3>
              <div className={`ml-auto px-2 py-1 rounded text-xs font-medium border ${getTierColor(section.availableFrom)}`}>
                {getTierDisplayName(section.availableFrom)}+
              </div>
            </div>
            
            <p className="text-gray-500 mb-4">{section.description}</p>
            
            <div className="space-y-2 mb-4">
              {section.features.map((feature, featureIndex) => (
                <div key={featureIndex} className="flex items-center text-sm text-gray-400">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2"></div>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade prompt overlay */}
          <div className="absolute inset-0 z-30 flex items-center justify-center">
            <div className="text-center">
              <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600 mb-3">
                Upgrade to {getTierDisplayName(section.availableFrom)} to unlock
              </p>
              {onUpgrade && (
                <Button 
                  onClick={onUpgrade}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  Upgrade Now
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {/* Overall upgrade prompt */}
      {lockedSections.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
          <div className="text-center">
            <Crown className="h-8 w-8 text-purple-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              Unlock Advanced Analysis Features
            </h3>
            <p className="text-purple-700 mb-4">
              You're missing out on {lockedSections.length} advanced analysis features. 
              Upgrade to get deeper insights into your conversations.
            </p>
            {onUpgrade && (
              <Button 
                onClick={onUpgrade}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8"
              >
                View Upgrade Options
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}