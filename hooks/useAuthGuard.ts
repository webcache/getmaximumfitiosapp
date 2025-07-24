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
    // Wait for auth system to be fully initialized and persistence restored
    if (!initialized || !persistenceRestored) {
      setIsReady(false);
      return;
    }

    // Auth system is ready, now check authentication status
    if (!loading) {
      setIsReady(true);
      
      // Only redirect if we're definitely not authenticated and not loading
      if (!isAuthenticated || !user) {
        router.replace('/login/loginScreen');
        return;
      }
    } else {
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
