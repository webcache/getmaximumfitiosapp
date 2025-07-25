import { useCallback } from 'react';
import { useAppSelector } from '../store/hooks';

// DEPRECATED: This hook is deprecated. Use useAuthFunctions instead.
// This version is kept for backward compatibility but doesn't call deprecated services.

/**
 * DEPRECATED Enhanced auth hook with Firebase v11 AsyncStorage workaround support
 * Provides comprehensive authentication functionality with proper token management
 * Uses optimized Redux selectors for better performance
 * 
 * @deprecated Use useAuthFunctions and useAuthState instead
 */
export const useEnhancedAuth = () => {
  console.warn('⚠️ useEnhancedAuth is deprecated. Use useAuthFunctions and useAuthState instead.');
  
  // Use individual selectors for optimal performance
  const user = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.auth.userProfile);
  const tokens = useAppSelector((state) => state.auth.tokens);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const loading = useAppSelector((state) => state.auth.loading);
  const error = useAppSelector((state) => state.auth.error);
  const initialized = useAppSelector((state) => state.auth.initialized);
  const persistenceRestored = useAppSelector((state) => state.auth.persistenceRestored);

  // DEPRECATED: Return cached token from Redux
  const getCurrentIdToken = useCallback(async (): Promise<string | null> => {
    console.warn('⚠️ useEnhancedAuth.getCurrentIdToken is deprecated. Use tokens from useAuthState instead.');
    return tokens.idToken || null;
  }, [tokens.idToken]);

  // DEPRECATED: Return simple auth status
  const getAuthStatus = useCallback(async () => {
    console.warn('⚠️ useEnhancedAuth.getAuthStatus is deprecated. Use useAuthState instead.');
    return {
      isAuthenticated,
      hasValidToken: !!tokens.idToken,
      user,
      tokenExpiry: tokens.tokenExpiry,
      needsRefresh: false,
    };
  }, [isAuthenticated, tokens, user]);

  // DEPRECATED: Simple sign out that only clears Redux
  const signOut = useCallback(async (): Promise<void> => {
    console.warn('⚠️ useEnhancedAuth.signOut is deprecated. Use useAuthFunctions.signOut instead.');
    // Don't call deprecated firebaseAuthService - this will be handled by useAuthFunctions
    console.log('Sign out called on deprecated hook - no action taken');
  }, []);

  const isAuthenticatedWithValidToken = useCallback(async (): Promise<boolean> => {
    console.warn('⚠️ useEnhancedAuth.isAuthenticatedWithValidToken is deprecated.');
    return isAuthenticated && !!tokens.idToken;
  }, [isAuthenticated, tokens.idToken]);

  const refreshUserToken = useCallback(async (): Promise<string | null> => {
    console.warn('⚠️ useEnhancedAuth.refreshUserToken is deprecated.');
    return tokens.idToken || null;
  }, [tokens.idToken]);

  const hasValidCachedCredentials = useCallback(async (): Promise<boolean> => {
    console.warn('⚠️ useEnhancedAuth.hasValidCachedCredentials is deprecated.');
    return isAuthenticated && !!tokens.idToken;
  }, [isAuthenticated, tokens.idToken]);

  const shouldAttemptAutoSignIn = useCallback(async (): Promise<boolean> => {
    console.warn('⚠️ useEnhancedAuth.shouldAttemptAutoSignIn is deprecated.');
    return false; // Auto sign-in is handled by TokenAuthService
  }, []);

  const initializeAuthService = useCallback(async (): Promise<void> => {
    console.warn('⚠️ useEnhancedAuth.initializeAuthService is deprecated. Auth initialization is handled automatically.');
    // Auth initialization is handled by ReduxAuthProvider
  }, []);

  return {
    // Auth state
    user,
    userProfile,
    tokens,
    isAuthenticated,
    loading,
    error,
    initialized,
    persistenceRestored,

    // DEPRECATED functions (safe no-ops or Redux-only)
    getCurrentIdToken,
    getAuthStatus,
    signOut,
    isAuthenticatedWithValidToken,
    refreshUserToken,
    hasValidCachedCredentials,
    shouldAttemptAutoSignIn,
    initializeAuthService,

    // Computed values
    isReady: initialized && persistenceRestored && !loading,
    hasValidUser: !!user && isAuthenticated,
    hasProfile: !!userProfile,
    currentIdToken: tokens.idToken,
    currentAccessToken: tokens.accessToken,
    currentRefreshToken: tokens.refreshToken,
    tokenExpiry: tokens.tokenExpiry,
  };
};

/**
 * DEPRECATED Hook for authenticated API calls
 * @deprecated Use useAuthState to get tokens directly
 */
export const useAuthenticatedApi = () => {
  console.warn('⚠️ useAuthenticatedApi is deprecated. Use useAuthState to get tokens directly.');
  
  const { getCurrentIdToken, isAuthenticatedWithValidToken } = useEnhancedAuth();

  const makeAuthenticatedRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    console.warn('⚠️ useAuthenticatedApi.makeAuthenticatedRequest is deprecated.');
    
    const isAuth = await isAuthenticatedWithValidToken();
    if (!isAuth) {
      throw new Error('User not authenticated');
    }

    const token = await getCurrentIdToken();
    if (!token) {
      throw new Error('No valid token available');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }, [getCurrentIdToken, isAuthenticatedWithValidToken]);

  return {
    makeAuthenticatedRequest,
    getCurrentIdToken,
    isAuthenticatedWithValidToken,
  };
};
