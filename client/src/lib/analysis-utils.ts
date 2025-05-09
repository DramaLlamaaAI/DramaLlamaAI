/**
 * Utility functions for working with analysis data
 */

/**
 * Clean communication patterns to remove duplications and deduplicate the array
 * 
 * @param patterns Array of communication pattern strings
 * @returns Array with duplications removed
 */
export function cleanCommunicationPatterns(patterns: string[]): string[] {
  if (!patterns || !Array.isArray(patterns)) {
    return [];
  }

  const cleanedPatterns: string[] = [];
  const seen = new Set<string>();
  
  // Process each pattern to detect and fix duplications
  patterns.forEach(pattern => {
    // Skip empty patterns
    if (!pattern || pattern.trim() === '') {
      return;
    }
    
    // First, clean up any extra whitespace
    const trimmedPattern = pattern.trim().replace(/\s+/g, ' ');

    // Check if pattern length is at least 10 characters to avoid false positives
    if (trimmedPattern.length < 10) {
      if (!seen.has(trimmedPattern.toLowerCase())) {
        seen.add(trimmedPattern.toLowerCase());
        cleanedPatterns.push(trimmedPattern);
      }
      return;
    }
    
    // Try to detect if the second half duplicates the first half
    const halfLength = Math.floor(trimmedPattern.length / 2);
    const firstHalf = trimmedPattern.substring(0, halfLength);
    const secondHalf = trimmedPattern.substring(halfLength);
    
    // If the second half starts with text that's very similar to the first half, it's likely a duplication
    if (secondHalf.startsWith(firstHalf.substring(0, Math.min(10, firstHalf.length)))) {
      const cleanedHalf = firstHalf.trim();
      if (!seen.has(cleanedHalf.toLowerCase())) {
        seen.add(cleanedHalf.toLowerCase());
        cleanedPatterns.push(cleanedHalf);
      }
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
          if (!seen.has(phrase1.toLowerCase())) {
            seen.add(phrase1.toLowerCase());
            cleanedPatterns.push(phrase1);
          }
          return;
        }
      }
    }
    
    // Check for simple duplication by words (e.g., "confrontation confrontation", "accusatory accusatory")
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i] === words[i + 1] && words[i].length > 3) {
        words.splice(i + 1, 1);
        i--; // Recheck the same position in case of triple+ duplications
      }
    }
    
    const dedupedPattern = words.join(' ');
    
    // If we couldn't detect any duplication, use the fixed pattern
    if (!seen.has(dedupedPattern.toLowerCase())) {
      seen.add(dedupedPattern.toLowerCase());
      cleanedPatterns.push(dedupedPattern);
    }
  });
  
  // Final check for similar patterns (if one pattern is fully contained within another)
  const uniquePatterns: string[] = [];
  cleanedPatterns.forEach(pattern => {
    // Check if this pattern is contained within any other pattern
    const isContained = uniquePatterns.some(existing => 
      existing.toLowerCase().includes(pattern.toLowerCase()) && existing.length > pattern.length
    );
    
    if (!isContained) {
      // Check if this pattern contains any other patterns
      const containedPatterns = uniquePatterns.filter(existing => 
        pattern.toLowerCase().includes(existing.toLowerCase()) && pattern.length > existing.length
      );
      
      // Remove any patterns this one contains
      containedPatterns.forEach(contained => {
        const index = uniquePatterns.indexOf(contained);
        if (index !== -1) {
          uniquePatterns.splice(index, 1);
        }
      });
      
      uniquePatterns.push(pattern);
    }
  });
  
  return uniquePatterns;
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
  
  // Handle repeated words (e.g., "defensive defensive" or "accusatory accusatory")
  const words = result.split(' ');
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1] && words[i].length > 3) {
      words.splice(i + 1, 1);
      i--; // Recheck the same position in case of triple+ duplications
    }
  }
  result = words.join(' ');
  
  // Detect exact duplicated sentences or phrases
  // Example: "Alex attacks, Jamie defends cycleAlex attacks, Jamie defends cycle"
  const halfLength = Math.floor(result.length / 2);
  if (halfLength > 10) {
    const firstHalf = result.substring(0, halfLength);
    const secondHalf = result.substring(halfLength);
    
    if (secondHalf.includes(firstHalf.substring(0, Math.min(15, firstHalf.length)))) {
      return firstHalf.trim();
    }
  }
  
  // Check for connected sentences without proper spacing
  // Example: "Person is defensivePerson avoids addressing issues"
  for (let i = 3; i < result.length - 3; i++) {
    // Check for a capital letter that might indicate the start of a new sentence
    // when it's not at the beginning of the string and not after a period
    if (
      i > 0 && 
      result[i].match(/[A-Z]/) && 
      result[i-1].match(/[a-z]/) && 
      result[i-1] !== '.' && 
      result[i-1] !== '!' && 
      result[i-1] !== '?'
    ) {
      // Insert a space before the capital letter to separate the sentences
      result = result.substring(0, i) + '. ' + result.substring(i);
      i += 2; // Skip the inserted characters
    }
  }
  
  return result;
}