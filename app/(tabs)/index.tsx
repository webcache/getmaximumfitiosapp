import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image } from 'expo-image';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
// Try using the direct Firebase config instead of the one using env variables
import { auth } from '../../firebase-direct';

export default function HomeScreen() {
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    // Get current user's display name or email
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || user.email || 'Fitness Enthusiast');
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The auth state listener in index.tsx will handle navigation
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome, {userName}!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Your Fitness Journey</ThemedText>
        <ThemedText>
          Track your workouts, set goals, and achieve your maximum fitness potential.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Quick Stats</ThemedText>
        <ThemedText>
          {`View your recent activities and progress at a glance. Tap the Explore tab to see more workout options.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Today&apos;s Plan</ThemedText>
        <ThemedText>
          {`You have no scheduled workouts for today. Tap here to add one to your calendar.`}
        </ThemedText>
      </ThemedView>
      
      <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
        <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
      </TouchableOpacity>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  signOutText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
