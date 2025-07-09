import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [userName, setUserName] = useState<string>('');
  const [lastWorkout, setLastWorkout] = useState<{
    exercises: string;
    date: Date;
  } | null>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(true);

  // Format date as MM/DD/YY
  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
  };

  // Fetch last workout from Firestore
  const fetchLastWorkout = async () => {
    if (!user) return;

    try {
      setLoadingWorkout(true);
      
      // Query the workouts subcollection for the user, ordered by date (newest first)
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      const workoutsQuery = query(
        workoutsRef,
        orderBy('date', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(workoutsQuery);
      
      if (!querySnapshot.empty) {
        const workoutDoc = querySnapshot.docs[0];
        const workoutData = workoutDoc.data();
        
        // Handle date as string (convert to Date object)
        let workoutDate = new Date();
        if (workoutData.date) {
          if (typeof workoutData.date === 'string') {
            // For date strings in "YYYY-MM-DD" format, parse as local date
            if (workoutData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Split the date string and create a local date
              const [year, month, day] = workoutData.date.split('-').map(Number);
              workoutDate = new Date(year, month - 1, day); // month is 0-indexed
            } else {
              // For other date formats, use standard parsing
              workoutDate = new Date(workoutData.date);
            }
          } else if (workoutData.date.toDate) {
            // Handle Firebase Timestamp if it exists
            workoutDate = workoutData.date.toDate();
          }
        }
        
        // Handle exercises data properly
        let exercisesDisplay = '';
        if (workoutData.exercises) {
          if (typeof workoutData.exercises === 'string') {
            exercisesDisplay = workoutData.exercises;
          } else if (Array.isArray(workoutData.exercises)) {
            // If exercises is an array of objects like [{sets, exercise}, ...]
            exercisesDisplay = workoutData.exercises
              .map((ex: any) => {
                if (typeof ex === 'string') {
                  return ex;
                } else if (ex.exercise) {
                  return ex.exercise;
                } else {
                  return JSON.stringify(ex);
                }
              })
              .join(', ');
          } else {
            exercisesDisplay = JSON.stringify(workoutData.exercises);
          }
        }
        
        setLastWorkout({
          exercises: exercisesDisplay,
          date: workoutDate,
        });
      } else {
        // No workouts found
        setLastWorkout(null);
      }
    } catch (error) {
      console.error('Error fetching last workout:', error);
      setLastWorkout(null);
    } finally {
      setLoadingWorkout(false);
    }
  };

  // Handle authentication state changes
  useEffect(() => {
    if (!user) {
      // User is no longer logged in, redirect to login
      console.log('User logged out, redirecting to login...');
      router.replace('/login/loginScreen');
    } else {
      // User is logged in, fetch their last workout
      fetchLastWorkout();
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
        <ThemedText type="title">Welcome, {userName}!</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Your Fitness Dashboard</ThemedText>
        <ThemedText>
          Track your workouts, set goals, and achieve your maximum fitness potential.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Last Workout</ThemedText>
        <ThemedView style={styles.lastWorkoutContainer}>
          {loadingWorkout ? (
            <ThemedText style={styles.exercisesText}>Loading workout data...</ThemedText>
          ) : lastWorkout ? (
            <>
              <ThemedText style={styles.exercisesText}>
                {lastWorkout.exercises}
              </ThemedText>
              <ThemedText style={styles.workoutDate}>
                {formatDate(lastWorkout.date)}
              </ThemedText>
            </>
          ) : (
            <ThemedText style={styles.exercisesText}>
              No workouts recorded yet. Start your first workout!
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Today&apos;s Plan</ThemedText>
        <ThemedText>
          {`You have no scheduled workouts for today. Tap here to add one to your calendar.`}
        </ThemedText>
      </ThemedView>
        <View style={styles.emptyContainer} />
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
  lastWorkoutContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  exercisesText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  workoutDate: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
  },
});
