import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
// Try using the direct Firebase config instead of the one using env variables
import { auth } from '../firebase-direct';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    console.log('Index screen mounted - checking authentication...');
    try {
      // TEMPORARY FIX: Add error handling around Firebase initialization
      const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'User not logged in');
        if (user) {
          // User is signed in, navigate to main app
          console.log('Navigating to /(tabs)/dashboard');
          router.replace('/(tabs)/dashboard' as any);
        } else {
          // No user, navigate to login
          console.log('Navigating to login screen');
          router.push('/login/loginScreen' as any);
        }
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error("Firebase auth error:", error);
      // If Firebase fails, still navigate to login
      console.log('Firebase error - navigating to login screen');
      router.push('/login/loginScreen' as any);
    }
  }, [router]);

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
