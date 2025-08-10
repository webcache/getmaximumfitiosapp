import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProBadgeProps {
  onPress?: () => void;
  size?: 'small' | 'medium';
}

export function ProBadge({ onPress, size = 'small' }: ProBadgeProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/premiumUpgrade');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={[
      styles.proBadge,
      size === 'medium' && styles.proBadgeMedium
    ]}>
      <Ionicons 
        name="diamond" 
        size={size === 'small' ? 10 : 12} 
        color="#FFD700" 
      />
      <Text style={[
        styles.proBadgeText,
        size === 'medium' && styles.proBadgeTextMedium
      ]}>
        PRO
      </Text>
    </TouchableOpacity>
  );
}

interface FeatureButtonProps {
  title: string;
  isLocked: boolean;
  onPress: () => void;
  icon?: string;
  style?: any;
  subtitle?: string;
}

export function FeatureButton({
  title,
  isLocked,
  onPress,
  icon,
  style,
  subtitle
}: FeatureButtonProps) {
  const handlePress = () => {
    if (isLocked) {
      router.push('/premiumUpgrade');
    } else {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.featureButton,
        isLocked && styles.lockedFeatureButton,
        style
      ]}
      onPress={handlePress}
    >
      <View style={styles.featureButtonContent}>
        {icon && (
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={isLocked ? '#999' : '#007AFF'} 
            style={styles.featureButtonIcon}
          />
        )}
        <View style={styles.featureButtonText}>
          <View style={styles.featureButtonTitleRow}>
            <Text style={[
              styles.featureButtonTitle,
              isLocked && styles.lockedFeatureButtonTitle
            ]}>
              {title}
            </Text>
            {isLocked && <ProBadge size="small" />}
          </View>
          {subtitle && (
            <Text style={[
              styles.featureButtonSubtitle,
              isLocked && styles.lockedFeatureButtonSubtitle
            ]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {isLocked && (
        <Ionicons name="chevron-forward" size={16} color="#999" />
      )}
    </TouchableOpacity>
  );
}

interface SubtleFeatureGateProps {
  isLocked: boolean;
  children: React.ReactNode;
  onUpgradePress?: () => void;
}

export function SubtleFeatureGate({ isLocked, children, onUpgradePress }: SubtleFeatureGateProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  const handleUpgradePress = onUpgradePress || (() => router.push('/premiumUpgrade'));

  return (
    <View style={styles.subtleGateContainer}>
      <View style={styles.subtleGateOverlay}>
        <TouchableOpacity onPress={handleUpgradePress} style={styles.subtleUpgradeButton}>
          <Ionicons name="lock-closed" size={12} color="#666" />
          <Text style={styles.subtleUpgradeText}>Pro</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.subtleDisabledContent}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  proBadgeMedium: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  proBadgeText: {
    color: '#FFD700',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  proBadgeTextMedium: {
    fontSize: 10,
  },
  featureButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedFeatureButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
  },
  featureButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureButtonIcon: {
    marginRight: 12,
  },
  featureButtonText: {
    flex: 1,
  },
  featureButtonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  lockedFeatureButtonTitle: {
    color: '#999',
  },
  featureButtonSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  lockedFeatureButtonSubtitle: {
    color: '#999',
  },
  subtleGateContainer: {
    position: 'relative',
  },
  subtleGateOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  subtleUpgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    gap: 4,
  },
  subtleUpgradeText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
  },
  subtleDisabledContent: {
    opacity: 0.6,
    pointerEvents: 'none',
  },
});
