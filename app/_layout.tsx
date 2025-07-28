import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
// Temporarily disable Reanimated import to test for crash
// import 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { ReduxAuthProvider } from '../contexts/ReduxAuthProvider';
import '../polyfills'; // Import polyfills FIRST before any other imports
import TokenAuthService from '../services/tokenAuthService';
import { RootState } from '../store';
// Temporarily disable Reanimated error handler
// import { setupReanimatedErrorHandler } from '../utils/reanimatedUtils';

// Set up error handling for Reanimated crashes
// setupReanimatedErrorHandler();

// Development hot reload cleanup
if (__DEV__) {
  // Reset singletons on hot reload to prevent stale state
  TokenAuthService.resetInstance();
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
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  // Get auth initialization state from Redux
  const authState = useSelector((state: RootState) => state.auth);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    console.log('🔍 App initialization check:', { 
      loaded, 
      appReady
    });
    
    // Simplified initialization - just wait for fonts to load
    if (loaded && !appReady) {
      console.log('✅ Setting app ready - fonts loaded');
      setAppReady(true);
      
      // Hide splash screen after fonts load
      setTimeout(async () => {
        try {
          await SplashScreen.hideAsync();
          console.log('✅ Splash screen hidden - app ready');
        } catch (error) {
          console.warn('Failed to hide splash screen:', error);
        }
      }, 200);
    }
  }, [loaded, appReady]); // Remove authState dependencies to prevent loops

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.log('⚠️ Fallback timeout reached');
      if (!loaded) {
        console.log('⚠️ Fonts not loaded after timeout - proceeding anyway');
        setAppReady(true);
        SplashScreen.hideAsync().catch(error => {
          console.warn('Fallback splash screen hide failed:', error);
        });
      }
    }, 5000); // 5 second fallback only if fonts don't load

    return () => clearTimeout(fallbackTimer);
  }, []); // Empty dependency array - only run once

  // Don't render app content until fonts are loaded
  if (!loaded) {
    return null;
  }

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
          name="exerciseBrowserScreen" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="exerciseDetail" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="myExercises" 
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
    <ReduxAuthProvider>
      <AppContent />
    </ReduxAuthProvider>
  );
}
