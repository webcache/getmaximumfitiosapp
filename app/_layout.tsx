import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { Provider, useDispatch, useSelector } from 'react-redux';
import '../firebase'; // Initialize Firebase BEFORE any services that use it
import '../polyfills'; // Import polyfills FIRST before any other imports
import { cleanupAuthListener } from '../services/tokenAuthService';
import { RootState, store } from '../store';
import { initializeApp } from '../store/authSlice';
import { setupReanimatedErrorHandler } from '../utils/reanimatedUtils';

// Set up error handling for Reanimated crashes
setupReanimatedErrorHandler();

// Configure Google Sign-In early in app initialization
try {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  
  console.log('🔧 Google Sign-In Configuration:', {
    webClientId: webClientId ? `${webClientId.substring(0, 20)}...` : 'NOT SET',
    iosClientId: iosClientId ? `${iosClientId.substring(0, 20)}...` : 'NOT SET',
    platform: Platform.OS
  });
  
  if (webClientId) {
    const config: any = {
      webClientId: webClientId,
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    };
    
    if (Platform.OS === 'ios' && iosClientId) {
      config.iosClientId = iosClientId;
      console.log('🍎 iOS Client ID configured for Google Sign-In');
    }

    GoogleSignin.configure(config);
    console.log('✅ Google Sign-In configured successfully');
    console.log('📱 Expected URL Scheme: com.googleusercontent.apps.424072992557-1iehcohe1bkudsr6qk4r85u13t9loa5o');
  } else {
    console.warn('⚠️ Google Web Client ID not found - Google Sign-In will not work');
  }
} catch (error) {
  console.error('❌ Failed to configure Google Sign-In:', error);
}

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
  const dispatch = useDispatch<any>();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  // Get actual Redux state
  const initialized = useSelector((state: RootState) => state.auth.initialized);
  const loading = useSelector((state: RootState) => state.auth.loading);
  
  // App is ready when fonts are loaded and auth state is initialized
  const appIsReady = fontsLoaded && initialized;

  // Initialize the app on mount
  useEffect(() => {
    console.log('Dispatching initializeApp...');
    dispatch(initializeApp());
  }, [dispatch]);

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
    />
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
