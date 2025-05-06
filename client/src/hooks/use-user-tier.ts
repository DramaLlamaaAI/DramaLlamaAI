import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserUsage } from '@/lib/openai';

interface UseTierResult {
  tier: string;
  used: number;
  limit: number;
  isLoading: boolean;
  canUseFeature: boolean;
  featureEnabled: (feature: string) => boolean;
}

const FEATURE_MAP: Record<string, string[]> = {
  'free': ['basicTone', 'ventMode'],
  'personal': ['basicTone', 'ventMode', 'redFlags', 'advice', 'patterns'],
  'pro': ['basicTone', 'ventMode', 'redFlags', 'advice', 'patterns', 'dramaScore', 'historical']
};

export function useUserTier(): UseTierResult {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const tier = data?.tier || 'free';
  const used = data?.used || 0;
  const limit = data?.limit || 1;
  
  const canUseFeature = used < limit;
  
  const featureEnabled = (feature: string): boolean => {
    const availableFeatures = FEATURE_MAP[tier] || FEATURE_MAP.free;
    return availableFeatures.includes(feature);
  };

  return {
    tier,
    used,
    limit,
    isLoading,
    canUseFeature,
    featureEnabled
  };
}
