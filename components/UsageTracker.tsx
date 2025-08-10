import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { FeatureKey } from '../config/features';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { useFeatureGating } from '../hooks/useFeatureGating';
import { ThemedText } from './ThemedText';

interface UsageTrackerProps {
  feature: FeatureKey;
  onUpgradePress?: () => void;
  showUpgradeWhenLimitReached?: boolean;
}

/**
 * UsageTracker component that shows remaining usage for limited features
 * 
 * Usage:
 * <UsageTracker feature="aiQueriesPerMonth" onUpgradePress={showPaywall} />
 */
export function UsageTracker({ 
  feature, 
  onUpgradePress,
  showUpgradeWhenLimitReached = true 
}: UsageTrackerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { 
    getRemainingUsage, 
    currentTier, 
    getUpgradeMessage,
    features 
  } = useFeatureGating();
  
  const [remaining, setRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRemainingUsage();
  }, [feature]);

  const loadRemainingUsage = async () => {
    try {
      setIsLoading(true);
      const remainingCount = await getRemainingUsage(feature);
      setRemaining(remainingCount);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentTier === 'pro') {
    return (
      <View style={[styles.container, { backgroundColor: colors.tint + '10' }]}>
        <FontAwesome5 name="infinity" size={16} color={colors.tint} />
        <ThemedText style={[styles.text, { color: colors.tint }]}>
          Unlimited
        </ThemedText>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.text + '10' }]}>
        <ThemedText style={[styles.text, { color: colors.text + '70' }]}>
          Loading...
        </ThemedText>
      </View>
    );
  }

  const featureLimit = features[feature] as number;
  const used = featureLimit - remaining;
  const isLimitReached = remaining <= 0;
  const isNearLimit = remaining <= Math.ceil(featureLimit * 0.2); // 20% remaining

  const getFeatureName = (feature: FeatureKey): string => {
    const names: Partial<Record<FeatureKey, string>> = {
      aiQueriesPerMonth: 'AI Queries',
      maxCustomWorkouts: 'Custom Workouts',
    };
    return names[feature] || 'Usage';
  };

  const getUsageText = (): string => {
    if (featureLimit === -1) return 'Unlimited';
    if (feature === 'aiQueriesPerMonth') {
      return `${used}/${featureLimit} this month`;
    }
    return `${used}/${featureLimit} created`;
  };

  if (isLimitReached && showUpgradeWhenLimitReached) {
    return (
      <View style={[styles.limitReachedContainer, { borderColor: '#FF6B6B' }]}>
        <FontAwesome5 name="exclamation-triangle" size={16} color="#FF6B6B" />
        <ThemedText style={[styles.limitText, { color: '#FF6B6B' }]}>
          {getFeatureName(feature)} limit reached
        </ThemedText>
        {onUpgradePress && (
          <TouchableOpacity 
            style={[styles.upgradeButton, { backgroundColor: colors.tint }]}
            onPress={onUpgradePress}
          >
            <ThemedText style={styles.upgradeButtonText}>
              Upgrade
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isNearLimit ? '#FFF3CD' : colors.text + '10',
        borderColor: isNearLimit ? '#FF9800' : 'transparent',
        borderWidth: isNearLimit ? 1 : 0,
      }
    ]}>
      <FontAwesome5 
        name={isNearLimit ? "exclamation-triangle" : "info-circle"} 
        size={14} 
        color={isNearLimit ? '#FF9800' : colors.text + '70'} 
      />
      <ThemedText style={[
        styles.text, 
        { 
          color: isNearLimit ? '#FF9800' : colors.text + '70' 
        }
      ]}>
        {getUsageText()}
      </ThemedText>
      
      {isNearLimit && onUpgradePress && (
        <TouchableOpacity onPress={onUpgradePress}>
          <ThemedText style={[styles.upgradeLink, { color: colors.tint }]}>
            Upgrade
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Hook to easily check if a feature can be used and increment usage
 */
export function useFeatureUsage(feature: FeatureKey) {
  const { canUseFeature, incrementUsage, shouldShowUpgradePrompt } = useFeatureGating();

  const checkAndUseFeature = async (onUpgradeRequired?: () => void): Promise<boolean> => {
    const canUse = await canUseFeature(feature);
    
    if (!canUse) {
      const shouldPrompt = await shouldShowUpgradePrompt(feature);
      if (shouldPrompt && onUpgradeRequired) {
        onUpgradeRequired();
      }
      return false;
    }

    // Feature can be used, increment the usage
    await incrementUsage(feature);
    return true;
  };

  return {
    checkAndUseFeature,
    canUseFeature,
    incrementUsage,
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  limitReachedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  limitText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  upgradeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  upgradeLink: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default UsageTracker;
