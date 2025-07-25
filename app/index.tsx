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
    // Wait for complete initialization including persistence restoration
    if (!initialized || !persistenceRestored || loading || hasNavigatedRef.current) {
      return;
    }

    // Prevent multiple navigation attempts
    hasNavigatedRef.current = true;

    // Use a small delay to ensure all auth state has settled
    const timer = setTimeout(() => {
      if (isAuthenticated && user) {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/login/loginScreen');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, initialized, isAuthenticated, persistenceRestored, router]);

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
