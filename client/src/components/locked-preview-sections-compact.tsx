import React from 'react';
import { Lock, TrendingUp, Eye, MessageSquare, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LockedPreviewSectionsProps {
  userTier: string;
  onUpgrade?: () => void;
}

const TIER_HIERARCHY = ['free', 'personal', 'pro', 'instant'];

export default function LockedPreviewSections({ userTier, onUpgrade }: LockedPreviewSectionsProps) {
  const currentTierIndex = TIER_HIERARCHY.indexOf(userTier);
  
  // Define upgrade sections based on current tier
  const getUpgradeSections = () => {
    const sections = [];
    
    // Personal tier features (for free users)
    if (currentTierIndex < TIER_HIERARCHY.indexOf('personal')) {
      sections.push({
        tier: 'Personal',
        features: ['Detailed Red Flag Analysis', 'Deep Communication Insights'],
        color: 'bg-blue-50 border-blue-200',
        buttonColor: 'bg-blue-500 hover:bg-blue-600'
      });
    }
    
    // Pro tier features (for free/personal users)
    if (currentTierIndex < TIER_HIERARCHY.indexOf('pro')) {
      sections.push({
        tier: 'Pro',
        features: ['Advanced Conflict Dynamics', 'Relationship Trajectory Analysis'],
        color: 'bg-purple-50 border-purple-200',
        buttonColor: 'bg-purple-500 hover:bg-purple-600'
      });
    }
    
    // Instant tier features (for free/personal/pro users)
    if (currentTierIndex < TIER_HIERARCHY.indexOf('instant')) {
      sections.push({
        tier: 'Instant',
        features: ['Expert Recommendations & Action Plans'],
        color: 'bg-amber-50 border-amber-200',
        buttonColor: 'bg-amber-500 hover:bg-amber-600'
      });
    }
    
    return sections;
  };

  const upgradeSections = getUpgradeSections();
  
  if (upgradeSections.length === 0) {
    return null; // No upgrade sections to show
  }

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        <Lock className="h-5 w-5 inline mr-2" />
        Unlock More Insights
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {upgradeSections.map((section) => (
          <div
            key={section.tier}
            className={`p-4 rounded-lg border-2 ${section.color}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{section.tier} Tier</h4>
              <Lock className="h-4 w-4 text-gray-500" />
            </div>
            
            <ul className="text-sm text-gray-700 mb-4 space-y-1">
              {section.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                  {feature}
                </li>
              ))}
            </ul>
            
            <Button
              onClick={onUpgrade}
              className={`w-full text-white ${section.buttonColor}`}
              size="sm"
            >
              Upgrade to {section.tier}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}