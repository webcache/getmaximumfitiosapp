// Import polyfills FIRST before any other imports
import '../polyfills';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import AuthProvider, { useAuth } from '../contexts/AuthContext';
import '../firebase'; // Initialize Firebase AFTER polyfills
import { setupReanimatedErrorHandler } from '../utils/reanimatedUtils';

// Set up error handling for Reanimated crashes
setupReanimatedErrorHandler();

// Google Sign-In Configuration Flag
let googleSignInConfigured = false;
let googleConfigError: string | null = null;

// Configure Google Sign-In early in app initialization with enhanced error handling
try {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  
  console.log('🔧 iOS Google Sign-In Configuration:', {
    iosClientId: iosClientId ? `${iosClientId.substring(0, 20)}...` : 'NOT SET',
    webClientId: webClientId ? `${webClientId.substring(0, 20)}...` : 'NOT SET',
    platform: Platform.OS
  });
  
  if (!iosClientId) {
    googleConfigError = 'Google iOS Client ID not found in environment variables';
    console.warn('⚠️ Google Sign-In disabled:', googleConfigError);
  } else if (!webClientId) {
    googleConfigError = 'Google Web Client ID not found in environment variables';
    console.warn('⚠️ Google Sign-In disabled:', googleConfigError);
  } else if (Platform.OS !== 'ios') {
    googleConfigError = 'Platform is not iOS';
    console.warn('⚠️ Google Sign-In disabled:', googleConfigError);
  } else {
    // Add a longer delay to ensure native modules are fully loaded
    setTimeout(() => {
      try {
        // Validate client ID format
        if (!iosClientId.includes('.apps.googleusercontent.com')) {
          throw new Error('Invalid iOS Client ID format');
        }
        if (!webClientId.includes('.apps.googleusercontent.com')) {
          throw new Error('Invalid Web Client ID format');
        }

        // Only use web client ID in development or simulator
        // Physical devices should use iOS client ID only to prevent auth issues
        const isSimulator = __DEV__ || process.env.NODE_ENV !== 'production';

        const config: any = {
          iosClientId: iosClientId,
          hostedDomain: '',
          forceCodeForRefreshToken: true,
        };

        // Conditionally add web client ID and offline access only for development/simulator
        if (isSimulator && webClientId) {
          config.webClientId = webClientId;
          config.offlineAccess = true; // Only enable offline access when we have web client ID
          console.log('🍎 Configuring Google Sign-In with iOS and Web Client IDs + Offline Access (Development/Simulator)');
        } else {
          config.offlineAccess = false; // Disable offline access for production/physical devices
          console.log('🍎 Configuring Google Sign-In with iOS Client ID only + No Offline Access (Production/Physical Device)');
        }
        console.log('📱 URL Scheme: com.googleusercontent.apps.424072992557-1iehcohe1bkudsr6qk4r85u13t9loa5o');

        GoogleSignin.configure(config);
        googleSignInConfigured = true;
        console.log('✅ Google Sign-In configured successfully for iOS');
        
        // Test configuration immediately
        setTimeout(async () => {
          try {
            await GoogleSignin.getCurrentUser();
            console.log('✅ Google Sign-In configuration test passed');
          } catch {
            console.log('ℹ️ Google Sign-In configuration test - no current user (expected)');
          }
        }, 500);
        
      } catch (error) {
        googleConfigError = `Configuration failed: ${error}`;
        googleSignInConfigured = false;
        console.error('❌ Failed to configure Google Sign-In in delayed setup:', error);
      }
    }, 300); // Increased delay
  }
} catch (error) {
  googleConfigError = `Setup failed: ${error}`;
  googleSignInConfigured = false;
  console.error('❌ Failed to configure Google Sign-In:', error);
}

// Export configuration status for diagnostic use
export const getGoogleSignInStatus = () => ({
  configured: googleSignInConfigured,
  error: googleConfigError
});

// Development hot reload cleanup
if (__DEV__) {
  // Clean up auth listeners on hot reload to prevent duplicates
  // Note: AuthContext now handles this automatically
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

// Inner component that uses AuthContext for session state
function AppContent() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const { user, loading, initialized } = useAuth();

  // App is ready when fonts are loaded and auth state is initialized
  const appIsReady = fontsLoaded && initialized;

  // Log the current state for debugging
  useEffect(() => {
    console.log('AppContent state:', { 
      fontsLoaded, 
      initialized, 
      loading, 
      appIsReady, 
      hasUser: !!user 
    });
  }, [fontsLoaded, initialized, loading, appIsReady, user]);

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

  // Additional safety: ensure we don't crash if auth state is inconsistent
  if (user === null && !loading) {
    console.warn('⚠️ Auth state inconsistent: no user and not loading');
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
