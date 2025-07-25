import { useCallback } from 'react';
import TokenAuthService from '../services/tokenAuthService';

/**
 * Hook that provides authentication functions using TokenAuthService
 * This is the main hook for authentication actions in the app
 */
export const useAuthFunctions = () => {
  const tokenAuthService = TokenAuthService.getInstance();

  const signInWithGoogle = useCallback(async () => {
    try {
      return await tokenAuthService.signInWithGoogle();
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }, [tokenAuthService]);

  const signOut = useCallback(async () => {
    try {
      await tokenAuthService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [tokenAuthService]);

  const refreshTokens = useCallback(async () => {
    try {
      return await tokenAuthService.refreshTokens();
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }, [tokenAuthService]);

  const isAuthenticated = useCallback(async () => {
    try {
      return await tokenAuthService.isAuthenticated();
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }, [tokenAuthService]);

  const getAuthState = useCallback(() => {
    return tokenAuthService.getAuthState();
  }, [tokenAuthService]);

  return {
    signInWithGoogle,
    signOut,
    refreshTokens,
    isAuthenticated,
    getAuthState,
  };
};

export default useAuthFunctions;
