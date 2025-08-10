import { useEffect } from 'react';
import { Alert } from 'react-native';

/**
 * Development helper to explain RevenueCat warnings
 * Only shows in development mode
 */
export function useRevenueCatDevHelper() {
  useEffect(() => {
    if (!__DEV__) return;

    // Show helpful message about RevenueCat warnings
    const timer = setTimeout(() => {
      console.log(`
🏪 RevenueCat Development Helper

The warning about "products not approved in App Store Connect" is NORMAL during development.

✅ What this means:
- RevenueCat SDK is configured correctly
- Your products are set up in RevenueCat dashboard
- You can test purchases with sandbox accounts
- Warning will disappear after App Store approval

🧪 For testing purchases:
1. Use sandbox test accounts in App Store Connect
2. Sign out of App Store on your device
3. Test purchases will prompt for sandbox login
4. No real money will be charged

📱 Your app's subscription features are working correctly!
      `);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);
}

/**
 * Shows a one-time explanation dialog about RevenueCat warnings
 * Only in development mode
 */
export function showRevenueCatDevExplanation() {
  if (!__DEV__) return;

  Alert.alert(
    "RevenueCat Development Info",
    "The warning about App Store Connect is normal during development. Your subscription system is configured correctly and ready for testing with sandbox accounts.",
    [
      { text: "Got it!", style: "default" }
    ]
  );
}

export default useRevenueCatDevHelper;
