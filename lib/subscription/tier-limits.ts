// Subscription tier limits and features
export type SubscriptionTier = 'free' | 'basic' | 'premium';

export interface TierLimits {
  maxProjects: number;
  maxTeamMembers: number;
  methodologies: string[];
  historyDays: number;
  features: {
    conversationalAI: boolean;
    analytics: false | 'basic' | 'advanced';
    apiAccess: boolean;
    customBranding: boolean;
    whiteLabel: boolean;
  };
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxProjects: 1,
    maxTeamMembers: 2,
    methodologies: ['prince2', 'agile', 'hybrid'], // All methodologies available
    historyDays: 7,
    features: {
      conversationalAI: false,
      analytics: false,
      apiAccess: false,
      customBranding: false,
      whiteLabel: false,
    },
  },
  basic: {
    maxProjects: 3, // Updated from 10
    maxTeamMembers: 5,
    methodologies: ['prince2', 'agile', 'hybrid'], // All methodologies available
    historyDays: 90,
    features: {
      conversationalAI: true,
      analytics: 'basic',
      apiAccess: true,
      customBranding: true,
      whiteLabel: false,
    },
  },
  premium: {
    maxProjects: 20, // Updated from unlimited
    maxTeamMembers: -1, // -1 represents unlimited
    methodologies: ['prince2', 'agile', 'hybrid', 'custom'], // Including custom
    historyDays: -1, // -1 represents unlimited
    features: {
      conversationalAI: true,
      analytics: 'advanced',
      apiAccess: true,
      customBranding: true,
      whiteLabel: true,
    },
  },
};

export function getTierLimits(tier: SubscriptionTier = 'free'): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

export function canCreateProject(
  currentProjectCount: number,
  tier: SubscriptionTier = 'free'
): boolean {
  const limits = getTierLimits(tier);
  if (limits.maxProjects === -1) return true; // Unlimited
  return currentProjectCount < limits.maxProjects;
}

export function canAddTeamMember(
  currentMemberCount: number,
  tier: SubscriptionTier = 'free'
): boolean {
  const limits = getTierLimits(tier);
  if (limits.maxTeamMembers === -1) return true; // Unlimited
  return currentMemberCount < limits.maxTeamMembers;
}

export function hasMethodologyAccess(
  methodology: string,
  tier: SubscriptionTier = 'free'
): boolean {
  const limits = getTierLimits(tier);
  return limits.methodologies.includes(methodology.toLowerCase());
}

export function hasFeatureAccess(
  feature: keyof TierLimits['features'],
  tier: SubscriptionTier = 'free'
): boolean {
  const limits = getTierLimits(tier);
  const featureValue = limits.features[feature];
  return featureValue !== false;
}

export function getProjectLimitMessage(tier: SubscriptionTier): string {
  const limits = getTierLimits(tier);
  if (limits.maxProjects === -1) {
    return 'Unlimited projects';
  }
  return `${limits.maxProjects} project${limits.maxProjects === 1 ? '' : 's'}`;
}

export function getTeamLimitMessage(tier: SubscriptionTier): string {
  const limits = getTierLimits(tier);
  if (limits.maxTeamMembers === -1) {
    return 'Unlimited team members';
  }
  return `${limits.maxTeamMembers} team member${limits.maxTeamMembers === 1 ? '' : 's'}`;
}