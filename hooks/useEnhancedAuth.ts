import { useCallback } from 'react';
import { useReduxAuth } from '../contexts/ReduxAuthProvider';
import { firebaseAuthService } from '../services/firebaseAuthService';

/**
 * Enhanced auth hook with Firebase v11 AsyncStorage workaround support
 * Provides comprehensive authentication functionality with proper token management
 */
export const useEnhancedAuth = () => {
  const reduxAuth = useReduxAuth();

  /**
   * Get current ID token with automatic refresh
   * Returns a valid token or null if user is not authenticated
   */
  const getCurrentIdToken = useCallback(async (): Promise<string | null> => {
    return await firebaseAuthService.getCurrentIdToken();
  }, []);

  /**
   * Get comprehensive authentication status
   * Includes token validity and expiry information
   */
  const getAuthStatus = useCallback(async () => {
    return await firebaseAuthService.getAuthStatus();
  }, []);

  /**
   * Sign out with comprehensive cleanup
   * Clears all tokens and state
   */
  const signOut = useCallback(async (): Promise<void> => {
    return await firebaseAuthService.signOut();
  }, []);

  /**
   * Check if user is authenticated with valid token
   * This goes beyond just checking if user exists - validates token freshness
   */
  const isAuthenticatedWithValidToken = useCallback(async (): Promise<boolean> => {
    const status = await getAuthStatus();
    return status.isAuthenticated && status.hasValidToken;
  }, [getAuthStatus]);

  return {
    // Redux auth state
    ...reduxAuth,
    
    // Enhanced token management
    getCurrentIdToken,
    getAuthStatus,
    signOut,
    isAuthenticatedWithValidToken,
    
    // Service instance for advanced usage
    authService: firebaseAuthService,
  };
};

/**
 * Hook for API requests that need authenticated tokens
 * Automatically handles token refresh and provides headers
 */
export const useAuthenticatedApi = () => {
  const { getCurrentIdToken, isAuthenticatedWithValidToken } = useEnhancedAuth();

  /**
   * Get headers with valid authentication token
   * Returns null if user is not authenticated or token is invalid
   */
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string> | null> => {
    try {
      const isValid = await isAuthenticatedWithValidToken();
      if (!isValid) {
        return null;
      }

      const token = await getCurrentIdToken();
      if (!token) {
        return null;
      }

      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return null;
    }
  }, [getCurrentIdToken, isAuthenticatedWithValidToken]);

  /**
   * Make authenticated fetch request
   * Automatically includes auth headers and handles token refresh
   */
  const authenticatedFetch = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    const authHeaders = await getAuthHeaders();
    
    if (!authHeaders) {
      throw new Error('User is not authenticated or token is invalid');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    });
  }, [getAuthHeaders]);

  return {
    getAuthHeaders,
    authenticatedFetch,
  };
};
