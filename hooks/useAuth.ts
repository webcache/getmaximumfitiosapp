import { useCallback } from 'react';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { loadUserProfile, resetAuthState } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

/**
 * Hook that provides auth utilities with Redux integration
 * This replaces the old useAuth hook from AuthContext
 * Uses optimized selectors for better performance
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  
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
    try {
      await firebaseAuthService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback to clearing Redux state
      dispatch(resetAuthState());
    }
  }, [dispatch]);

  const refreshUserProfile = useCallback(async () => {
    if (user?.uid) {
      try {
        await dispatch(loadUserProfile(user.uid)).unwrap();
      } catch (error) {
        console.error('Refresh profile error:', error);
      }
    }
  }, [dispatch, user?.uid]);

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
