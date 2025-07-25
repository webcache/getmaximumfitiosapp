import { useAppSelector } from '../store/hooks';

/**
 * Optimized hook to access auth state using Redux selectors
 * This is the most efficient way to access auth data throughout the app
 */
export const useAuthState = () => {
  // Use individual selectors for optimal re-rendering performance
  const user = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.auth.userProfile);
  const tokens = useAppSelector((state) => state.auth.tokens);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const loading = useAppSelector((state) => state.auth.loading);
  const error = useAppSelector((state) => state.auth.error);
  const initialized = useAppSelector((state) => state.auth.initialized);
  const persistenceRestored = useAppSelector((state) => state.auth.persistenceRestored);

  return {
    // User data (Firebase User, not Firestore profile)
    user,
    
    // Profile data (Firestore document, user-created profile)
    userProfile,
    
    // Authentication tokens
    tokens,
    
    // Auth status
    isAuthenticated,
    loading,
    error,
    initialized,
    persistenceRestored,
    
    // Convenience computed values
    isReady: initialized && persistenceRestored && !loading,
    hasValidUser: !!user && isAuthenticated,
    hasProfile: !!userProfile,
    currentIdToken: tokens.idToken,
    currentAccessToken: tokens.accessToken,
    currentRefreshToken: tokens.refreshToken,
    tokenExpiry: tokens.tokenExpiry,
  };
};

/**
 * Hook to get only user data (Firebase User object)
 * Use this when you only need user authentication data
 */
export const useUser = () => {
  return useAppSelector((state) => state.auth.user);
};

/**
 * Hook to get only user profile data (Firestore profile document)
 * Use this when you only need the user's profile information
 */
export const useUserProfile = () => {
  return useAppSelector((state) => state.auth.userProfile);
};

/**
 * Hook to get only authentication tokens
 * Use this when you only need tokens for API calls
 */
export const useAuthTokens = () => {
  return useAppSelector((state) => state.auth.tokens);
};

/**
 * Hook to get only authentication status
 * Use this when you only need to check if user is authenticated
 */
export const useAuthStatus = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const loading = useAppSelector((state) => state.auth.loading);
  const initialized = useAppSelector((state) => state.auth.initialized);
  const persistenceRestored = useAppSelector((state) => state.auth.persistenceRestored);
  
  return {
    isAuthenticated,
    loading,
    initialized,
    persistenceRestored,
    isReady: initialized && persistenceRestored && !loading,
  };
};
