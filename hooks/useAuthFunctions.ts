import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { EmailAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import CrashLogger from '../utils/crashLogger';
import { useAuth } from './useAuth';

/**
 * Hook that provides authentication functions using the new stateless tokenAuthService
 * This is a compatibility layer for older code that used the class-based approach
 */
export const useAuthFunctions = () => {
  const { signIn: reduxSignIn, signUp: reduxSignUp, signOut: reduxSignOut, isAuthenticated } = useAuth();

  // Device-specific timing constants for production builds
  const DEVICE_DELAY_MULTIPLIER = __DEV__ ? 1 : 2; // Longer delays in production
  const BASE_BRIDGE_DELAY = 200;
  const CRITICAL_BRIDGE_DELAY = 500;
  const STABILIZATION_DELAY = 300;

  const signInWithGoogle = useCallback(async () => {
    try {
      CrashLogger.logGoogleSignInStep('Starting Google Sign-In process');
      
      // Extended initial delay for physical devices in production
      await new Promise(resolve => setTimeout(resolve, BASE_BRIDGE_DELAY * DEVICE_DELAY_MULTIPLIER));
      
      // Check if device supports Google Play Services (Android) or has GoogleSignin available (iOS)
      await GoogleSignin.hasPlayServices();
      CrashLogger.logGoogleSignInStep('Google Play Services check passed');
      
      // Critical bridge stabilization delay after Google Play Services check
      await new Promise(resolve => setTimeout(resolve, STABILIZATION_DELAY * DEVICE_DELAY_MULTIPLIER));
      
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
      await new Promise(resolve => setTimeout(resolve, CRITICAL_BRIDGE_DELAY * DEVICE_DELAY_MULTIPLIER));
      
      // Create Firebase credential
      const credential = GoogleAuthProvider.credential(idToken);
      CrashLogger.logGoogleSignInStep('Firebase credential created');
      
      // Substantial delay before Firebase sign-in - most critical for bridge stability
      await new Promise(resolve => setTimeout(resolve, CRITICAL_BRIDGE_DELAY * DEVICE_DELAY_MULTIPLIER));
      const user = await reduxSignIn(credential);
      CrashLogger.logGoogleSignInStep('Firebase authentication successful');
      
      // Final stabilization delay before returning - ensure all operations complete
      await new Promise(resolve => setTimeout(resolve, STABILIZATION_DELAY * DEVICE_DELAY_MULTIPLIER));
      
      return user;
    } catch (error: any) {
      CrashLogger.recordError(error, 'GOOGLE_SIGN_IN');
      console.error('Google sign in error:', error);
      
      // Handle specific error cases
      if (error.code === 'sign_in_cancelled') {
        throw new Error('Sign in was cancelled by user');
      } else if (error.code === 'sign_in_required') {
        throw new Error('Sign in is required but not available');
      } else if (error.code === 'play_services_not_available') {
        throw new Error('Google Play Services not available on this device');
      }
      
      throw error;
    }
  }, [reduxSignIn]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Enhanced bridge stabilization delay for physical devices
      await new Promise(resolve => setTimeout(resolve, BASE_BRIDGE_DELAY * DEVICE_DELAY_MULTIPLIER));
      
      const credential = EmailAuthProvider.credential(email, password);
      
      // Critical delay before Firebase sign-in - essential for production devices
      await new Promise(resolve => setTimeout(resolve, CRITICAL_BRIDGE_DELAY * DEVICE_DELAY_MULTIPLIER));
      
      return reduxSignIn(credential);
    } catch (error) {
      console.error('Email/password sign in error:', error);
      throw error;
    }
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
