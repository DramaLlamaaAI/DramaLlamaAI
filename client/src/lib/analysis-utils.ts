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

  // Special case: For the recovery message, only show it once
  if (patterns.length === 1 && patterns[0] === "Analysis recovered via backup method") {
    return ["Analysis recovered via backup method"];
  }
  
  // Filter out any recovery messages if we have other patterns
  patterns = patterns.filter(p => p !== "Analysis recovered via backup method");

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
    
    // Handle exact pattern duplications (like "blame shiftingblame shifting")
    // Look for repetitive patterns by checking common phrases that might be duplicated
    const commonPatterns = [
      'blame shifting', 'emotional withdrawal', 'defensive responses', 
      'criticism', 'stonewalling', 'contempt', 'dismissive', 'validation seeking',
      'conflict avoidance', 'passive aggressive', 'disrespectful', 'gaslighting'
    ];
    
    // General pattern for detecting adjacent word duplications
    const words = trimmedPattern.split(' ');
    let hadDuplication = false;
    
    // First check for word-level duplications (e.g., word word)
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length > 4 && words[i] === words[i + 1]) {
        // Remove the duplication
        words.splice(i + 1, 1);
        hadDuplication = true;
        i--; // Recheck in case of triple duplication
      }
    }
    
    // Check for common phrases that might be duplicated
    for (const commonPattern of commonPatterns) {
      const duplicatedPattern = commonPattern + commonPattern;
      if (trimmedPattern.toLowerCase().includes(duplicatedPattern)) {
        // Replace the duplicated pattern with the single version
        const cleanedPattern = trimmedPattern.replace(new RegExp(duplicatedPattern, 'gi'), commonPattern);
        if (!seen.has(cleanedPattern.toLowerCase())) {
          seen.add(cleanedPattern.toLowerCase());
          cleanedPatterns.push(cleanedPattern);
        }
        return;
      }
    }
    
    // If we had word-level duplications, use the fixed version
    if (hadDuplication) {
      const cleanedPattern = words.join(' ');
      if (!seen.has(cleanedPattern.toLowerCase())) {
        seen.add(cleanedPattern.toLowerCase());
        cleanedPatterns.push(cleanedPattern);
      }
      return;
    }

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
    // Note: Using words array that was already defined above
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
      
      // Add this pattern
      uniquePatterns.push(pattern);
    }
  });
  
  return uniquePatterns;
}

/**
 * Clean an individual pattern for display purposes
 * 
 * @param pattern A communication pattern string
 * @returns Cleaned pattern with proper capitalization and punctuation
 */
export function cleanPatternForDisplay(pattern: string): string {
  if (!pattern) return '';
  
  // First, deal with period-separated duplications (common in API responses)
  // E.g., "Blame shifting.Blame shifting" becomes "Blame shifting"
  let cleaned = pattern.trim();

  // Remove multiple periods in a row (e.g., "pattern... pattern" -> "pattern. pattern")
  cleaned = cleaned.replace(/\.{2,}/g, '.');
  
  // Replace period+space+lowercase with just space+lowercase (keep the period if followed by uppercase)
  // "Pattern one. pattern two" -> "Pattern one pattern two"
  cleaned = cleaned.replace(/\.\s*([a-z])/g, ' $1');
  
  // Handle period-separated duplications for common phrases
  const commonPhrases = [
    'blame shifting', 'emotional withdrawal', 'defensive responses',
    'criticism', 'stonewalling', 'contempt', 'dismissive', 'validation seeking',
    'conflict avoidance', 'passive aggressive', 'disrespectful', 'gaslighting',
    'accusatory', 'defensive'
  ];
  
  for (const phrase of commonPhrases) {
    // Case insensitive match for "phrase.phrase" or "phrase. phrase" pattern
    const periodPattern = new RegExp(`${phrase}\\s*\\.\\s*${phrase}`, 'gi');
    cleaned = cleaned.replace(periodPattern, phrase);
    
    // Check for direct duplications without separation (e.g., "phrasephrase")
    const directDuplication = new RegExp(`(${phrase})(\\s*${phrase})`, 'gi');
    cleaned = cleaned.replace(directDuplication, '$1');
  }
  
  // Clean up any trailing punctuation
  cleaned = cleaned.replace(/[,.;:\s]+$/, '');
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  // Ensure there's a single trailing period
  if (!cleaned.endsWith('.')) {
    cleaned += '.';
  }
  
  return cleaned;
}