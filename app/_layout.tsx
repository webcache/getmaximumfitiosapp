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
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  
  console.log('🔧 iOS Google Sign-In Configuration:', {
    iosClientId: iosClientId ? `${iosClientId.substring(0, 20)}...` : 'NOT SET',
    platform: Platform.OS
  });
  
  if (iosClientId && Platform.OS === 'ios') {
    // Add a delay to ensure native modules are fully loaded
    setTimeout(() => {
      try {
        const config: any = {
          iosClientId: iosClientId,
          offlineAccess: true,
          hostedDomain: '',
          forceCodeForRefreshToken: true,
        };

        console.log('🍎 iOS Google Sign-In configured with iOS Client ID');
        console.log('📱 URL Scheme: com.googleusercontent.apps.424072992557-1iehcohe1bkudsr6qk4r85u13t9loa5o');

        GoogleSignin.configure(config);
        console.log('✅ Google Sign-In configured successfully for iOS');
      } catch (configError) {
        console.error('❌ Failed to configure Google Sign-In in delayed setup:', configError);
      }
    }, 100);
  } else {
    console.warn('⚠️ Google iOS Client ID not found or not iOS platform - Google Sign-In will not work');
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
    // Google Sign-In related warnings
    'RNGoogleSignIn',
    'GoogleSignIn',
    'invalid_audience',
    'oauth_token',
    'appauth',
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
  
  // Get actual Redux state with safety guards
  const initialized = useSelector((state: RootState) => state.auth.initialized);
  const loading = useSelector((state: RootState) => state.auth.loading);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);
  
  // App is ready when fonts are loaded and auth state is initialized
  const appIsReady = fontsLoaded && initialized;

  // Initialize the app on mount
  useEffect(() => {
    console.log('Dispatching initializeApp...');
    try {
      dispatch(initializeApp());
    } catch (initError) {
      console.error('❌ Failed to initialize app:', initError);
    }
  }, [dispatch]);

  // Log the current state for debugging
  useEffect(() => {
    console.log('AppContent state:', { 
      fontsLoaded, 
      initialized, 
      loading, 
      appIsReady, 
      isAuthenticated,
      hasUser: !!user 
    });
  }, [fontsLoaded, initialized, loading, appIsReady, isAuthenticated, user]);

  useEffect(() => {
    if (appIsReady) {
      // Hide the splash screen now that the app is ready - with error handling
      console.log('App is ready! Hiding splash screen...');
      try {
        SplashScreen.hideAsync().catch(error => {
          console.warn('Failed to hide splash screen:', error);
        });
      } catch (splashError) {
        console.warn('Error hiding splash screen:', splashError);
      }
    }
  }, [appIsReady]);

  // Auth state guard - don't render until we have stable auth state
  if (!fontsLoaded) {
    console.log('Fonts not loaded yet...');
    return null;
  }

  if (!initialized) {
    console.log('App not initialized yet...', { loading });
    return null;
  }

  // Additional safety: ensure we don't crash if Redux state is inconsistent
  if (isAuthenticated && !user) {
    console.warn('⚠️ Auth state inconsistent: authenticated but no user data');
    return null;
  }

  console.log('Rendering app navigation...');

  // Wrap navigation in try-catch to prevent bridge crashes
  try {
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
  } catch (navigationError) {
    console.error('❌ Navigation rendering error:', navigationError);
    return null;
  }
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
