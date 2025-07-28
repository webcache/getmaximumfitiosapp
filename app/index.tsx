import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthStatus, useUser } from '../hooks/useAuthState';

// Component to handle Redux provider availability
function IndexContent() {
  const router = useRouter();
  const user = useUser();
  const { isAuthenticated, loading, initialized, persistenceRestored, isReady } = useAuthStatus();
  const hasNavigatedRef = useRef(false);
  const currentAuthStateRef = useRef<string>('initial');

  // Debug: Log router object to ensure it's available
  useEffect(() => {
    console.log('🔧 Router object available:', !!router, typeof router);
    if (router) {
      console.log('🔧 Router methods:', Object.keys(router));
    }
  }, [router]);

  useEffect(() => {
    const authStateKey = `${isAuthenticated}-${user?.uid || 'none'}`;
    
    console.log('🔄 Index Navigation Check (useEffect triggered):', {
      initialized,
      persistenceRestored,
      loading,
      isAuthenticated,
      hasUser: !!user,
      userUid: user?.uid,
      userEmail: user?.email,
      hasNavigated: hasNavigatedRef.current,
      currentAuthState: currentAuthStateRef.current,
      newAuthState: authStateKey,
      isReady,
      timestamp: new Date().toISOString()
    });

    // Wait for complete initialization including persistence restoration
    if (!initialized || !persistenceRestored || loading) {
      console.log('⏳ Waiting for auth initialization...', {
        initialized,
        persistenceRestored,
        loading,
        reason: !initialized ? 'not initialized' : !persistenceRestored ? 'persistence not restored' : 'loading'
      });
      return;
    }

    // Check if auth state has changed - if so, we can navigate again
    if (currentAuthStateRef.current !== authStateKey) {
      console.log('🆕 Auth state changed, resetting navigation flag:', {
        previousState: currentAuthStateRef.current,
        newState: authStateKey
      });
      hasNavigatedRef.current = false;
      currentAuthStateRef.current = authStateKey;
    }

    // Check if we already navigated for this auth state
    if (hasNavigatedRef.current) {
      console.log('⏸️ Navigation already completed for current auth state');
      return;
    }

    console.log('🚀 Ready to navigate! Auth state is complete:', {
      isAuthenticated,
      hasUser: !!user,
      userEmail: user?.email
    });

    // Prevent multiple navigation attempts for this auth state
    hasNavigatedRef.current = true;

    // Use a longer delay for more reliable navigation after auth changes
    const timer = setTimeout(() => {
      if (isAuthenticated && user) {
        console.log('✅ Navigating to dashboard for authenticated user:', user.email);
        try {
          router.replace('/(tabs)/dashboard');
          console.log('✅ Navigation to dashboard completed');
        } catch (error) {
          console.error('❌ Navigation failed:', error);
          hasNavigatedRef.current = false; // Reset flag so navigation can be retried
        }
      } else {
        console.log('➡️ Navigating to login screen (not authenticated)');
        try {
          router.replace('/login/loginScreen');
          console.log('✅ Navigation to login completed');
        } catch (error) {
          console.error('❌ Navigation failed:', error);
          hasNavigatedRef.current = false; // Reset flag so navigation can be retried
        }
      }
    }, 300); // Increased delay to ensure auth state has fully settled

    return () => clearTimeout(timer);
  }, [user, loading, initialized, isAuthenticated, persistenceRestored, router, isReady]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Get Maximum Fit</Text>
      <Text style={styles.subtitle}>Your Fitness Journey Begins Here</Text>
      <ActivityIndicator 
        size="large" 
        color="#FFFFFF" 
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 30,
  },
  loader: {
    marginTop: 20
  }
});

// Export the component as default
export default IndexContent;