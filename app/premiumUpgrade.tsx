import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SandboxIndicator } from '../components/SandboxIndicator';
import { getRevenueCatApiKey } from '../config/revenuecat';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useRevenueCat } from '../hooks/useRevenueCat';

const PREMIUM_FEATURES = [
  {
    icon: 'heart' as const,
    title: 'Favorite Workouts',
    description: 'Save and organize your favorite workout routines for quick access',
  },
  {
    icon: 'trending-up' as const,
    title: 'Goal Setting',
    description: 'Set and track personal fitness goals with detailed progress monitoring',
  },
  {
    icon: 'color-palette' as const,
    title: 'Theme Customization',
    description: 'Personalize your app with custom banner images and color themes',
  },
  {
    icon: 'chatbubbles' as const,
    title: 'Unlimited AI Chat',
    description: 'Get unlimited AI-powered fitness advice and workout recommendations',
  },
  {
    icon: 'barbell' as const,
    title: 'Custom Workouts',
    description: 'Create unlimited custom workout routines tailored to your needs',
  },
  {
    icon: 'share-social' as const,
    title: 'Social Sharing',
    description: 'Share your achievements and progress with friends and community',
  },
];

const PRICING_OPTIONS = [
  {
    id: 'monthly',
    title: 'Pro Monthly',
    price: '$11.99',
    period: '/month',
    savings: null,
    popular: false,
  },
  {
    id: 'annual',
    title: 'Pro Annual',
    price: '$79.99',
    period: '/year',
    savings: '44% off',
    popular: true,
  },
  {
    id: 'lifetime',
    title: 'Lifetime Pro',
    price: '$159.99',
    period: 'one-time',
    savings: 'Best value',
    popular: false,
  },
];

export default function PremiumUpgradeScreen() {
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { hasActiveSubscription } = useSubscription();
  const { currentOffering, purchasePackage, restorePurchases } = useRevenueCat(getRevenueCatApiKey());

  // Set up navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Upgrade to Pro',
      headerShown: true,
      headerBackTitle: 'Back',
      headerTintColor: '#000000',
    });
  }, [navigation]);

  const handlePurchase = async () => {
    if (!currentOffering) {
      if (__DEV__) {
        Alert.alert(
          'Development Mode',
          'Purchases are not available in development mode without proper StoreKit configuration. Please see the StoreKit setup guide in the docs folder.',
          [
            { text: 'OK' },
            { text: 'View Guide', onPress: () => console.log('📚 See: docs/STOREKIT_CONFIGURATION_SETUP.md') }
          ]
        );
      } else {
        Alert.alert(
          'Unavailable',
          'Subscription options are not available right now. Please try again later.',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    try {
      setIsLoading(true);
      
      // Find the package based on selected plan using the actual product IDs from App Store Connect
      let packageId: string;
      switch (selectedPlan) {
        case 'monthly':
          packageId = 'proupgrade'; // Monthly subscription (matches App Store Connect)
          break;
        case 'annual':
          packageId = 'proupgradeannual'; // Annual subscription (matches App Store Connect)
          break;
        case 'lifetime':
          packageId = 'lifetime'; // Lifetime purchase (matches App Store Connect)
          break;
        default:
          packageId = 'pro';
      }
      
      const selectedPackage = currentOffering.availablePackages.find(
        pkg => pkg.product.identifier === packageId
      );

      if (!selectedPackage) {
        Alert.alert('Error', 'Selected plan is not available');
        return;
      }

      await purchasePackage(selectedPackage);
      
      Alert.alert(
        'Success!',
        'Welcome to GetMaximumFit Pro! All premium features are now unlocked.',
        [
          {
            text: 'Start Using Pro Features',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Purchase error:', error);
      if (!error.message?.includes('user cancelled')) {
        Alert.alert(
          'Purchase Failed',
          'Unable to complete the purchase. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsLoading(true);
      await restorePurchases();
      Alert.alert(
        'Restore Complete',
        'Your purchases have been restored successfully!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Restore Failed',
        'Unable to restore purchases. Please ensure you have an active subscription.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (hasActiveSubscription) {
    // Update navigation title for already subscribed users
    navigation.setOptions({ title: 'Premium Features' });
    
    return (
      <View style={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.successTitle}>You're Pro! 🎉</Text>
          <Text style={styles.successMessage}>
            You have access to all premium features. Enjoy your enhanced experience!
          </Text>
          
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.back()}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Unlock Your Full Potential</Text>
          <Text style={styles.heroSubtitle}>
            Get access to all premium features and take your fitness journey to the next level
          </Text>
        </View>

        {/* Sandbox Testing Indicator */}
        <View style={{ paddingHorizontal: 24 }}>
          <SandboxIndicator />
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={24} color="#007AFF" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          {PRICING_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.pricingOption,
                selectedPlan === option.id && styles.selectedOption,
                option.popular && styles.popularOption,
              ]}
              onPress={() => setSelectedPlan(option.id)}
            >
              {option.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}
              
              <View style={styles.pricingHeader}>
                <View style={styles.titleAndSavings}>
                  <Text style={styles.pricingTitle}>{option.title}</Text>
                  {option.savings && (
                    <Text style={styles.savingsText}>{option.savings}</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.pricingDetails}>
                <Text style={styles.price}>{option.price}</Text>
                <Text style={styles.period}>{option.period}</Text>
              </View>
              
              <View style={styles.radioButton}>
                {selectedPlan === option.id && (
                  <View style={styles.radioSelected} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.upgradeButton, isLoading && styles.disabledButton]}
            onPress={handlePurchase}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.upgradeButtonText}>
                Start Pro Subscription
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={isLoading}
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Subscriptions auto-renew unless cancelled. Cancel anytime in your App Store settings.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    backgroundColor: 'white',
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  pricingSection: {
    backgroundColor: 'white',
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  pricingOption: {
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    position: 'relative',
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  popularOption: {
    borderColor: '#4CAF50',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    marginRight: 40, // Add margin to make room for radio button
  },
  titleAndSavings: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 2,
  },
  pricingDetails: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  period: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  radioButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  actionSection: {
    padding: 24,
    backgroundColor: 'white',
    marginTop: 12,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
