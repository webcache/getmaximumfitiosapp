import { EmailAuthProvider } from 'firebase/auth';
import { useCallback } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook that provides authentication functions using the new stateless tokenAuthService
 * This is a compatibility layer for older code that used the class-based approach
 */
export const useAuthFunctions = () => {
  const { signIn: reduxSignIn, signUp: reduxSignUp, signOut: reduxSignOut, isAuthenticated } = useAuth();

  const signInWithGoogle = useCallback(async () => {
    try {
      // This would need a proper implementation depending on your Google Auth setup
      console.warn('Google Sign In not implemented in useAuthFunctions');
      return null;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const credential = EmailAuthProvider.credential(email, password);
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
