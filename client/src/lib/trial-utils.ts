/**
 * Utilities for managing free trial usage
 */

// Key used for localStorage tracking
const FREE_TRIAL_KEY = 'dramallama_free_trial_used';
const TRIAL_COUNT_KEY = 'dramallama_analysis_count';

/**
 * Check if user has used their free trial already
 */
export function hasUsedFreeTrial(): boolean {
  return localStorage.getItem(FREE_TRIAL_KEY) === 'true';
}

/**
 * Mark the free trial as used
 */
export function markFreeTrialAsUsed(): void {
  localStorage.setItem(FREE_TRIAL_KEY, 'true');
}

/**
 * Get the number of analyses the user has performed
 */
export function getAnalysisCount(): number {
  const count = localStorage.getItem(TRIAL_COUNT_KEY);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Increment the analysis count
 */
export function incrementAnalysisCount(): number {
  const currentCount = getAnalysisCount();
  const newCount = currentCount + 1;
  localStorage.setItem(TRIAL_COUNT_KEY, newCount.toString());
  
  // If this is their first analysis, mark the trial as used
  if (newCount === 1) {
    markFreeTrialAsUsed();
  }
  
  return newCount;
}

/**
 * Reset the trial usage (typically used when a user upgrades to paid)
 */
export function resetTrialUsage(): void {
  localStorage.removeItem(FREE_TRIAL_KEY);
}

/**
 * Check if the user is still eligible for free tier usage
 */
export function isEligibleForFreeTier(): boolean {
  return !hasUsedFreeTrial();
}