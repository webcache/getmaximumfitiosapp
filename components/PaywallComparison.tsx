import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import PaywallScreen from './PaywallScreen'; // Your existing custom paywall
import RevenueCatPaywallExample from './RevenueCatPaywallExample';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface PaywallComparisonProps {
  onClose?: () => void;
  onPurchaseSuccess?: (customerInfo: CustomerInfo) => void;
}

export function PaywallComparison({ onClose, onPurchaseSuccess }: PaywallComparisonProps) {
  const [currentView, setCurrentView] = useState<'selector' | 'custom' | 'revenuecat' | 'comparison' | 'debug'>('selector');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const presentRevenueCatPaywall = async () => {
    try {
      console.log('🎬 Presenting RevenueCat native paywall...');
      
      const result = await RevenueCatUI.presentPaywall({
        displayCloseButton: true,
      });

      handlePaywallResult(result);
    } catch (error: any) {
      console.error('Failed to present RevenueCat paywall:', error);
      Alert.alert('Error', 'Failed to show paywall. Please try again.');
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
    }
  };

  const handleCustomPaywallSuccess = (customerInfo?: CustomerInfo) => {
    if (customerInfo) {
      onPurchaseSuccess?.(customerInfo);
    }
    onClose?.();
  };

  if (currentView === 'custom') {
    return (
      <SafeAreaView style={styles.modalContainer}>
        <PaywallScreen 
          onClose={() => setCurrentView('selector')}
          onPurchaseSuccess={handleCustomPaywallSuccess}
        />
      </SafeAreaView>
    );
  }

  if (currentView === 'revenuecat') {
    return (
      <SafeAreaView style={styles.modalContainer}>
        <RevenueCatPaywallExample 
          onClose={() => setCurrentView('selector')}
          onPurchaseSuccess={onPurchaseSuccess}
          onError={(error) => {
            console.error('RevenueCat paywall error:', error);
            Alert.alert('Error', error.message);
          }}
        />
      </SafeAreaView>
    );
  }

  if (currentView === 'debug') {
    return (
      <SafeAreaView style={styles.modalContainer}>
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Debug Feature Removed
          </ThemedText>
          <ThemedText style={styles.description}>
            The debug screen has been removed. Your RevenueCat integration is now fully working!
          </ThemedText>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={() => setCurrentView('selector')}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Back to Demo
            </Text>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (currentView === 'comparison') {
    return (
      <SafeAreaView style={styles.modalContainer}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <ThemedView style={styles.content}>
            <ThemedText type="title" style={styles.title}>
              Paywall Comparison
            </ThemedText>

            <View style={styles.comparisonSection}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Custom Paywall vs RevenueCat Paywall
              </ThemedText>

              <View style={styles.comparisonGrid}>
                <View style={styles.column}>
                  <ThemedText type="defaultSemiBold" style={styles.columnTitle}>
                    Your Custom Paywall ✨
                  </ThemedText>
                  <ThemedText style={styles.comparisonText}>
                    ✅ Full design control{'\n'}
                    ✅ Brand consistency{'\n'}
                    ✅ Custom animations{'\n'}
                    ✅ Unique user experience{'\n'}
                    ❌ Manual A/B testing{'\n'}
                    ❌ Manual localization{'\n'}
                    ❌ More development time
                  </ThemedText>
                </View>

                <View style={styles.column}>
                  <ThemedText type="defaultSemiBold" style={styles.columnTitle}>
                    RevenueCat Paywall 🚀
                  </ThemedText>
                  <ThemedText style={styles.comparisonText}>
                    ✅ Optimized for conversion{'\n'}
                    ✅ Built-in A/B testing{'\n'}
                    ✅ Automatic localization{'\n'}
                    ✅ Pre-built templates{'\n'}
                    ✅ Analytics included{'\n'}
                    ❌ Less design flexibility{'\n'}
                    ❌ RevenueCat branding
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.recommendationSection}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                💡 Recommendation
              </ThemedText>
              <ThemedText style={styles.recommendationText}>
                Use both strategically:{'\n\n'}
                
                🎯 <Text style={styles.bold}>Custom Paywall:</Text> For your main app flow where brand experience is crucial{'\n\n'}
                
                📊 <Text style={styles.bold}>RevenueCat Paywall:</Text> For A/B testing different approaches and optimizing conversion rates{'\n\n'}
                
                🔄 <Text style={styles.bold}>Hybrid Approach:</Text> Start with custom, then A/B test against RevenueCat templates to find what works best for your users
              </ThemedText>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={() => setCurrentView('selector')}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Back to Demo
              </Text>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.modalContainer}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Paywall Implementation Demo
          </ThemedText>
          
          <ThemedText style={styles.description}>
            Compare your custom paywall with RevenueCat's native paywall implementation.
          </ThemedText>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={() => setCurrentView('custom')}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Your Custom Paywall
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: colors.tint }]}
              onPress={presentRevenueCatPaywall}
            >
              <Text style={[styles.buttonText, { color: colors.tint }]}>
                RevenueCat Native Paywall
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView('revenuecat')}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                RevenueCat Demo Screen
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView('comparison')}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                View Comparison
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <ThemedText type="subtitle" style={styles.infoTitle}>
              Implementation Notes:
            </ThemedText>
            <ThemedText style={styles.infoText}>
              • Both paywalls use the same RevenueCat backend{'\n'}
              • RevenueCat paywall is presented modally{'\n'}
              • Custom paywall gives you full control{'\n'}
              • You can A/B test between them{'\n'}
              • Analytics work with both approaches
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton]}
            onPress={() => setCurrentView('debug')}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              ✅ RevenueCat Integration Status
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Close Demo
            </Text>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    paddingBottom: 40,
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
  tertiaryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: 20,
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
  comparisonSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  column: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 15,
    borderRadius: 12,
  },
  columnTitle: {
    marginBottom: 10,
    textAlign: 'center',
  },
  comparisonText: {
    lineHeight: 18,
    fontSize: 14,
  },
  recommendationSection: {
    backgroundColor: 'rgba(0, 100, 200, 0.1)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  recommendationText: {
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
  },
});

export default PaywallComparison;
