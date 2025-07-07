import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebase-direct';

export default function ExploreScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The auth state listener in index.tsx will handle navigation
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Explore Workouts
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Discover new fitness routines and exercises
      </ThemedText>
      
      <ThemedView style={styles.content}>
        <ThemedText>
          This is your explore screen where you can browse workouts, exercises, and fitness content.
        </ThemedText>
      </ThemedView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => router.push('/(tabs)/dashboard' as any)}
        >
          <ThemedText style={styles.navButtonText}>Back to Dashboard</ThemedText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
      </TouchableOpacity>
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
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  navButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
