import React from "react";

interface TensionMeaningProps {
  tensionMeaning: string;
}

/**
 * Component to display the meaning behind tension in the conversation
 */
export default function TensionMeaning({ tensionMeaning }: TensionMeaningProps) {
  if (!tensionMeaning) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">What This Means</h3>
      <div className="p-4 bg-muted rounded-md border">
        <p className="text-base leading-relaxed">{tensionMeaning}</p>
      </div>
    </div>
  );
}