import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { EmailAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { BRIDGE_DELAYS, createProductionSafeDelay, executeWithBridgeSafety } from '../utils/bridgeUtils';
import CrashLogger from '../utils/crashLogger';
import { useAuth } from './useAuth';

/**
 * Hook that provides authentication functions using the new stateless tokenAuthService
 * This is a compatibility layer for older code that used the class-based approach
 */
export const useAuthFunctions = () => {
  const { signIn: reduxSignIn, signUp: reduxSignUp, signOut: reduxSignOut, isAuthenticated } = useAuth();

  const signInWithGoogle = useCallback(async () => {
    return executeWithBridgeSafety(async () => {
      CrashLogger.logGoogleSignInStep('Starting Google Sign-In process');
      
      // CRITICAL: Check if Google Sign-In is properly configured before attempting to use it
      try {
        // Import configuration status from app layout
        const { getGoogleSignInStatus } = await import('../app/_layout');
        const configStatus = getGoogleSignInStatus();
        
        if (!configStatus.configured) {
          throw new Error(`Google Sign-In not configured: ${configStatus.error || 'Unknown configuration error'}`);
        }
        
        CrashLogger.logGoogleSignInStep('Google Sign-In configuration verified');
      } catch (configCheckError: any) {
        CrashLogger.recordError(configCheckError, 'GOOGLE_SIGNIN_CONFIG_CHECK');
        throw new Error(`Google Sign-In configuration error: ${configCheckError.message}`);
      }
      
      // Extended initial delay for physical devices in production
      await createProductionSafeDelay(BRIDGE_DELAYS.SAFE, true);
      
      // Check Google Sign-In availability (platform-specific)
      if (Platform.OS === 'android') {
        // Only check Play Services on Android
        try {
          await GoogleSignin.hasPlayServices();
          CrashLogger.logGoogleSignInStep('Google Play Services check passed (Android)');
        } catch (error) {
          CrashLogger.recordError(error as Error, 'GOOGLE_PLAY_SERVICES_CHECK');
          throw new Error('Google Play Services not available. Please update Google Play Services and try again.');
        }
      } else {
        // On iOS, just verify GoogleSignin is configured by checking current user
        try {
          // This will not throw if GoogleSignin is properly configured
          await GoogleSignin.getCurrentUser();
          CrashLogger.logGoogleSignInStep('Google Sign-In availability check passed (iOS)');
        } catch (error: any) {
          // This is expected if no user is signed in, which is fine
          if (error.message && (error.message.includes('not signed in') || error.message.includes('The user is not signed in'))) {
            CrashLogger.logGoogleSignInStep('Google Sign-In configured but no current user (iOS) - OK');
          } else {
            CrashLogger.recordError(error as Error, 'GOOGLE_SIGNIN_AVAILABILITY_CHECK');
            throw new Error(`Google Sign-In not properly configured for iOS: ${error.message}`);
          }
        }
      }
      
      // Critical bridge stabilization delay after service checks
      await createProductionSafeDelay(BRIDGE_DELAYS.CRITICAL, true);
      
      // Sign in with Google - this is where the crash was happening
      try {
        const userInfo = await GoogleSignin.signIn();
        CrashLogger.logGoogleSignInStep('Google Sign-In successful', { 
          hasIdToken: !!userInfo.data?.idToken,
          userEmail: userInfo.data?.user?.email 
        });
        
        // Get the ID token
        const idToken = userInfo.data?.idToken;
        if (!idToken) {
          throw new Error('No ID token received from Google Sign-In');
        }
        
        // Extended delay before Firebase operations - critical for physical devices
        await createProductionSafeDelay(BRIDGE_DELAYS.EXTENDED, true);
        
        // Create Firebase credential
        const credential = GoogleAuthProvider.credential(idToken);
        CrashLogger.logGoogleSignInStep('Firebase credential created');
        
        // Substantial delay before Firebase sign-in - most critical for bridge stability
        await createProductionSafeDelay(BRIDGE_DELAYS.EXTENDED, true);
        const user = await reduxSignIn(credential);
        CrashLogger.logGoogleSignInStep('Firebase authentication successful');
        
        // Final stabilization delay before returning - ensure all operations complete
        await createProductionSafeDelay(BRIDGE_DELAYS.CRITICAL, true);
        
        return user;
      } catch (signInError: any) {
        CrashLogger.recordError(signInError, 'GOOGLE_SIGNIN_NATIVE_ERROR');
        
        // Handle specific Google Sign-In errors
        if (signInError.message && signInError.message.includes('cancelled')) {
          throw new Error('Google Sign-In was cancelled by the user');
        } else if (signInError.message && signInError.message.includes('network')) {
          throw new Error('Network error during Google Sign-In. Please check your connection and try again.');
        } else {
          throw new Error(`Google Sign-In failed: ${signInError.message || 'Unknown error'}`);
        }
      }
      
    }, 'Google Sign-In', 1, 2000);
  }, [reduxSignIn]);

  const signIn = useCallback(async (email: string, password: string) => {
    return executeWithBridgeSafety(async () => {
      // Enhanced bridge stabilization delay for physical devices
      await createProductionSafeDelay(BRIDGE_DELAYS.SAFE);
      
      const credential = EmailAuthProvider.credential(email, password);
      
      // Critical delay before Firebase sign-in - essential for production devices
      await createProductionSafeDelay(BRIDGE_DELAYS.EXTENDED, true);
      
      return reduxSignIn(credential);
    }, 'Email/Password Sign-In', 1, 1500);
  }, [reduxSignIn]);

  const signUp = useCallback(async (email: string, password: string, additionalData?: any) => {
    try {
      return reduxSignUp(email, password, additionalData);
    } catch (error) {
      console.error('Email/password sign up error:', error);
      throw error;
    }
  }, [reduxSignUp]);

  const signOut = useCallback(async () => {
    try {
      await reduxSignOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [reduxSignOut]);

  // Return the authentication state
  const getAuthState = useCallback(() => {
    return { 
      isAuthenticated,
      // Add any other state properties needed for compatibility
    };
  }, [isAuthenticated]);

  return {
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    getAuthState,
    // Simple compatibility layer
    refreshTokens: async () => console.log('Token refresh handled by Redux auth'),
    isAuthenticated: () => isAuthenticated,
  };
};

export default useAuthFunctions;
