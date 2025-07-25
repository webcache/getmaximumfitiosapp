import { useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';

/**
 * Custom hook to handle authentication state and navigation guards
 * Prevents error loops by properly handling loading states and persistence restoration
 * Uses optimized Redux selectors for better performance
 * 
 * WARNING: This hook should NOT perform navigation automatically as it conflicts
 * with the centralized navigation in app/index.tsx. Only use for auth status checks.
 */
export const useAuthGuard = () => {
  // Use individual selectors for optimal performance
  const user = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.auth.userProfile);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const loading = useAppSelector((state) => state.auth.loading);
  const initialized = useAppSelector((state) => state.auth.initialized);
  const persistenceRestored = useAppSelector((state) => state.auth.persistenceRestored);
  
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
