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
  const { user, userProfile, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Auth system is ready when not loading
    setIsReady(!loading);
  }, [loading]);

  return {
    isReady,
    user,
    userProfile,
    isAuthenticated: !!user,
    loading,
    initialized: true, // Always true since we're using onAuthStateChanged
    refreshProfile: () => {}, // No-op for now
    resetProfile: () => {}, // No-op for now
  };
}
