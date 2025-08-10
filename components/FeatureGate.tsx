import { FontAwesome5 } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { FeatureKey } from '../config/features';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { useFeatureGating } from '../hooks/useFeatureGating';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  onUpgradePress?: () => void;
  showUpgradeButton?: boolean;
}

/**
 * FeatureGate component that wraps features and controls access based on subscription tier
 * 
 * Usage:
 * <FeatureGate feature="advancedWorkoutAnalytics" onUpgradePress={showPaywall}>
 *   <AdvancedAnalyticsComponent />
 * </FeatureGate>
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  onUpgradePress,
  showUpgradeButton = true 
}: FeatureGateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { hasFeature, getUpgradeMessage, currentTier } = useFeatureGating();

  const hasAccess = hasFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  return (
    <ThemedView style={[styles.upgradeContainer, { borderColor: colors.tint + '30' }]}>
      <FontAwesome5 name="crown" size={32} color="#FFD700" style={styles.crownIcon} />
      
      <ThemedText style={styles.upgradeTitle}>
        Premium Feature
      </ThemedText>
      
      <ThemedText style={[styles.upgradeMessage, { color: colors.text + '80' }]}>
        {getUpgradeMessage(feature)}
      </ThemedText>
      
      {showUpgradeButton && (
        <TouchableOpacity 
          style={[styles.upgradeButton, { backgroundColor: colors.tint }]}
          onPress={onUpgradePress || (() => Alert.alert('Upgrade Required', getUpgradeMessage(feature)))}
        >
          <FontAwesome5 name="star" size={16} color="white" style={styles.buttonIcon} />
          <ThemedText style={styles.upgradeButtonText}>
            Upgrade to Pro
          </ThemedText>
        </TouchableOpacity>
      )}
      
      <ThemedText style={[styles.currentTier, { color: colors.text + '60' }]}>
        Current: {currentTier === 'pro' ? 'Pro' : 'Free'} Plan
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  upgradeContainer: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    margin: 16,
  },
  crownIcon: {
    marginBottom: 12,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  currentTier: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default FeatureGate;
