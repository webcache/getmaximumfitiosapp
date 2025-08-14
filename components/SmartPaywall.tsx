import { router } from 'expo-router';
import { Alert } from 'react-native';
import { CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

interface SmartPaywallProps {
  onSuccess?: (customerInfo?: CustomerInfo) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
  context?: 'onboarding' | 'feature_gate' | 'settings' | 'upgrade_button' | 'default';
  fallbackToCustom?: boolean;
}

/**
 * Smart Paywall Component
 * 
 * Primary: Uses RevenueCat native paywall for optimized conversion
 * Fallback: Uses custom paywall if RevenueCat fails
 * 
 * Features:
 * - Automatic fallback to custom paywall on errors
 * - Context-aware presentation
 * - Consistent success/error handling
 * - Analytics tracking ready
 */
export class SmartPaywall {
  /**
   * Present the RevenueCat paywall with automatic fallback
   */
  static async present({
    onSuccess,
    onCancel,
    onError,
    context = 'default',
    fallbackToCustom = true
  }: SmartPaywallProps = {}) {
    try {
      console.log(`🎬 Presenting RevenueCat paywall (context: ${context})`);
      
      const result = await RevenueCatUI.presentPaywall({
        displayCloseButton: true,
      });

      // Handle the result
      switch (result) {
        case PAYWALL_RESULT.CANCELLED:
          console.log('User cancelled RevenueCat paywall');
          onCancel?.();
          break;
          
        case PAYWALL_RESULT.PURCHASED:
          console.log('✅ Purchase successful via RevenueCat paywall');
          Alert.alert(
            'Welcome to Premium! 🎉',
            'Thank you for upgrading! All premium features are now unlocked.',
            [{ text: 'Start Using Pro Features', onPress: () => onSuccess?.() }]
          );
          break;
          
        case PAYWALL_RESULT.RESTORED:
          console.log('✅ Purchases restored via RevenueCat paywall');
          Alert.alert(
            'Purchases Restored! ✅',
            'Your premium features have been restored.',
            [{ text: 'Continue', onPress: () => onSuccess?.() }]
          );
          break;
          
        case PAYWALL_RESULT.ERROR:
          console.log('❌ RevenueCat paywall error');
          throw new Error('RevenueCat paywall encountered an error');
      }
      
    } catch (error: any) {
      console.error('❌ RevenueCat paywall failed:', error);
      
      // Determine if we should fallback
      if (fallbackToCustom) {
        console.log('🔄 Falling back to custom paywall...');
        
        Alert.alert(
          'Loading Alternative Paywall',
          'Loading our custom upgrade screen...',
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to custom paywall
                router.push('/Archived_premiumUpgrade' as any);
              }
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => onCancel?.()
            }
          ]
        );
      } else {
        // No fallback, just show error
        Alert.alert(
          'Upgrade Unavailable',
          'The upgrade service is temporarily unavailable. Please try again later.',
          [{ text: 'OK', onPress: () => onError?.(error) }]
        );
      }
    }
  }

  /**
   * Present paywall with context-specific behavior
   */
  static async presentForContext(context: SmartPaywallProps['context'], options: Omit<SmartPaywallProps, 'context'> = {}) {
    // Context-specific behavior
    switch (context) {
      case 'onboarding':
        // For onboarding, use RevenueCat for conversion optimization
        return this.present({
          ...options,
          context,
          fallbackToCustom: true
        });
        
      case 'feature_gate':
        // For feature gates, prioritize quick conversion
        return this.present({
          ...options,
          context,
          fallbackToCustom: true
        });
        
      case 'settings':
        // For settings access, provide reliable fallback
        return this.present({
          ...options,
          context,
          fallbackToCustom: true
        });
        
      case 'upgrade_button':
        // For direct upgrade buttons, ensure user always sees something
        return this.present({
          ...options,
          context,
          fallbackToCustom: true
        });
        
      default:
        return this.present({
          ...options,
          context: 'default',
          fallbackToCustom: true
        });
    }
  }
}

/**
 * Hook-style interface for React components
 */
export const useSmartPaywall = () => {
  const presentPaywall = (options: SmartPaywallProps = {}) => {
    return SmartPaywall.present(options);
  };

  const presentForContext = (context: SmartPaywallProps['context'], options: Omit<SmartPaywallProps, 'context'> = {}) => {
    return SmartPaywall.presentForContext(context, options);
  };

  return {
    presentPaywall,
    presentForContext
  };
};

// Export default for easy importing
export default SmartPaywall;
