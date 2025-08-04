// Polyfill for TextEncoder/TextDecoder in React Native
import 'fast-text-encoding';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import AppErrorBoundary from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';

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

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login/loginScreen" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
