import { useCallback } from 'react';
import { resetAuthState } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

// DEPRECATED: This hook is deprecated. Use useAuthFunctions instead.
// This version is kept for backward compatibility but delegates to Redux state.

/**
 * DEPRECATED Hook that provides auth utilities with Redux integration
 * This replaces the old useAuth hook from AuthContext
 * Uses optimized selectors for better performance
 * 
 * @deprecated Use useAuthFunctions and useAuthState instead
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  
  console.warn('⚠️ useAuth is deprecated. Use useAuthFunctions and useAuthState instead.');
  
  // Use individual selectors for optimal performance
  const user = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.auth.userProfile);
  const tokens = useAppSelector((state) => state.auth.tokens);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const loading = useAppSelector((state) => state.auth.loading);
  const error = useAppSelector((state) => state.auth.error);
  const initialized = useAppSelector((state) => state.auth.initialized);
  const persistenceRestored = useAppSelector((state) => state.auth.persistenceRestored);

  const signOutWithRedux = useCallback(async () => {
    console.warn('⚠️ useAuth.signOut is deprecated. Use useAuthFunctions.signOut instead.');
    try {
      // Only clear Redux state - don't call deprecated firebaseAuthService
      dispatch(resetAuthState());
    } catch (error) {
      console.error('Error in deprecated signOut:', error);
      dispatch(resetAuthState());
    }
  }, [dispatch]);

  const refreshUserProfile = useCallback(async () => {
    console.warn('⚠️ useAuth.refreshUserProfile is deprecated. Profile loading is handled automatically.');
    // Profile loading is now handled automatically by the auth services
    return Promise.resolve();
  }, []);

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
    
    // Actions
    signOut: signOutWithRedux,
    refreshUserProfile,
  };
};
