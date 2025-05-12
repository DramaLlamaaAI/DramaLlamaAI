import React from "react";

interface Emotion {
  emotion: string;
  intensity: number;
}

interface EmotionalStateProps {
  emotions: Emotion[];
}

/**
 * Component to display the emotional state analysis
 * Shows emotions and their intensity levels in the conversation
 */
export default function EmotionalState({ emotions }: EmotionalStateProps) {
  if (!emotions || emotions.length === 0) {
    return (
      <div>
        <h3 className="text-xl font-semibold mb-2">Emotional State</h3>
        <p className="text-muted-foreground">No emotional data available.</p>
      </div>
    );
  }

  // Sort emotions by intensity (highest first)
  const sortedEmotions = [...emotions].sort((a, b) => b.intensity - a.intensity);

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Emotional State</h3>
      <div className="space-y-3">
        {sortedEmotions.map((emotion, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="w-24 font-medium text-sm">{emotion.emotion}</div>
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${emotion.intensity * 10}%` }}
              />
            </div>
            <div className="w-10 text-sm text-right">{emotion.intensity}/10</div>
          </div>
        ))}
      </div>
    </div>
  );
}