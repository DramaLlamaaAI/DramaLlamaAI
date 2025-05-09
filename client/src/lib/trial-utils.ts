/**
 * Utilities for managing free trial usage and developer testing
 */

// localStorage keys
const TRIAL_USED_KEY = 'drama_llama_trial_used';
const ANALYSIS_COUNT_KEY = 'drama_llama_analysis_count';
const DEV_TIER_KEY = 'drama_llama_dev_tier';

/**
 * Check if developer mode is enabled
 */
export function isDevModeEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return localStorage.getItem('drama_llama_dev_mode') === 'true';
}

/**
 * Check if the user has used their free trial
 */
export function hasUsedFreeTrial(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Always return false if developer mode is enabled
  if (isDevModeEnabled()) {
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
  
  // Always return 0 if developer mode is enabled (unlimited usage)
  if (isDevModeEnabled()) {
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
  
  // Skip incrementing if in developer mode
  if (isDevModeEnabled()) {
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
 * Valid subscription tiers for testing
 */
export type DevTier = 'free' | 'personal' | 'pro' | 'instant';

/**
 * Set the current tier for developer testing
 */
export function setDevTier(tier: DevTier): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEV_TIER_KEY, tier);
    
    // Refresh API data
    import('@/lib/queryClient').then(({ queryClient }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
    });
  }
}

/**
 * Get the current developer test tier
 */
export function getDevTier(): DevTier {
  if (typeof window === 'undefined') {
    return 'free';
  }
  
  const tier = localStorage.getItem(DEV_TIER_KEY) as DevTier;
  return tier || 'free';
}