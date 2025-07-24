import { useCallback } from 'react';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { loadUserProfile, resetAuthState } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

/**
 * Hook that provides auth utilities with Redux integration
 * This replaces the old useAuth hook from AuthContext
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

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
    if (authState.user?.uid) {
      try {
        await dispatch(loadUserProfile(authState.user.uid)).unwrap();
      } catch (error) {
        console.error('Refresh profile error:', error);
      }
    }
  }, [dispatch, authState.user?.uid]);

  return {
    // Auth state
    user: authState.user,
    userProfile: authState.userProfile,
    isAuthenticated: authState.isAuthenticated,
    loading: authState.loading,
    error: authState.error,
    initialized: authState.initialized,
    
    // Actions
    signOut: signOutWithRedux,
    refreshUserProfile,
  };
};
