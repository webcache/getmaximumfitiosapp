// Feature configuration for freemium vs pro tiers
export interface FeatureLimits {
  // AI Features
  aiQueriesPerMonth: number;
  aiAdvancedFeatures: boolean;
  
  // Workout Features
  maxCustomWorkouts: number;
  advancedWorkoutAnalytics: boolean;
  personalizedRecommendations: boolean;
  
  // Progress Tracking
  advancedProgressTracking: boolean;
  detailedAnalytics: boolean;
  progressExports: boolean;
  
  // Social Features
  basicSocialSharing: boolean;
  advancedSocialSharing: boolean;
  achievementSharing: boolean;
  socialChallenges: boolean;
  
  // Premium Features
  adFree: boolean;
  cloudBackup: boolean;
  premiumSupport: boolean;
  earlyAccess: boolean;
}

export const TIER_FEATURES: Record<'freemium' | 'pro', FeatureLimits> = {
  freemium: {
    // AI Features - Limited
    aiQueriesPerMonth: 2,
    aiAdvancedFeatures: false,
    
    // Workout Features - Basic
    maxCustomWorkouts: 5,
    advancedWorkoutAnalytics: false,
    personalizedRecommendations: false,
    
    // Progress Tracking - Basic
    advancedProgressTracking: false,
    detailedAnalytics: false,
    progressExports: false,
    
    // Social Features - Basic
    basicSocialSharing: true,
    advancedSocialSharing: false,
    achievementSharing: false,
    socialChallenges: false,
    
    // Premium Features - None
    adFree: false,
    cloudBackup: false,
    premiumSupport: false,
    earlyAccess: false,
  },
  
  pro: {
    // AI Features - Unlimited
    aiQueriesPerMonth: -1, // -1 means unlimited
    aiAdvancedFeatures: true,
    
    // Workout Features - Full Access
    maxCustomWorkouts: -1, // unlimited
    advancedWorkoutAnalytics: true,
    personalizedRecommendations: true,
    
    // Progress Tracking - Full Access
    advancedProgressTracking: true,
    detailedAnalytics: true,
    progressExports: true,
    
    // Social Features - Full Access
    basicSocialSharing: true,
    advancedSocialSharing: true,
    achievementSharing: true,
    socialChallenges: true,
    
    // Premium Features - All
    adFree: true,
    cloudBackup: true,
    premiumSupport: true,
    earlyAccess: true,
  },
};

// Feature keys for easy reference
export const FEATURES = {
  AI_QUERIES: 'aiQueriesPerMonth',
  AI_ADVANCED: 'aiAdvancedFeatures',
  MAX_WORKOUTS: 'maxCustomWorkouts',
  WORKOUT_ANALYTICS: 'advancedWorkoutAnalytics',
  PERSONALIZED_RECS: 'personalizedRecommendations',
  ADVANCED_PROGRESS: 'advancedProgressTracking',
  DETAILED_ANALYTICS: 'detailedAnalytics',
  PROGRESS_EXPORTS: 'progressExports',
  BASIC_SOCIAL: 'basicSocialSharing',
  ADVANCED_SOCIAL: 'advancedSocialSharing',
  ACHIEVEMENT_SHARING: 'achievementSharing',
  SOCIAL_CHALLENGES: 'socialChallenges',
  AD_FREE: 'adFree',
  CLOUD_BACKUP: 'cloudBackup',
  PREMIUM_SUPPORT: 'premiumSupport',
  EARLY_ACCESS: 'earlyAccess',
} as const;

export type FeatureKey = keyof FeatureLimits;
