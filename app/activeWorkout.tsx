import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet } from 'react-native';
import ActiveWorkoutScreen from '../components/ActiveWorkoutScreen';
import { Workout } from '../components/WorkoutModal';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';

export default function ActiveWorkoutPage() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);

  // Parse workout data from params
  useEffect(() => {
    if (params.workoutData) {
      try {
        const parsedWorkout: Workout = JSON.parse(params.workoutData as string);
        setWorkout(parsedWorkout);
      } catch (error) {
        console.error('Error parsing workout data:', error);
        Alert.alert('Error', 'Failed to load workout data');
        router.back();
      }
    }
  }, [params.workoutData]);

  // Set up navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Active Workout',
      headerShown: true,
      headerBackTitle: 'Back',
      headerTintColor: '#000000',
      gestureEnabled: false, // Prevent accidental swipe back during workout
    });
  }, [navigation]);

  const handleWorkoutComplete = async (completedWorkout: Workout) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save workouts');
      return;
    }

    try {
      // Save completed workout to Firestore
      const workoutRef = doc(collection(db, 'profiles', user.uid, 'workouts'));
      await setDoc(workoutRef, {
        ...completedWorkout,
        id: workoutRef.id,
        createdAt: new Date().toISOString(),
      });

      // Save max lifts if any exercises are marked as max lifts
      await saveMaxLifts({ ...completedWorkout, id: workoutRef.id });

      Alert.alert(
        'Workout Saved! 🎉',
        'Your completed workout has been saved to your history.',
        [
          {
            text: 'View Workouts',
            onPress: () => router.push('/(tabs)/workouts'),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving completed workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  const saveMaxLifts = async (workout: Workout) => {
    if (!user) return;

    try {
      const maxLifts: any[] = [];
      
      workout.exercises.forEach(exercise => {
        if (exercise.isMaxLift && exercise.sets.length > 0) {
          const heaviestSet = exercise.sets.reduce((prev, current) => {
            const prevWeight = parseFloat(prev.weight || '0');
            const currentWeight = parseFloat(current.weight || '0');
            return currentWeight > prevWeight ? current : prev;
          });

          if (heaviestSet.weight && parseFloat(heaviestSet.weight) > 0) {
            maxLifts.push({
              id: `${Date.now()}-${exercise.id}`,
              exerciseName: exercise.name,
              weight: heaviestSet.weight,
              reps: heaviestSet.reps,
              date: workout.date,
              workoutId: workout.id,
              notes: exercise.notes,
            });
          }
        }
      });

      const maxLiftsRef = collection(db, 'profiles', user.uid, 'maxLifts');
      for (const maxLift of maxLifts) {
        const maxLiftDoc = doc(maxLiftsRef, maxLift.id);
        const maxLiftData: any = {
          exerciseName: maxLift.exerciseName,
          weight: maxLift.weight,
          reps: maxLift.reps,
          date: maxLift.date,
          createdAt: new Date().toISOString(),
        };
        
        if (maxLift.workoutId) {
          maxLiftData.workoutId = maxLift.workoutId;
        }
        
        if (maxLift.notes && maxLift.notes.trim()) {
          maxLiftData.notes = maxLift.notes;
        }
        
        await setDoc(maxLiftDoc, maxLiftData);
      }
    } catch (error) {
      console.error('Error saving max lifts:', error);
    }
  };

  const handleWorkoutExit = () => {
    // No alert needed here since ActiveWorkoutScreen handles the confirmation
    router.back();
  };

  if (!workout) {
    return <SafeAreaView style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ActiveWorkoutScreen
        workout={workout}
        onComplete={handleWorkoutComplete}
        onExit={handleWorkoutExit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
