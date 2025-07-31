import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook to handle authentication state and navigation guards
 * Prevents error loops by properly handling loading states and persistence restoration
 * Uses the new AuthContext with onAuthStateChanged
 * 
 * WARNING: This hook should NOT perform navigation automatically as it conflicts
 * with the centralized navigation in app/index.tsx. Only use for auth status checks.
 */
export function useAuthGuard() {
  const { user, userProfile, isAuthenticated, loading, initialized, refreshProfile, resetProfile } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for auth system to be fully initialized
    if (!initialized) {
      setIsReady(false);
      return;
    }
    // Auth system is ready
    if (!loading) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [loading, initialized]);

  return {
    isReady,
    user,
    userProfile,
    isAuthenticated,
    loading,
    initialized,
    refreshProfile,
    resetProfile
  };
}
