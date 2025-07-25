import { useAuthTokens, useUser } from '../hooks/useAuthState';

/**
 * Example of how to use auth tokens efficiently in API calls
 * This demonstrates the recommended pattern for accessing tokens throughout the app
 */

/**
 * Hook for making authenticated API requests
 * Uses optimized token selectors for minimal re-renders
 */
export const useApiClient = () => {
  const tokens = useAuthTokens(); // Only re-renders when tokens change
  const user = useUser(); // Only re-renders when user changes

  /**
   * Get current authentication headers for API requests
   * Returns headers with bearer token if available
   */
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (tokens.idToken) {
      headers['Authorization'] = `Bearer ${tokens.idToken}`;
    }

    return headers;
  };

  /**
   * Check if current token is still valid (not expired)
   */
  const isTokenValid = (): boolean => {
    if (!tokens.idToken || !tokens.tokenExpiry) {
      return false;
    }
    
    const now = Date.now();
    const expiry = tokens.tokenExpiry;
    
    // Consider token invalid if it expires within the next 5 minutes
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return expiry > (now + bufferTime);
  };

  /**
   * Make an authenticated API request
   * Automatically includes auth headers if user is authenticated
   */
  const apiRequest = async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers = {
      ...getAuthHeaders(),
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };

  /**
   * Example: Get user's profile data from API
   */
  const getUserProfile = async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    const response = await apiRequest(`/api/users/${user.uid}/profile`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    return response.json();
  };

  /**
   * Example: Update user's profile data via API
   */
  const updateUserProfile = async (profileData: any) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    const response = await apiRequest(`/api/users/${user.uid}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user profile: ${response.statusText}`);
    }

    return response.json();
  };

  return {
    // Token utilities
    getAuthHeaders,
    isTokenValid,
    
    // API request utilities
    apiRequest,
    
    // Example API methods
    getUserProfile,
    updateUserProfile,
    
    // Direct access to auth data (use sparingly)
    currentUser: user,
    currentTokens: tokens,
  };
};

/**
 * Example component showing efficient auth state usage
 */
export const ExampleAuthComponent = () => {
  // ✅ GOOD: Use specific selectors for what you need
  const user = useUser(); // Only re-renders when user changes
  const tokens = useAuthTokens(); // Only re-renders when tokens change
  
  // ✅ GOOD: Use the API client for making requests
  const { apiRequest, isTokenValid } = useApiClient();

  const handleApiCall = async () => {
    if (!isTokenValid()) {
      console.warn('Token is expired or invalid');
      return;
    }

    try {
      const response = await apiRequest('/api/some-endpoint');
      const data = await response.json();
      console.log('API response:', data);
    } catch (error) {
      console.error('API request failed:', error);
    }
  };

  return null; // This is just an example
};

/**
 * ❌ AVOID: Don't use the entire auth state if you only need specific parts
 * 
 * const authState = useAppSelector((state) => state.auth); // Re-renders on ANY auth change
 * 
 * ✅ PREFER: Use specific selectors
 * 
 * const user = useAppSelector((state) => state.auth.user); // Only re-renders when user changes
 * const tokens = useAppSelector((state) => state.auth.tokens); // Only re-renders when tokens change
 */
