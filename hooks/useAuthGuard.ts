import { useEffect, useState } from 'react';
import { useReduxAuth } from '../contexts/ReduxAuthProvider';

/**
 * Custom hook to handle authentication state and navigation guards
 * Prevents error loops by properly handling loading states and persistence restoration
 * 
 * WARNING: This hook should NOT perform navigation automatically as it conflicts
 * with the centralized navigation in app/index.tsx. Only use for auth status checks.
 */
export const useAuthGuard = () => {
  const { user, userProfile, isAuthenticated, loading, initialized, persistenceRestored } = useReduxAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for auth system to be fully initialized and persistence restored
    if (!initialized || !persistenceRestored) {
      setIsReady(false);
      return;
    }

    // Auth system is ready
    if (!loading) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [user, isAuthenticated, loading, initialized, persistenceRestored, userProfile]);

  return {
    isReady,
    user,
    userProfile,
    isAuthenticated,
    loading,
    initialized,
    persistenceRestored
  };
};
