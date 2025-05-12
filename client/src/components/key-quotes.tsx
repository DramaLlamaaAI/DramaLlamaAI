import React from "react";

interface Quote {
  speaker: string;
  quote: string;
  analysis: string;
  improvement?: string;
}

interface KeyQuotesProps {
  quotes: Quote[];
  tier?: string;
}

/**
 * Component to display key quotes from the conversation
 * with analysis and potential improvements
 */
export default function KeyQuotes({ quotes, tier = 'free' }: KeyQuotesProps) {
  if (!quotes || quotes.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-3">Key Moments</h3>
      <div className="space-y-5">
        {quotes.map((quote, index) => (
          <div key={index} className="border rounded-md p-4 bg-card">
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium">{quote.speaker}</span>
              <span className="text-sm text-muted-foreground">Quote #{index + 1}</span>
            </div>
            
            <blockquote className="border-l-2 pl-4 italic mb-3">
              "{quote.quote}"
            </blockquote>
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-primary">Analysis</h4>
              <p className="text-sm">{quote.analysis}</p>
              
              {(tier === 'pro' || tier === 'instant') && quote.improvement && (
                <>
                  <h4 className="text-sm font-semibold text-primary pt-1">Possible Improvement</h4>
                  <p className="text-sm">{quote.improvement}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}