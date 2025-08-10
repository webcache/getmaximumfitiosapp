// Feature configuration for freemium vs pro tiers
export interface FeatureLimits {
  // AI Features
  aiQueriesPerMonth: number;
  aiAdvancedFeatures: boolean;
  
  // Workout Features
  maxCustomWorkouts: number;
  favoriteWorkouts: boolean; // NEW: Ability to save favorite workouts
  advancedWorkoutAnalytics: boolean;
  personalizedRecommendations: boolean;
  
  // Progress Tracking
  goalSetting: boolean; // NEW: Ability to set fitness goals
  advancedProgressTracking: boolean;
  detailedAnalytics: boolean;
  progressExports: boolean;
  
  // Customization Features
  themeCustomization: boolean; // NEW: Custom themes and banner images
  bannerCustomization: boolean; // NEW: Custom banner images
  
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
    favoriteWorkouts: false, // 🔒 Pro Feature
    advancedWorkoutAnalytics: false,
    personalizedRecommendations: false,
    
    // Progress Tracking - Basic
    goalSetting: false, // 🔒 Pro Feature
    advancedProgressTracking: false,
    detailedAnalytics: false,
    progressExports: false,
    
    // Customization Features - Basic
    themeCustomization: false, // 🔒 Pro Feature
    bannerCustomization: false, // 🔒 Pro Feature
    
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
    favoriteWorkouts: true, // ✅ Pro Feature
    advancedWorkoutAnalytics: true,
    personalizedRecommendations: true,
    
    // Progress Tracking - Full Access
    goalSetting: true, // ✅ Pro Feature
    advancedProgressTracking: true,
    detailedAnalytics: true,
    progressExports: true,
    
    // Customization Features - Full Access
    themeCustomization: true, // ✅ Pro Feature
    bannerCustomization: true, // ✅ Pro Feature
    
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
  FAVORITE_WORKOUTS: 'favoriteWorkouts',
  WORKOUT_ANALYTICS: 'advancedWorkoutAnalytics',
  PERSONALIZED_RECS: 'personalizedRecommendations',
  GOAL_SETTING: 'goalSetting',
  ADVANCED_PROGRESS: 'advancedProgressTracking',
  DETAILED_ANALYTICS: 'detailedAnalytics',
  PROGRESS_EXPORTS: 'progressExports',
  THEME_CUSTOMIZATION: 'themeCustomization',
  BANNER_CUSTOMIZATION: 'bannerCustomization',
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
