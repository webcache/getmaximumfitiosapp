// Polyfill for TextEncoder/TextDecoder in React Native
import 'fast-text-encoding';

// Import expo-constants early to ensure it's initialized before expo-linking
import Constants from 'expo-constants';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import AppErrorBoundary from '../components/ErrorBoundary';
import { getRevenueCatApiKey } from '../config/revenuecat';
import { AuthProvider } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';

// Conditionally load expo-dev-menu only in development environment
// This uses a runtime check to avoid bundler resolution issues
if (__DEV__ && typeof window !== 'undefined') {
  try {
    require('expo-dev-menu');
  } catch (e) {
    // Fail silently if expo-dev-menu is not available
    console.log('expo-dev-menu not available in this environment');
  }
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Debug log Constants to ensure it's working
  useEffect(() => {
    console.log('📱 App Initialization:', {
      isDev: __DEV__,
      scheme: Constants.expoConfig?.scheme,
      revenueCatKey: getRevenueCatApiKey() ? '✅ Configured' : '❌ Missing'
    });
    
    // Log RevenueCat status for development
    if (__DEV__) {
      const apiKey = getRevenueCatApiKey();
      if (apiKey && !apiKey.includes('XXXXXXXXXXXXXXXX')) {
        console.log('🏪 RevenueCat: API key configured for development');
        console.log('ℹ️ App Store Connect warnings are normal during development');
      } else {
        console.warn('⚠️ RevenueCat: API key not configured');
      }
    }
  }, []);

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // Get RevenueCat API key with fallback for development
  const revenueCatApiKey = getRevenueCatApiKey();
  
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider apiKey={revenueCatApiKey || ''}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login/loginScreen" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </SubscriptionProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
