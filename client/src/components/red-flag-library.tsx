import React from 'react';
import { AlertTriangle, Eye, MessageSquare, Shield, Users, Zap } from 'lucide-react';

interface RedFlagLibraryProps {
  className?: string;
}

const RED_FLAG_CATEGORIES = [
  {
    name: "Emotional Manipulation",
    icon: MessageSquare,
    description: "Using emotions to control or influence behavior",
    examples: [
      "Guilt-tripping",
      "Emotional blackmail", 
      "Playing the victim",
      "Silent treatment"
    ]
  },
  {
    name: "Gaslighting",
    icon: Eye,
    description: "Making someone question their own reality or memory",
    examples: [
      "Denying things they said",
      "Minimizing feelings",
      "Claiming misunderstandings",
      "Rewriting history"
    ]
  },
  {
    name: "Control Behaviors",
    icon: Shield,
    description: "Attempting to control actions, decisions, or relationships",
    examples: [
      "Isolating from friends/family",
      "Monitoring activities",
      "Financial control",
      "Dictating choices"
    ]
  },
  {
    name: "Verbal Aggression",
    icon: Zap,
    description: "Using words to intimidate, hurt, or dominate",
    examples: [
      "Name-calling",
      "Threats",
      "Yelling or screaming",
      "Insults and put-downs"
    ]
  },
  {
    name: "Boundary Violations",
    icon: Users,
    description: "Ignoring or disrespecting personal limits and boundaries",
    examples: [
      "Ignoring 'no'",
      "Pushing physical limits",
      "Invading privacy",
      "Dismissing feelings"
    ]
  }
];

export function RedFlagLibrary({ className = "" }: RedFlagLibraryProps) {
  return (
    <div className={`bg-red-25 p-4 rounded-lg border border-red-100 ${className}`}>
      <h4 className="font-semibold text-red-800 mb-3 flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2" />
        🚩 Red Flag Library
      </h4>
      <p className="text-sm text-red-700 mb-4">
        Understanding common warning signs in communication patterns:
      </p>
      
      <div className="space-y-3">
        {RED_FLAG_CATEGORIES.map((category, index) => {
          const IconComponent = category.icon;
          return (
            <div key={index} className="bg-white p-3 rounded border border-red-100">
              <div className="flex items-start gap-3">
                <IconComponent className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-red-800 text-sm">{category.name}</h5>
                  <p className="text-xs text-red-600 mt-1">{category.description}</p>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {category.examples.map((example, exampleIndex) => (
                        <span 
                          key={exampleIndex}
                          className="inline-block bg-red-50 text-red-700 text-xs px-2 py-1 rounded border border-red-200"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
        <p className="text-xs text-red-700">
          <strong>Remember:</strong> These patterns can appear in any relationship. If you recognize multiple red flags, 
          consider reaching out to support resources or trusted friends and family.
        </p>
      </div>
    </div>
  );
}