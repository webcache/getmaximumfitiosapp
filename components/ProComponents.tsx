import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

// Base PRO colors for consistency
const PRO_COLORS = {
  background: '#1a1a1a',
  gold: '#FFD700',
  text: '#FFD700',
  white: '#FFFFFF',
  upgradeBackground: '#007AFF',
  upgradeBackgroundAlt: '#4CAF50',
} as const;

// Size configurations
const SIZES = {
  tiny: {
    fontSize: 10,
    padding: { horizontal: 6, vertical: 2 },
    borderRadius: 6,
    iconSize: 10,
    gap: 3,
  },
  small: {
    fontSize: 12,
    padding: { horizontal: 8, vertical: 4 },
    borderRadius: 8,
    iconSize: 12,
    gap: 4,
  },
  medium: {
    fontSize: 14,
    padding: { horizontal: 12, vertical: 6 },
    borderRadius: 10,
    iconSize: 14,
    gap: 6,
  },
  large: {
    fontSize: 16,
    padding: { horizontal: 16, vertical: 8 },
    borderRadius: 12,
    iconSize: 16,
    gap: 8,
  },
  xlarge: {
    fontSize: 18,
    padding: { horizontal: 20, vertical: 10 },
    borderRadius: 14,
    iconSize: 18,
    gap: 10,
  },
} as const;

type Size = keyof typeof SIZES;

// PRO Badge Component
interface ProBadgeProps {
  size?: Size;
  showIcon?: boolean;
  text?: string;
  style?: any;
  onPress?: () => void;
}

export function ProBadge({ 
  size = 'small', 
  showIcon = true, 
  text = 'PRO',
  style,
  onPress 
}: ProBadgeProps) {
  const sizeConfig = SIZES[size];
  
  const badgeStyle = [
    styles.proBadge,
    {
      paddingHorizontal: sizeConfig.padding.horizontal,
      paddingVertical: sizeConfig.padding.vertical,
      borderRadius: sizeConfig.borderRadius,
      gap: sizeConfig.gap,
    },
    style,
  ];

  const textStyle = [
    styles.proBadgeText,
    { fontSize: sizeConfig.fontSize },
  ];

  const content = (
    <View style={badgeStyle}>
      {showIcon && (
        <FontAwesome5 
          name="crown" 
          size={sizeConfig.iconSize} 
          color={PRO_COLORS.gold} 
        />
      )}
      <Text style={textStyle}>{text}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// Upgrade Button Component
interface UpgradeButtonProps {
  size?: Size;
  text?: string;
  variant?: 'primary' | 'secondary' | 'minimal';
  showIcon?: boolean;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}

export function UpgradeButton({ 
  size = 'medium', 
  text = 'Upgrade to Pro',
  variant = 'primary',
  showIcon = true,
  onPress,
  disabled = false,
  style 
}: UpgradeButtonProps) {
  const sizeConfig = SIZES[size];
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: PRO_COLORS.upgradeBackground,
          textColor: PRO_COLORS.white,
        };
      case 'secondary':
        return {
          backgroundColor: PRO_COLORS.background,
          textColor: PRO_COLORS.gold,
          borderWidth: 1,
          borderColor: PRO_COLORS.gold,
        };
      case 'minimal':
        return {
          backgroundColor: 'transparent',
          textColor: PRO_COLORS.upgradeBackground,
        };
      default:
        return {
          backgroundColor: PRO_COLORS.upgradeBackground,
          textColor: PRO_COLORS.white,
        };
    }
  };

  const variantStyles = getVariantStyles();
  
  const buttonStyle = [
    styles.upgradeButton,
    {
      paddingHorizontal: sizeConfig.padding.horizontal,
      paddingVertical: sizeConfig.padding.vertical,
      borderRadius: sizeConfig.borderRadius,
      gap: sizeConfig.gap,
      backgroundColor: variantStyles.backgroundColor,
      ...(variantStyles.borderWidth && { 
        borderWidth: variantStyles.borderWidth,
        borderColor: variantStyles.borderColor 
      }),
      ...(disabled && { opacity: 0.6 }),
    },
    style,
  ];

  const textStyle = [
    styles.upgradeButtonText,
    { 
      fontSize: sizeConfig.fontSize,
      color: variantStyles.textColor,
    },
  ];

  return (
    <TouchableOpacity 
      style={buttonStyle} 
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {showIcon && (
        <FontAwesome5 
          name="crown" 
          size={sizeConfig.iconSize} 
          color={variantStyles.textColor} 
        />
      )}
      <Text style={textStyle}>{text}</Text>
      {variant === 'primary' && (
        <FontAwesome5 
          name="arrow-right" 
          size={sizeConfig.iconSize - 2} 
          color={variantStyles.textColor} 
        />
      )}
    </TouchableOpacity>
  );
}

// Combined Pro Feature Card
interface ProFeatureCardProps {
  title: string;
  description?: string;
  isLocked?: boolean;
  onUpgrade?: () => void;
  children?: React.ReactNode;
  size?: Size;
  style?: any;
}

export function ProFeatureCard({ 
  title, 
  description, 
  isLocked = false, 
  onUpgrade,
  children,
  size = 'medium',
  style 
}: ProFeatureCardProps) {
  return (
    <View style={[styles.featureCard, style]}>
      <View style={styles.featureHeader}>
        <ThemedText style={styles.featureTitle}>{title}</ThemedText>
        {isLocked && <ProBadge size={size} />}
      </View>
      
      {description && (
        <ThemedText style={[styles.featureDescription, isLocked && styles.lockedText]}>
          {description}
        </ThemedText>
      )}
      
      {children}
      
      {isLocked && onUpgrade && (
        <UpgradeButton 
          size={size}
          text="Upgrade to Pro"
          onPress={onUpgrade}
          style={styles.featureUpgradeButton}
        />
      )}
    </View>
  );
}

// Lock Icon Component for consistency
interface LockIconProps {
  size?: number;
  color?: string;
}

export function LockIcon({ size = 16, color = '#999' }: LockIconProps) {
  return <FontAwesome5 name="lock" size={size} color={color} />;
}

// Tier Badge Component
interface TierBadgeProps {
  tier: 'free' | 'pro';
  size?: Size;
  style?: any;
}

export function TierBadge({ tier, size = 'small', style }: TierBadgeProps) {
  const sizeConfig = SIZES[size];
  const isPro = tier === 'pro';
  
  return (
    <View style={[
      styles.tierBadge,
      {
        backgroundColor: isPro ? PRO_COLORS.upgradeBackgroundAlt : '#FF9500',
        paddingHorizontal: sizeConfig.padding.horizontal,
        paddingVertical: sizeConfig.padding.vertical,
        borderRadius: sizeConfig.borderRadius,
        gap: sizeConfig.gap,
      },
      style,
    ]}>
      <FontAwesome5 
        name={isPro ? 'crown' : 'user'} 
        size={sizeConfig.iconSize} 
        color="white" 
      />
      <Text style={[
        styles.tierText,
        { fontSize: sizeConfig.fontSize }
      ]}>
        {isPro ? 'Pro' : 'Free'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRO_COLORS.background,
    alignSelf: 'flex-start',
  },
  proBadgeText: {
    fontWeight: 'bold',
    color: PRO_COLORS.text,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    fontWeight: 'bold',
  },
  featureCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  lockedText: {
    opacity: 0.6,
  },
  featureUpgradeButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierText: {
    fontWeight: 'bold',
    color: 'white',
  },
});

// Export colors for use in other components
export { PRO_COLORS };
