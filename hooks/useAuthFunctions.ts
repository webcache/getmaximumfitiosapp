import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { EmailAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import { useCallback } from 'react';
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
      
      // Extended initial delay for physical devices in production
      await createProductionSafeDelay(BRIDGE_DELAYS.SAFE, true);
      
      // Check if device supports Google Play Services (Android) or has GoogleSignin available (iOS)
      await GoogleSignin.hasPlayServices();
      CrashLogger.logGoogleSignInStep('Google Play Services check passed');
      
      // Critical bridge stabilization delay after Google Play Services check
      await createProductionSafeDelay(BRIDGE_DELAYS.CRITICAL, true);
      
      // Sign in with Google
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
