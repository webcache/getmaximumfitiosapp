import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useReduxAuth } from '../contexts/ReduxAuthProvider';

/**
 * Custom hook to handle authentication state and navigation guards
 * Prevents error loops by properly handling loading states and persistence restoration
 */
export const useAuthGuard = () => {
  const router = useRouter();
  const { user, userProfile, isAuthenticated, loading, initialized, persistenceRestored } = useReduxAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('🔒 Auth Guard State:', {
      user: user?.uid || 'none',
      isAuthenticated,
      loading,
      initialized,
      persistenceRestored,
      userProfile: userProfile?.email || 'none'
    });

    // Wait for auth system to be fully initialized and persistence restored
    if (!initialized || !persistenceRestored) {
      console.log('🔒 Auth Guard: Waiting for initialization...');
      setIsReady(false);
      return;
    }

    // Auth system is ready, now check authentication status
    if (!loading) {
      setIsReady(true);
      
      // Only redirect if we're definitely not authenticated and not loading
      if (!isAuthenticated || !user) {
        console.log('🔒 Auth Guard: User not authenticated, redirecting to login...');
        router.replace('/login/loginScreen');
        return;
      }
      
      console.log('🔒 Auth Guard: User authenticated, allowing access');
    } else {
      console.log('🔒 Auth Guard: Auth loading, waiting...');
      setIsReady(false);
    }
  }, [user, isAuthenticated, loading, initialized, persistenceRestored, router, userProfile]);

  return {
    isReady,
    user,
    userProfile,
    isAuthenticated,
    loading
  };
};
