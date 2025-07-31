import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  // Get auth state from context
  const { user, initialized, loading } = useAuth();
  const isAuthenticated = !!user;
  const navigationExecuted = useRef(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Debug: Log auth state changes - add timestamp and user ID for better tracking
  console.log('🧭 Index: Component rendered with auth state:', { 
    isAuthenticated, 
    hasUser: !!user, 
    userEmail: user?.email || 'none',
    userId: user?.uid || 'none',
    initialized, 
    loading,
    navigationExecuted: navigationExecuted.current,
    shouldRedirect,
    timestamp: new Date().toISOString()
  });

  // Use effect to handle navigation imperatively when auth state changes
  useEffect(() => {
    console.log('🔄 Index: useEffect triggered with:', { 
      initialized, 
      loading, 
      isAuthenticated, 
      userId: user?.uid || 'none',
      navigationExecuted: navigationExecuted.current,
      timestamp: new Date().toISOString()
    });

    // Only proceed if auth is initialized and not loading
    if (!initialized || loading) {
      console.log('🔄 Index: Waiting for auth initialization...');
      return;
    }

    // Reset navigation flag when auth state changes
    if (!navigationExecuted.current) {
      console.log('🧭 Index: Auth initialized, determining navigation target:', { 
        isAuthenticated, 
        hasUser: !!user,
        userId: user?.uid || 'none'
      });

      // Set redirect flag for declarative navigation
      setShouldRedirect(true);

      // Also try imperative navigation as backup
      const timeoutId = setTimeout(() => {
        if (navigationExecuted.current) {
          console.log('🔄 Index: Navigation already executed, skipping...');
          return;
        }

        navigationExecuted.current = true;

        if (isAuthenticated) {
          console.log('✅ Index: User authenticated, navigating to dashboard (imperative)');
          router.replace('/(tabs)/dashboard');
        } else {
          console.log('❌ Index: User not authenticated, navigating to login (imperative)');
          router.replace('/login/loginScreen');
        }
      }, 100); // Small delay to allow declarative navigation to work first

      // Cleanup timeout on unmount or dependency change
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [initialized, loading, isAuthenticated, user?.uid]);

  // Show loading state while auth is initializing
  if (!initialized || loading) {
    console.log('🔄 Index: Showing loading state...');
    return null;
  }

  // Use declarative navigation with Redirect when ready
  if (shouldRedirect) {
    navigationExecuted.current = true;
    
    if (isAuthenticated) {
      console.log('✅ Index: User authenticated, using declarative redirect to dashboard');
      return <Redirect href="/(tabs)/dashboard" />;
    } else {
      console.log('❌ Index: User not authenticated, using declarative redirect to login');
      return <Redirect href="/login/loginScreen" />;
    }
  }

  // This should not be reached due to the redirect logic above
  console.log('⚠️ Index: Reached fallback render (this should not happen)');
  return null;
}