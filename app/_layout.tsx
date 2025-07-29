import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { Provider, useSelector } from 'react-redux';
import '../polyfills'; // Import polyfills FIRST before any other imports
import { cleanupAuthListener } from '../services/tokenAuthService';
import { RootState, store } from '../store';
import { setupReanimatedErrorHandler } from '../utils/reanimatedUtils';

// Set up error handling for Reanimated crashes
setupReanimatedErrorHandler();

// Development hot reload cleanup
if (__DEV__) {
  // Clean up auth listeners on hot reload to prevent duplicates
  cleanupAuthListener();
}

// Safe LogBox import and usage for test environments
let LogBox: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  LogBox = require('react-native').LogBox;
} catch {
  LogBox = null;
}

// Ignore specific Firebase warnings that can't be fixed in the current environment
// Safe check for LogBox availability (might not be available in test environment)
if (LogBox && typeof LogBox.ignoreLogs === 'function') {
  LogBox.ignoreLogs([
    'Setting a timer for a long period of time',
    'AsyncStorage has been extracted from react-native core',
    'AsyncStorage',  // General AsyncStorage warnings
    '@react-native-async-storage',  // Package-specific warnings
    'We recommend react-native-async-storage',  // Migration warnings
    'Use `@react-native-async-storage/async-storage`',  // Migration warnings
    'Component auth has not been registered yet',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
    'onAnimatedValueUpdate',
    'Animated:',  // Animated related warnings
    'RCTBridge',  // React Native bridge warnings
    'Warning: ...',  // Generic warning pattern
    '[firebase/auth]',  // Firebase auth warnings
    'firebase/auth:Auth',  // Specific Firebase v11 auth warnings
    'FirebaseError:',  // Firebase general errors that may be handled elsewhere
    // Reanimated-specific warnings and errors
    'reanimated',
    'REANodesManager',
    'Animation cleanup error',
    'Reanimated operation failed',
    'Reanimated error caught',
  ]);
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Inner component that has access to Redux store
function AppContent() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  // Get actual Redux state
  const initialized = useSelector((state: RootState) => state.auth.initialized);
  const loading = useSelector((state: RootState) => state.auth.loading);
  
  // App is ready when fonts are loaded and auth state is initialized
  const appIsReady = fontsLoaded && initialized;

  // Log the current state for debugging
  useEffect(() => {
    console.log('AppContent state:', { fontsLoaded, initialized, loading, appIsReady });
  }, [fontsLoaded, initialized, loading, appIsReady]);

  useEffect(() => {
    if (appIsReady) {
      // Hide the splash screen now that the app is ready
      console.log('App is ready! Hiding splash screen...');
      SplashScreen.hideAsync().catch(error => {
        console.warn('Failed to hide splash screen:', error);
      });
    }
  }, [appIsReady]);

  // Show loading while fonts are loading or app is initializing
  if (!fontsLoaded) {
    console.log('Fonts not loaded yet...');
    return null;
  }

  if (!initialized) {
    console.log('App not initialized yet...', { loading });
    return null;
  }

  console.log('Rendering app navigation...');

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'default',
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            headerShown: false,
            animation: 'default',
          }} 
        />
        <Stack.Screen 
          name="login/loginScreen" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
            animation: 'default',
          }} 
        />
        <Stack.Screen 
          name="+not-found" 
          options={{ 
            headerShown: false,
            animation: 'default',
          }} 
        />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
