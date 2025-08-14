import { router } from 'expo-router';
import { useEffect } from 'react';
import SmartPaywall from '../components/SmartPaywall';

/**
 * Premium Upgrade Screen - Now powered by RevenueCat
 * 
 * This screen now uses the SmartPaywall component which:
 * - Presents RevenueCat's optimized native paywall
 * - Automatically falls back to custom paywall if needed
 * - Provides better conversion rates and analytics
 * 
 * The original custom paywall is archived as Archived_premiumUpgrade.tsx
 */
export default function PremiumUpgradeScreen() {
  useEffect(() => {
    // Present the RevenueCat paywall immediately when this screen loads
    const presentPaywall = async () => {
      await SmartPaywall.presentForContext('upgrade_button', {
        onSuccess: () => {
          // User successfully purchased
          router.back();
        },
        onCancel: () => {
          // User cancelled
          router.back();
        },
        onError: (error) => {
          console.error('Smart paywall error:', error);
          router.back();
        }
      });
    };

    presentPaywall();
  }, []);

  // This screen is now just a trigger for the RevenueCat paywall
  // The actual UI is handled by RevenueCat's native modal
  return null;
}
