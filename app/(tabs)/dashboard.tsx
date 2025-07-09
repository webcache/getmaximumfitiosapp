import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [userName, setUserName] = useState<string>('');

  // Handle authentication state changes
  useEffect(() => {
    if (!user) {
      // User is no longer logged in, redirect to login
      console.log('User logged out, redirecting to login...');
      router.replace('/login/loginScreen');
    }
  }, [user, router]);

  useEffect(() => {
    if (userProfile) {
      // Create a personalized name from firstName and lastName, with fallbacks
      let name = '';
      if (userProfile.firstName && userProfile.lastName) {
        name = `${userProfile.firstName} ${userProfile.lastName}`;
      } else if (userProfile.firstName) {
        name = userProfile.firstName;
      } else if (userProfile.lastName) {
        name = userProfile.lastName;
      } else {
        name = userProfile.displayName || userProfile.email || 'Fitness Enthusiast';
      }
      setUserName(name);
    } else if (user) {
      setUserName(user.displayName || user.email || 'Fitness Enthusiast');
    }
  }, [user, userProfile]);

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
        <ThemedText type="title">Dashboard - Welcome, {userName}!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Your Fitness Dashboard</ThemedText>
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
      <View style={styles.emptyContainer} />

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/(tabs)/explore' as any)}
        >
          <ThemedText style={styles.navButtonText}>Go to Explore</ThemedText>
        </TouchableOpacity>
      </View>
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
  emptyContainer: {
    height: 100, // Adjust the height as needed
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
});
