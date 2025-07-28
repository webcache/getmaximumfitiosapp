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
import { RootState } from '../store';
// Temporarily disable Reanimated error handler
// import { setupReanimatedErrorHandler } from '../utils/reanimatedUtils';

// Set up error handling for Reanimated crashes
// setupReanimatedErrorHandler();

// Safe LogBox import and usage for test environments
let LogBox: any;
try {
  LogBox = require('react-native').LogBox;
} catch (e) {
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
      authInitialized: authState.initialized,
      authLoading: authState.loading,
      persistenceRestored: authState.persistenceRestored
    });
    
    // Consider app ready when fonts are loaded AND auth is no longer loading
    const isReady = loaded && authState.persistenceRestored && !authState.loading;
    
    if (isReady && !appReady) {
      setAppReady(true);
      const hideSplashScreen = async () => {
        try {
          // Small delay to ensure UI is ready
          await new Promise(resolve => setTimeout(resolve, 200));
          await SplashScreen.hideAsync();
          console.log('✅ Splash screen hidden - app ready');
        } catch (error) {
          console.warn('Failed to hide splash screen:', error);
        }
      };

      hideSplashScreen();
    }
  }, [loaded, authState.initialized, authState.loading, authState.persistenceRestored, appReady]);

  // Fallback timeout to prevent infinite loading (reduced to 5 seconds since proper state management is in place)
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!appReady) {
        console.log('⚠️ Fallback timeout reached - hiding splash screen');
        setAppReady(true);
        SplashScreen.hideAsync().catch(error => {
          console.warn('Fallback splash screen hide failed:', error);
        });
      }
    }, 5000); // 5 second fallback

    return () => clearTimeout(fallbackTimer);
  }, [appReady]);

  // Don't render app content until fonts are loaded
  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen 
          name="login/loginScreen" 
          options={{ 
            headerShown: true,
            title: 'GetMaximumFit',
            headerStyle: {
              backgroundColor: '#F8F8F8',
            },
            headerTintColor: '#020202',
            headerShadowVisible: false,
          }} 
        />
        <Stack.Screen 
          name="exerciseBrowserScreen" 
          options={{ 
            headerShown: true,
            title: 'Exercise Library',
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: '#F8F8F8',
            },
            headerTintColor: '#020202',
            headerShadowVisible: false,
          }} 
        />
        <Stack.Screen 
          name="exerciseDetail" 
          options={{ 
            headerShown: true,
            title: 'Exercise Detail',
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: '#F8F8F8',
            },
            headerTintColor: '#020202',
            headerShadowVisible: false,
          }} 
        />
        <Stack.Screen 
          name="myExercises" 
          options={{ 
            headerShown: true,
            title: 'My Exercises',
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: '#F8F8F8',
            },
            headerTintColor: '#020202',
            headerShadowVisible: false,
          }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen name="+not-found" options={{ headerShown: true }} />
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
