import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { getDeviceId } from '@/lib/device-id';
import { hasUsedFreeTrial, getAnalysisCount } from '@/lib/trial-utils';

interface UsageData {
  tier: string;
  used: number;
  limit: number;
  remaining: number;
}

interface UseTierResult {
  tier: string;
  used: number;
  limit: number;
  remaining: number;
  isLoading: boolean;
  canUseFeature: boolean;
  featureEnabled: (feature: string) => boolean;
  isAuthenticated: boolean;
  hasUsedFreeTrial: boolean;
  analysisCount: number;
}

const FEATURE_MAP: Record<string, string[]> = {
  'free': ['basicTone', 'ventMode'],
  'personal': ['basicTone', 'ventMode', 'redFlags', 'advice', 'patterns', 'replacements'],
  'pro': ['basicTone', 'ventMode', 'redFlags', 'advice', 'patterns', 'replacements', 'dramaScore', 'historical', 'liveTalk', 'groupChat']
};

async function getUserUsage(): Promise<UsageData> {
  const deviceId = getDeviceId();
  const headers = new Headers({ 'x-device-id': deviceId });
  
  const response = await apiRequest('GET', '/api/user/usage', undefined, {
    headers
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch usage data');
  }
  
  return response.json();
}

async function getCurrentUser() {
  const response = await apiRequest('GET', '/api/auth/user');
  
  if (response.status === 401) {
    return null;
  }
  
  if (!response.ok) {
    throw new Error('Failed to fetch user data');
  }
  
  return response.json();
}

export function useUserTier(): UseTierResult {
  // Get usage data from the server
  const { data: usageData, isLoading: isUsageLoading } = useQuery<UsageData>({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  // Check if user is authenticated
  const { data: userData, isLoading: isAuthLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: getCurrentUser,
    retry: false, // Don't retry auth failures
  });
  
  // Combine server data with local storage data
  const localTrialUsed = hasUsedFreeTrial();
  const analysisCount = getAnalysisCount();
  const isAuthenticated = !!userData;
  
  const tier = usageData?.tier || 'free';
  const used = usageData?.used || 0;
  const limit = usageData?.limit || 1;
  const remaining = usageData?.remaining !== undefined ? usageData.remaining : (limit - used);
  
  // Determine if user can use features based on authentication status and usage
  let canUseFeature = true;
  
  // If user is authenticated, they should have unlimited usage
  if (isAuthenticated) {
    // For all tiers except 'instant', canUseFeature will be true if limit is null
    canUseFeature = limit === null || used < limit;
  } 
  // If not authenticated, anonymous users are limited to 2 analyses per month
  else {
    // Anonymous users are limited to 2 analyses
    const ANONYMOUS_LIMIT = 2;
    canUseFeature = analysisCount < ANONYMOUS_LIMIT;
  }
  
  const featureEnabled = (feature: string): boolean => {
    const availableFeatures = FEATURE_MAP[tier] || FEATURE_MAP.free;
    return availableFeatures.includes(feature);
  };

  return {
    tier,
    used,
    limit,
    remaining,
    isLoading: isUsageLoading || isAuthLoading,
    canUseFeature,
    featureEnabled,
    isAuthenticated,
    hasUsedFreeTrial: localTrialUsed,
    analysisCount
  };
}
