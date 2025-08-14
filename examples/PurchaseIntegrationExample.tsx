// Example: Enhanced Purchase Success Handler
// This shows how to integrate the database Pro status update with your purchase flow

import { useAuth } from '@/contexts/AuthContext';
import { Alert } from 'react-native';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

const ExamplePurchaseIntegration = () => {
  const { updateProStatus } = useAuth();

  // Example 1: For RevenueCat paywall success
  const handleRevenueCatSuccess = async (result: PAYWALL_RESULT) => {
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      try {
        // Update database Pro status
        await updateProStatus(true);
        console.log('✅ Pro status updated in database');
        
        // Show success message
        Alert.alert(
          'Welcome to Pro! 🎉',
          'Your Pro status has been activated. All premium features are now unlocked!',
          [{ text: 'Start Using Pro Features' }]
        );
      } catch (error) {
        console.error('Failed to update Pro status:', error);
        // Still show success since purchase worked
        Alert.alert(
          'Purchase Successful! 🎉',
          'Your purchase was successful. If you experience any issues, please contact support.'
        );
      }
    }
  };

  // Example 2: For custom paywall success
  const handleCustomPaywallSuccess = async () => {
    try {
      // Update database Pro status
      await updateProStatus(true);
      console.log('✅ Pro status updated in database');
      
      Alert.alert(
        'Welcome to Pro! 🎉',
        'Thank you for upgrading! All premium features are now unlocked.',
        [{ text: 'Continue' }]
      );
    } catch (error) {
      console.error('Failed to update Pro status:', error);
    }
  };

  // Example 3: Manual Pro status management (for admin/testing)
  const toggleProStatus = async (isPro: boolean) => {
    try {
      await updateProStatus(isPro);
      console.log(`✅ Pro status ${isPro ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to update Pro status:', error);
    }
  };

  return {
    handleRevenueCatSuccess,
    handleCustomPaywallSuccess,
    toggleProStatus
  };
};

export default ExamplePurchaseIntegration;
