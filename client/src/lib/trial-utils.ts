/**
 * Utilities for managing free trial usage for anonymous users
 */

// localStorage keys
const TRIAL_USED_KEY = 'drama_llama_trial_used';
const ANALYSIS_COUNT_KEY = 'drama_llama_analysis_count';

/**
 * Check if the user has used their free trial
 */
export function hasUsedFreeTrial(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return localStorage.getItem(TRIAL_USED_KEY) === 'true';
}

/**
 * Mark the free trial as used
 */
export function markFreeTrialAsUsed(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TRIAL_USED_KEY, 'true');
  }
}

/**
 * Reset the free trial status (used when a user logs in/upgrades)
 */
export function resetFreeTrial(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TRIAL_USED_KEY);
    localStorage.removeItem(ANALYSIS_COUNT_KEY);
  }
}

/**
 * Get the number of analyses the user has performed
 */
export function getAnalysisCount(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  
  const count = localStorage.getItem(ANALYSIS_COUNT_KEY);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Increment the analysis count and mark trial as used if needed
 */
export function incrementAnalysisCount(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  const currentCount = getAnalysisCount();
  const newCount = currentCount + 1;
  
  localStorage.setItem(ANALYSIS_COUNT_KEY, newCount.toString());
  
  // Mark trial as used if this is their first analysis
  if (newCount === 1) {
    markFreeTrialAsUsed();
  }
}

/**
 * Define tier types for consistency
 */
export type Tier = 'free' | 'personal' | 'pro' | 'instant';