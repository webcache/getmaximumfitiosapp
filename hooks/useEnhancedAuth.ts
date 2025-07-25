import { useCallback } from 'react';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { useAppSelector } from '../store/hooks';

/**
 * Enhanced auth hook with Firebase v11 AsyncStorage workaround support
 * Provides comprehensive authentication functionality with proper token management
 * Uses optimized Redux selectors for better performance
 */
export const useEnhancedAuth = () => {
  // Use individual selectors for optimal performance
  const user = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.auth.userProfile);
  const tokens = useAppSelector((state) => state.auth.tokens);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const loading = useAppSelector((state) => state.auth.loading);
  const error = useAppSelector((state) => state.auth.error);
  const initialized = useAppSelector((state) => state.auth.initialized);
  const persistenceRestored = useAppSelector((state) => state.auth.persistenceRestored);

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
    // Auth state (Firebase User - authentication data)
    user,
    
    // Profile state (Firestore profile - user-created data)
    userProfile,
    
    // Authentication tokens
    tokens,
    
    // Status flags
    isAuthenticated,
    loading,
    error,
    initialized,
    persistenceRestored,
    
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
