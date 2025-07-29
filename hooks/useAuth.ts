import { router } from 'expo-router';
import { AuthCredential } from 'firebase/auth';
import { useCallback } from 'react';
import {
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
        // Optional: handle successful sign-in navigation or side-effects
        router.replace('/(tabs)/dashboard');
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
  };
};
