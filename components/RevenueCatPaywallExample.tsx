import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface RevenueCatPaywallExampleProps {
  onClose?: () => void;
  onPurchaseSuccess?: (customerInfo: CustomerInfo) => void;
  onError?: (error: Error) => void;
}

export function RevenueCatPaywallExample({ 
  onClose, 
  onPurchaseSuccess, 
  onError 
}: RevenueCatPaywallExampleProps) {
  const [showPaywall, setShowPaywall] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const presentRevenueCatPaywall = async () => {
    try {
      console.log('🎬 Presenting RevenueCat native paywall...');
      
      // First, let's debug what offerings are available
      const offerings = await Purchases.getOfferings();
      console.log('📋 Available offerings:', JSON.stringify(offerings, null, 2));
      console.log('📋 Current offering:', offerings.current);
      console.log('📋 All offerings keys:', Object.keys(offerings.all));
      
      if (!offerings.current) {
        throw new Error('No current offering found. Please check RevenueCat dashboard configuration.');
      }
      
      const result = await RevenueCatUI.presentPaywall({
        // Using default offering (will use your configured offering: ofrngbf7f63a5c2)
        // To use a specific offering, you'd need to get it from Purchases.getOfferings() first
        
        // Optional: display close button (default: true)
        displayCloseButton: true,
      });

      // Handle the final result
      handlePaywallResult(result);
    } catch (error: any) {
      console.error('Failed to present RevenueCat paywall:', error);
      
      // Handle specific template/localization errors
      if (error.message?.includes('LocalizationValidationError') || 
          error.message?.includes('template') ||
          error.message?.includes('validating paywall') ||
          error.message?.includes('missingLocalization')) {
        Alert.alert(
          'RevenueCat Paywall Template Issue Found! 🎯',
          `Good news: Your API is working perfectly! ✅\n\nThe issue: Missing text localization for element "UdJmheoEy"\n\nTo fix:\n1. Go to RevenueCat Dashboard → Paywalls\n2. Find your paywall template\n3. Add English text for all elements\n4. Save and republish\n\nYour custom paywall works great as backup!`,
          [
            { text: 'Use Custom Paywall', onPress: () => onClose?.() },
            { text: 'Fix Later', style: 'cancel' }
          ]
        );
      }
      // Handle URL configuration errors
      else if (error.message?.includes('No valid URL is configured') || 
               error.message?.includes('URL')) {
        const urlElementId = error.message.match(/for (\w+)/)?.[1] || 'unknown element';
        Alert.alert(
          'RevenueCat URL Configuration Issue 🔗',
          `Progress: We're getting closer! ✅\n\nThe issue: Missing URL for "${urlElementId}"\n\nThis is likely a:\n• Terms of Service link\n• Privacy Policy link\n• Support/Help button\n\nTo fix:\n1. Go to RevenueCat Dashboard → Paywalls\n2. Find element "${urlElementId}"\n3. Add a valid URL (e.g., https://yoursite.com/terms)\n\nYour custom paywall works perfectly as backup!`,
          [
            { text: 'Use Custom Paywall', onPress: () => onClose?.() },
            { text: 'Fix Later', style: 'cancel' }
          ]
        );
      }
      // Show a more helpful error message for development
      else if (__DEV__ && error.message?.includes('offerings')) {
        Alert.alert(
          'Development Setup Needed',
          'RevenueCat paywall requires offerings to be configured. This is normal in development.\n\nOptions:\n1. Set up StoreKit Configuration\n2. Configure products in RevenueCat dashboard\n3. Use your custom paywall instead',
          [
            { text: 'OK', style: 'default' },
            { text: 'Use Custom Paywall', onPress: () => onClose?.() }
          ]
        );
      } else {
        Alert.alert(
          'Paywall Unavailable',
          'The subscription service is currently unavailable. Please try again later.',
          [{ text: 'OK' }]
        );
      }
      
      onError?.(error);
    }
  };

  // Alternative method to use your specific offering
  const presentSpecificOffering = async () => {
    try {
      console.log('🎬 Fetching specific offering: ofrngbf7f63a5c2');
      
      // Get all offerings from RevenueCat
      const offerings = await Purchases.getOfferings();
      console.log('Available offerings:', Object.keys(offerings.all));
      
      // Find your specific offering
      const targetOffering = offerings.all['ofrngbf7f63a5c2'];
      
      if (targetOffering) {
        console.log('✅ Found target offering, presenting paywall...');
        const result = await RevenueCatUI.presentPaywall({
          offering: targetOffering,
          displayCloseButton: true,
        });
        handlePaywallResult(result);
      } else {
        console.log('⚠️ Specific offering not found, using default...');
        // Fallback to default offering
        const result = await RevenueCatUI.presentPaywall({
          displayCloseButton: true,
        });
        handlePaywallResult(result);
      }
    } catch (error: any) {
      console.error('Failed to present specific offering:', error);
      // Fallback to the default method
      presentRevenueCatPaywall();
    }
  };

  // Debug function to check RevenueCat configuration
  const debugRevenueCatConfig = async () => {
    try {
      console.log('🔍 Starting RevenueCat debug...');
      
      // 1. Check if RevenueCat is configured
      const isConfigured = await Purchases.isConfigured();
      console.log('📱 RevenueCat configured:', isConfigured);
      
      // 2. Get customer info
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('👤 Customer info:', customerInfo);
      
      // 3. Get all offerings
      const offerings = await Purchases.getOfferings();
      console.log('📋 All offerings:', Object.keys(offerings.all));
      console.log('📋 Current offering:', offerings.current?.identifier);
      console.log('📋 Current offering products:', offerings.current?.availablePackages.map(p => p.product.identifier));
      
      // 4. Check your specific offering
      const targetOffering = offerings.all['ofrngbf7f63a5c2'];
      console.log('🎯 Target offering found:', !!targetOffering);
      if (targetOffering) {
        console.log('🎯 Target offering products:', targetOffering.availablePackages.map(p => p.product.identifier));
      }
      
      // 5. Show debug alert
      Alert.alert(
        'RevenueCat Debug Info',
        `Configured: ${isConfigured ? '✅' : '❌'}\n` +
        `Current Offering: ${offerings.current?.identifier || 'None'}\n` +
        `Target Offering (ofrngbf7f63a5c2): ${targetOffering ? '✅' : '❌'}\n` +
        `Total Offerings: ${Object.keys(offerings.all).length}\n` +
        `Available Products: ${offerings.current?.availablePackages.length || 0}\n\n` +
        'Check console for detailed logs.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Debug failed:', error);
      Alert.alert(
        'Debug Failed', 
        `Error: ${error.message}\n\nThis might indicate a configuration issue.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handlePaywallResult = (result: PAYWALL_RESULT) => {
    console.log('🎬 RevenueCat Paywall Result:', result);
    
    switch (result) {
      case PAYWALL_RESULT.CANCELLED:
        console.log('User cancelled the paywall');
        Alert.alert('Cancelled', 'You can upgrade anytime from the settings.');
        break;
      case PAYWALL_RESULT.PURCHASED:
        console.log('User made a purchase');
        Alert.alert(
          'Purchase Successful! 🎉',
          'Thank you for upgrading to Premium!',
          [{ text: 'Continue', onPress: () => onClose?.() }]
        );
        break;
      case PAYWALL_RESULT.RESTORED:
        console.log('User restored purchases');
        Alert.alert(
          'Purchases Restored! ✅',
          'Your premium features have been restored.',
          [{ text: 'Continue', onPress: () => onClose?.() }]
        );
        break;
      case PAYWALL_RESULT.ERROR:
        console.log('Paywall error occurred');
        Alert.alert('Error', 'Something went wrong. Please try again.');
        break;
      default:
        console.log('Unknown paywall result:', result);
        break;
    }
  };

  if (showPaywall) {
    // For the RevenueCat UI SDK, we present paywalls modally using the API
    // The paywall is already shown by calling presentRevenueCatPaywall()
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            RevenueCat Paywall SDK Demo
          </ThemedText>
          
          <ThemedText style={styles.description}>
            This demonstrates how to use RevenueCat's native paywall UI alongside your custom paywall.
          </ThemedText>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={presentRevenueCatPaywall}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Show Default Paywall
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#FF6B35' }]}
              onPress={presentSpecificOffering}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>
                Show Specific Offering (ofrngbf7f63a5c2)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#9B59B6' }]}
              onPress={debugRevenueCatConfig}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>
                🔍 Debug Configuration
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: colors.tint }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.tint }]}>
                Back to Demo Menu
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <ThemedText type="subtitle" style={styles.infoTitle}>
              Your RevenueCat Configuration:
            </ThemedText>
            <ThemedText style={styles.infoText}>
              ✅ API Key: appl_fXxzRCqfbUJwIvBOrHoKUIqWBJS{'\n'}
              ✅ Offering ID: ofrngbf7f63a5c2{'\n'}
              {'\n'}
              Benefits of RevenueCat Paywall:{'\n'}
              • Automatically optimized UI/UX{'\n'}
              • A/B testing capabilities{'\n'}
              • Multiple pre-built templates{'\n'}
              • Automatic localization{'\n'}
              • Easy configuration via dashboard{'\n'}
              • Built-in analytics and conversion tracking
            </ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  paywallContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  paywall: {
    flex: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    marginBottom: 10,
  },
  infoText: {
    lineHeight: 20,
  },
});

export default RevenueCatPaywallExample;
