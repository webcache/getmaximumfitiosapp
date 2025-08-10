import { useCallback, useEffect, useState } from 'react';
import { FeatureKey, FeatureLimits, TIER_FEATURES } from '../config/features';
import { useSubscription } from '../contexts/SubscriptionContext';

interface FeatureUsage {
  aiQueriesThisMonth: number;
  lastAiQueryReset: string; // ISO date string
  customWorkoutsCreated: number;
}

interface UseFeatureGatingReturn {
  // Tier information
  currentTier: 'freemium' | 'pro';
  features: FeatureLimits;
  
  // Feature checking
  hasFeature: (feature: FeatureKey) => boolean;
  canUseFeature: (feature: FeatureKey) => Promise<boolean>;
  getRemainingUsage: (feature: FeatureKey) => Promise<number>;
  
  // Usage tracking
  incrementUsage: (feature: FeatureKey) => Promise<void>;
  getUsageStats: () => Promise<FeatureUsage>;
  resetMonthlyUsage: () => Promise<void>;
  
  // UI helpers
  getUpgradeMessage: (feature: FeatureKey) => string;
  shouldShowUpgradePrompt: (feature: FeatureKey) => Promise<boolean>;
}

export function useFeatureGating(): UseFeatureGatingReturn {
  const { hasActiveSubscription } = useSubscription();
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage>({
    aiQueriesThisMonth: 0,
    lastAiQueryReset: new Date().toISOString(),
    customWorkoutsCreated: 0,
  });

  // Determine current tier
  const currentTier: 'freemium' | 'pro' = hasActiveSubscription ? 'pro' : 'freemium';
  const features = TIER_FEATURES[currentTier];

  // Check if we need to reset monthly usage
  useEffect(() => {
    checkAndResetMonthlyUsage();
  }, []);

  // TODO: Replace this with your app's storage method
  const loadUsageData = async () => {
    try {
      // This is where you'd load from your app's storage system
      // For now, keeping in memory only
      console.log('TODO: Load feature usage from your storage system');
    } catch (error) {
      console.error('Failed to load feature usage data:', error);
    }
  };

  // TODO: Replace this with your app's storage method
  const saveUsageData = async (usage: FeatureUsage) => {
    try {
      // This is where you'd save to your app's storage system
      // For now, just updating state
      setFeatureUsage(usage);
      console.log('TODO: Save feature usage to your storage system', usage);
    } catch (error) {
      console.error('Failed to save feature usage data:', error);
    }
  };

  const checkAndResetMonthlyUsage = async () => {
    const lastReset = new Date(featureUsage.lastAiQueryReset);
    const now = new Date();
    
    // Reset if it's a new month
    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      await resetMonthlyUsage();
    }
  };

  const resetMonthlyUsage = async () => {
    const newUsage: FeatureUsage = {
      ...featureUsage,
      aiQueriesThisMonth: 0,
      lastAiQueryReset: new Date().toISOString(),
    };
    await saveUsageData(newUsage);
  };

  const hasFeature = useCallback((feature: FeatureKey): boolean => {
    return features[feature] === true || features[feature] === -1;
  }, [features]);

  const canUseFeature = useCallback(async (feature: FeatureKey): Promise<boolean> => {
    // If pro tier, most features are unlimited
    if (currentTier === 'pro') {
      return hasFeature(feature);
    }

    // Check specific feature limits for freemium
    switch (feature) {
      case 'aiQueriesPerMonth':
        const aiLimit = features.aiQueriesPerMonth as number;
        return aiLimit === -1 || featureUsage.aiQueriesThisMonth < aiLimit;
        
      case 'maxCustomWorkouts':
        const workoutLimit = features.maxCustomWorkouts as number;
        return workoutLimit === -1 || featureUsage.customWorkoutsCreated < workoutLimit;
        
      default:
        return hasFeature(feature);
    }
  }, [currentTier, features, featureUsage, hasFeature]);

  const getRemainingUsage = useCallback(async (feature: FeatureKey): Promise<number> => {
    if (currentTier === 'pro') {
      return -1; // Unlimited
    }

    switch (feature) {
      case 'aiQueriesPerMonth':
        const aiLimit = features.aiQueriesPerMonth as number;
        return aiLimit === -1 ? -1 : Math.max(0, aiLimit - featureUsage.aiQueriesThisMonth);
        
      case 'maxCustomWorkouts':
        const workoutLimit = features.maxCustomWorkouts as number;
        return workoutLimit === -1 ? -1 : Math.max(0, workoutLimit - featureUsage.customWorkoutsCreated);
        
      default:
        return hasFeature(feature) ? -1 : 0;
    }
  }, [currentTier, features, featureUsage, hasFeature]);

  const incrementUsage = useCallback(async (feature: FeatureKey): Promise<void> => {
    if (currentTier === 'pro') {
      return; // No need to track usage for pro users
    }

    let newUsage = { ...featureUsage };

    switch (feature) {
      case 'aiQueriesPerMonth':
        newUsage.aiQueriesThisMonth += 1;
        break;
        
      case 'maxCustomWorkouts':
        newUsage.customWorkoutsCreated += 1;
        break;
        
      default:
        return; // No tracking needed for boolean features
    }

    await saveUsageData(newUsage);
  }, [currentTier, featureUsage, saveUsageData]);

  const getUsageStats = useCallback(async (): Promise<FeatureUsage> => {
    return featureUsage;
  }, [featureUsage]);

  const shouldShowUpgradePrompt = useCallback(async (feature: FeatureKey): Promise<boolean> => {
    if (currentTier === 'pro') {
      return false;
    }

    const canUse = await canUseFeature(feature);
    return !canUse;
  }, [currentTier, canUseFeature]);

  const getUpgradeMessage = useCallback((feature: FeatureKey): string => {
    const featureMessages = {
      aiQueriesPerMonth: 'Upgrade to Pro for unlimited AI assistance',
      aiAdvancedFeatures: 'Unlock advanced AI features with Pro',
      maxCustomWorkouts: 'Create unlimited custom workouts with Pro',
      advancedWorkoutAnalytics: 'Get detailed workout analytics with Pro',
      personalizedRecommendations: 'Receive personalized recommendations with Pro',
      advancedProgressTracking: 'Track your progress in detail with Pro',
      detailedAnalytics: 'Access comprehensive analytics with Pro',
      progressExports: 'Export your progress data with Pro',
      advancedSocialSharing: 'Share achievements and progress with Pro',
      achievementSharing: 'Share your achievements with Pro',
      socialChallenges: 'Join social challenges with Pro',
      adFree: 'Remove ads with Pro subscription',
      cloudBackup: 'Backup your data to the cloud with Pro',
      premiumSupport: 'Get priority support with Pro',
      earlyAccess: 'Access new features early with Pro',
      basicSocialSharing: 'Basic sharing available',
    };

    return featureMessages[feature] || 'Upgrade to Pro for more features';
  }, []);

  return {
    currentTier,
    features,
    hasFeature,
    canUseFeature,
    getRemainingUsage,
    incrementUsage,
    getUsageStats,
    resetMonthlyUsage,
    getUpgradeMessage,
    shouldShowUpgradePrompt,
  };
}

export default useFeatureGating;
