import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // true = requires authentication, false = requires no authentication
  fallbackComponent?: React.ReactNode;
}

/**
 * AuthGuard component that controls access to routes based on authentication status
 * Does NOT handle navigation - that's handled by app/index.tsx
 * 
 * @param requireAuth - true: only authenticated users can access, false: only unauthenticated users can access
 * @param children - The component to render if access is allowed
 * @param fallbackComponent - Optional custom component to show during loading or when access is denied
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAuth = true, 
  fallbackComponent 
}) => {
  const { user, loading } = useAuth();

  // Show loading state
  if (loading) {
    return fallbackComponent || (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  const isAuthenticated = !!user;
  const hasAccess = requireAuth ? isAuthenticated : !isAuthenticated;

  if (!hasAccess) {
    // Don't redirect, just show loading - let the natural routing handle navigation
    console.log(`🛡️ AuthGuard: Access denied - requireAuth: ${requireAuth}, isAuthenticated: ${isAuthenticated}`);
    
    // Show fallback while natural routing handles navigation
    return fallbackComponent || (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Redirecting...</Text>
      </View>
    );
  }

  // User has access, render children
  console.log(`🛡️ AuthGuard: Access granted - requireAuth: ${requireAuth}, isAuthenticated: ${isAuthenticated}`);
  return <>{children}</>;
};

export default AuthGuard;
