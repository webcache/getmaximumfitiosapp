import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { FeatureKey, FeatureLimits, TIER_FEATURES } from '../config/features';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { db } from '../firebase';

interface FeatureUsage {
  aiQueriesThisMonth: number;
  lastAiQueryReset: string; // ISO date string
  customWorkoutsCreated: number;
  updatedAt: string;
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
  
  // Current usage state for reactive updates
  featureUsage: FeatureUsage;
  
  // UI helpers
  getUpgradeMessage: (feature: FeatureKey) => string;
  shouldShowUpgradePrompt: (feature: FeatureKey) => Promise<boolean>;
  
  // Loading state
  isLoading: boolean;
}

export function useFeatureGating(): UseFeatureGatingReturn {
  const { hasActiveSubscription } = useSubscription();
  const { user, userProfile } = useAuth();
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage>({
    aiQueriesThisMonth: 0,
    lastAiQueryReset: new Date().toISOString(),
    customWorkoutsCreated: 0,
    updatedAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);

  // Determine current tier - prioritize database flag over subscription
  // This provides a reliable source of truth for Pro status
  const isProUser = userProfile?.isPro === true || hasActiveSubscription;
  const currentTier: 'freemium' | 'pro' = isProUser ? 'pro' : 'freemium';
  const features = TIER_FEATURES[currentTier];

  // Load usage data on mount and when user changes
  useEffect(() => {
    if (user?.uid) {
      loadUsageData();
    }
  }, [user?.uid]);

  // Check if we need to reset monthly usage
  useEffect(() => {
    checkAndResetMonthlyUsage();
  }, [featureUsage.lastAiQueryReset]);

  const loadUsageData = async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      // Use subcollection path: profiles/{userId}/featureUsage/default
      const usageDoc = await getDoc(doc(db, 'profiles', user.uid, 'featureUsage', 'default'));
      
      if (usageDoc.exists()) {
        const data = usageDoc.data() as FeatureUsage;
        setFeatureUsage(data);
        console.log('📊 Feature usage loaded from subcollection:', data);
      } else {
        // Create initial usage document in subcollection
        const initialUsage: FeatureUsage = {
          aiQueriesThisMonth: 0,
          lastAiQueryReset: new Date().toISOString(),
          customWorkoutsCreated: 0,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'profiles', user.uid, 'featureUsage', 'default'), initialUsage);
        setFeatureUsage(initialUsage);
        console.log('📊 Created initial feature usage document in subcollection');
      }
    } catch (error) {
      console.error('Failed to load feature usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUsageData = async (usage: FeatureUsage) => {
    if (!user?.uid) return;
    
    try {
      const updatedUsage = {
        ...usage,
        updatedAt: new Date().toISOString(),
      };
      
      // Use subcollection path: profiles/{userId}/featureUsage/default
      await setDoc(doc(db, 'profiles', user.uid, 'featureUsage', 'default'), updatedUsage);
      setFeatureUsage(updatedUsage);
      console.log('📊 Feature usage saved to subcollection:', updatedUsage);
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
      console.log('📊 Skipping usage tracking for Pro user');
      return; // No need to track usage for pro users
    }

    console.log(`📊 Incrementing usage for feature: ${feature}`);
    let newUsage = { ...featureUsage };

    switch (feature) {
      case 'aiQueriesPerMonth':
        newUsage.aiQueriesThisMonth += 1;
        console.log(`📊 AI queries updated: ${featureUsage.aiQueriesThisMonth} → ${newUsage.aiQueriesThisMonth}`);
        break;
        
      case 'maxCustomWorkouts':
        newUsage.customWorkoutsCreated += 1;
        console.log(`📊 Custom workouts updated: ${featureUsage.customWorkoutsCreated} → ${newUsage.customWorkoutsCreated}`);
        break;
        
      default:
        console.log(`📊 No tracking needed for feature: ${feature}`);
        return; // No tracking needed for boolean features
    }

    await saveUsageData(newUsage);
    console.log('📊 Usage data saved successfully');
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
    const featureMessages: Partial<Record<FeatureKey, string>> = {
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

    return featureMessages[feature as FeatureKey] || 'Upgrade to Pro for more features';
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
    isLoading,
    featureUsage,
  };
}

export default useFeatureGating;
