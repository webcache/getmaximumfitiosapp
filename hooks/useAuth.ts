import { router } from 'expo-router';
import { AuthCredential } from 'firebase/auth';
import { useCallback } from 'react';
import {
    loadUserProfile,
    signInWithCredential,
    signOutUser,
    signUpWithEmail,
    UserProfile,
} from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

// Auth hook that provides a clean and centralized API for authentication
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const {
    user,
    userProfile,
    isAuthenticated,
    loading,
    error,
    initialized,
    persistenceRestored,
  } = useAppSelector((state) => state.auth);

  const signIn = useCallback(
    async (credential: AuthCredential) => {
      const result = await dispatch(signInWithCredential(credential));
      if (signInWithCredential.fulfilled.match(result)) {
        // Add substantial delay to allow bridge to stabilize before navigation
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Navigate after bridge stabilization with error handling
        try {
          router.replace('/(tabs)/dashboard');
        } catch (navError) {
          console.warn('Navigation error after sign-in:', navError);
          // Fallback: try navigation after another delay
          setTimeout(() => {
            try {
              router.replace('/(tabs)/dashboard');
            } catch (retryError) {
              console.error('Navigation retry failed:', retryError);
            }
          }, 1500);
        }
      }
      return result;
    },
    [dispatch]
  );

  const signUp = useCallback(
    async (email: string, password: string, profileData: Partial<UserProfile>) => {
      return dispatch(signUpWithEmail({ email, password, profileData }));
    },
    [dispatch]
  );

  const signOut = useCallback(async () => {
    await dispatch(signOutUser());
    router.replace('/login/loginScreen');
  }, [dispatch]);

  const refreshUserProfile = useCallback(async () => {
    if (user?.uid) {
      await dispatch(loadUserProfile(user.uid));
    }
  }, [dispatch, user?.uid]);

  return {
    user,
    userProfile,
    isAuthenticated,
    loading,
    error,
    initialized,
    persistenceRestored,
    signIn,
    signOut,
    signUp,
    refreshUserProfile,
  };
};
