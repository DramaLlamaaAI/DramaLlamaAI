/**
 * Utility functions for working with analysis data
 */

/**
 * Clean communication patterns to remove duplications
 * 
 * @param patterns Array of communication pattern strings
 * @returns Array with duplications removed
 */
export function cleanCommunicationPatterns(patterns: string[]): string[] {
  if (!patterns || !Array.isArray(patterns)) {
    return [];
  }

  const cleanedPatterns: string[] = [];
  
  // Process each pattern to detect and fix duplications
  patterns.forEach(pattern => {
    // Check for duplicated text by looking for the same word/phrase repeated
    // Common patterns like "X Y Z X Y Z" where the same phrase is duplicated
    
    // First, clean up any extra whitespace
    const trimmedPattern = pattern.trim().replace(/\s+/g, ' ');

    // Check if pattern length is at least 10 characters to avoid false positives
    if (trimmedPattern.length < 10) {
      cleanedPatterns.push(trimmedPattern);
      return;
    }
    
    // Try to detect if the second half duplicates the first half
    const halfLength = Math.floor(trimmedPattern.length / 2);
    const firstHalf = trimmedPattern.substring(0, halfLength);
    const secondHalf = trimmedPattern.substring(halfLength);
    
    // If the second half starts with text that's very similar to the first half, it's likely a duplication
    if (secondHalf.startsWith(firstHalf.substring(0, Math.min(10, firstHalf.length)))) {
      cleanedPatterns.push(firstHalf);
      return;
    }
    
    // Check for exact repeating phrases (e.g., "X attacks, Y defends cycle" + "X attacks, Y defends cycle")
    const words = trimmedPattern.split(' ');
    if (words.length >= 6) {
      // Check for repeating 3+ word phrases
      for (let i = 3; i <= Math.floor(words.length / 2); i++) {
        const phrase1 = words.slice(0, i).join(' ');
        const phrase2 = words.slice(i, i + i).join(' ');
        
        if (phrase1 === phrase2) {
          cleanedPatterns.push(phrase1);
          return;
        }
      }
    }
    
    // If we couldn't detect any duplication, use the original pattern
    cleanedPatterns.push(trimmedPattern);
  });
  
  return cleanedPatterns;
}

/**
 * Clean a single pattern for display
 * 
 * @param pattern Pattern string to clean
 * @returns Cleaned pattern
 */
export function cleanPatternForDisplay(pattern: string): string {
  if (!pattern) return '';
  
  // Clean up any extra whitespace
  let result = pattern.trim().replace(/\s+/g, ' ');
  
  // Detect exact duplicated sentences or phrases
  // Example: "Alex attacks, Jamie defends cycleAlex attacks, Jamie defends cycle"
  const halfLength = Math.floor(result.length / 2);
  if (halfLength > 10) {
    const firstHalf = result.substring(0, halfLength);
    const secondHalf = result.substring(halfLength);
    
    if (secondHalf.includes(firstHalf.substring(0, Math.min(15, firstHalf.length)))) {
      return firstHalf;
    }
  }
  
  return result;
}