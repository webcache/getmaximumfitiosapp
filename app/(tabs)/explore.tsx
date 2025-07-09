import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Handle authentication state changes
  useEffect(() => {
    if (!user) {
      // User is no longer logged in, redirect to login
      console.log('User logged out, redirecting to login...');
      router.replace('/login/loginScreen');
    }
  }, [user, router]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Workouts
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Discover and track your fitness routines
      </ThemedText>
      
      <ThemedView style={styles.content}>
        <ThemedText>
          This is your workouts screen where you can browse exercises, create custom routines, and track your fitness progress.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
