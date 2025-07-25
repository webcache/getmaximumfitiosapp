import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthStatus, useUser } from '../hooks/useAuthState';

export default function IndexPage() {
  const router = useRouter();
  const user = useUser();
  const { isAuthenticated, loading, initialized, persistenceRestored, isReady } = useAuthStatus();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    console.log('🔄 Index Navigation Check (useEffect triggered):', {
      initialized,
      persistenceRestored,
      loading,
      isAuthenticated,
      hasUser: !!user,
      userUid: user?.uid,
      userEmail: user?.email,
      hasNavigated: hasNavigatedRef.current,
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

    // Prevent multiple navigation attempts
    hasNavigatedRef.current = true;

    // Use a small delay to ensure all auth state has settled
    const timer = setTimeout(() => {
      if (isAuthenticated && user) {
        console.log('✅ Navigating to dashboard for authenticated user:', user.email);
        router.replace('/(tabs)/dashboard');
      } else {
        console.log('➡️ Navigating to login screen (not authenticated)');
        router.replace('/login/loginScreen');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, initialized, isAuthenticated, persistenceRestored, router, isReady]);

  // Reset navigation flag when auth state actually changes (user logs in/out)
  useEffect(() => {
    console.log('🔄 Auth state change detected, resetting navigation flag:', {
      isAuthenticated,
      userUid: user?.uid,
      previousNavigation: hasNavigatedRef.current
    });
    hasNavigatedRef.current = false;
  }, [isAuthenticated, user?.uid]);

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
