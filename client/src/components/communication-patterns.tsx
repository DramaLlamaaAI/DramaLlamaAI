import React from "react";

interface CommunicationPatternsProps {
  patterns: string[];
  suggestions?: string[];
}

/**
 * Component that displays communication patterns detected in a conversation,
 * along with suggested improvements
 */
export default function CommunicationPatterns({
  patterns,
  suggestions,
}: CommunicationPatternsProps) {
  if (!patterns || patterns.length === 0) {
    return (
      <div>
        <h3 className="text-xl font-semibold mb-2">Communication Patterns</h3>
        <p className="text-muted-foreground">No specific patterns detected.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Communication Patterns</h3>
      
      <div className="space-y-2 mb-4">
        <h4 className="font-medium text-lg">Identified Patterns</h4>
        <ul className="list-disc pl-5 space-y-1">
          {patterns.map((pattern, index) => (
            <li key={index} className="text-base">
              {pattern}
            </li>
          ))}
        </ul>
      </div>
      
      {suggestions && suggestions.length > 0 && (
        <div className="space-y-2 mt-4 p-3 bg-muted/50 rounded-md border">
          <h4 className="font-medium text-lg">Suggestions for Improvement</h4>
          <ul className="list-disc pl-5 space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-base">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}