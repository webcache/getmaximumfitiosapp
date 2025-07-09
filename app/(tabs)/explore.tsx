import Calendar from '@/components/Calendar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import WorkoutCard from '@/components/WorkoutCard';
import WorkoutModal, { Workout } from '@/components/WorkoutModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { convertExercisesToFormat, convertFirestoreDate, dateToFirestoreString } from '../../utils';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<Workout[]>([]);
  const [workoutDates, setWorkoutDates] = useState<Date[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Handle authentication state changes
  useEffect(() => {
    if (!user) {
      console.log('User logged out, redirecting to login...');
      router.replace('/login/loginScreen');
    }
  }, [user, router]);

  // Fetch workouts from Firestore
  const fetchWorkouts = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      const workoutsQuery = query(workoutsRef, orderBy('date', 'desc'));
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(workoutsQuery, (snapshot) => {
        const workoutData: Workout[] = [];
        const dates: Date[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Handle date conversion using proper UTC/local conversion
          const date = convertFirestoreDate(data.date);
          
          // Handle exercises conversion to proper format
          const exercises = convertExercisesToFormat(data.exercises, doc.id);
          
          const workout: Workout = {
            id: doc.id,
            title: data.title || 'Untitled Workout',
            date,
            exercises,
            notes: data.notes || '',
            duration: typeof data.duration === 'number' ? data.duration : undefined,
          };
          
          workoutData.push(workout);
          dates.push(date);
        });
        
        setWorkouts(workoutData);
        setWorkoutDates(dates);
        setLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching workouts:', error);
      setLoading(false);
    }
  }, [user]);

  // Filter workouts for selected date
  useEffect(() => {
    const filtered = workouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      workoutDate.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      return workoutDate.getTime() === selected.getTime();
    });
    setSelectedDateWorkouts(filtered);
  }, [workouts, selectedDate]);

  // Initial data load
  useEffect(() => {
    if (user) {
      let unsubscribe: any;
      
      const setupListener = async () => {
        unsubscribe = await fetchWorkouts();
      };
      
      setupListener();
      
      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [user, fetchWorkouts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWorkouts();
    setRefreshing(false);
  }, [fetchWorkouts]);

  const handleWorkoutUpdate = async (updatedWorkout: Workout) => {
    if (!user || !updatedWorkout.id) return;

    try {
      const workoutDoc = doc(db, 'profiles', user.uid, 'workouts', updatedWorkout.id);
      
      const dataToSave = {
        title: updatedWorkout.title,
        date: dateToFirestoreString(updatedWorkout.date),
        exercises: updatedWorkout.exercises,
        notes: updatedWorkout.notes,
        duration: updatedWorkout.duration,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(workoutDoc, dataToSave);
    } catch (error) {
      console.error('Error updating workout:', error);
      Alert.alert('Error', 'Failed to update workout. Please try again.');
    }
  };

  const handleSaveWorkout = async (workoutData: Workout) => {
    if (!user) return;

    try {
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      
      const dataToSave = {
        title: workoutData.title,
        date: dateToFirestoreString(workoutData.date),
        exercises: workoutData.exercises,
        notes: workoutData.notes,
        duration: workoutData.duration,
        updatedAt: new Date().toISOString(),
      };

      if (workoutData.id) {
        // Update existing workout
        const workoutDoc = doc(db, 'profiles', user.uid, 'workouts', workoutData.id);
        await updateDoc(workoutDoc, dataToSave);
      } else {
        // Create new workout
        await addDoc(workoutsRef, {
          ...dataToSave,
          createdAt: new Date().toISOString(),
        });
      }

      setModalVisible(false);
      setEditingWorkout(undefined);
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  const handleDeleteWorkout = async (workout: Workout) => {
    if (!user || !workout.id) return;

    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${workout.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const workoutDoc = doc(db, 'profiles', user.uid, 'workouts', workout.id!);
              await deleteDoc(workoutDoc);
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', 'Failed to delete workout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditWorkout = (workout: Workout) => {
    setEditingWorkout(workout);
    setModalVisible(true);
  };

  const handleNewWorkout = () => {
    setEditingWorkout(undefined);
    setModalVisible(true);
  };

  const formatSelectedDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: insets.bottom + 100 } // Tab bar height + extra padding
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar */}
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          workoutDates={workoutDates}
        />

        {/* Selected Date Section */}
        <ThemedView style={styles.dateSection}>
          <View style={styles.dateSectionHeader}>
            <ThemedText type="subtitle" style={styles.dateTitle}>
              {formatSelectedDate(selectedDate)}
            </ThemedText>
            <TouchableOpacity
              onPress={handleNewWorkout}
              style={[styles.addButton, { backgroundColor: colors.tint }]}
            >
              <FontAwesome5 name="plus" size={16} color="#fff" />
              <ThemedText style={styles.addButtonText}>Add Workout</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Workouts for selected date */}
          {loading ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>Loading workouts...</ThemedText>
            </ThemedView>
          ) : selectedDateWorkouts.length > 0 ? (
            <View style={styles.workoutsList}>
              {selectedDateWorkouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onPress={() => handleEditWorkout(workout)}
                  onEdit={() => handleEditWorkout(workout)}
                  onDelete={() => handleDeleteWorkout(workout)}
                  onWorkoutUpdate={handleWorkoutUpdate}
                />
              ))}
            </View>
          ) : (
            <ThemedView style={styles.emptyState}>
              <FontAwesome5 name="dumbbell" size={48} color={colors.text + '30'} />
              <ThemedText style={styles.emptyText}>No workouts planned</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Tap "Add Workout" to create your first workout for {formatSelectedDate(selectedDate).toLowerCase()}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        {/* Recent Workouts */}
        {workouts.length > 0 && (
          <ThemedView style={styles.recentSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              All Workouts
            </ThemedText>
            <View style={styles.workoutsList}>
              {workouts.slice(0, 10).map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onPress={() => handleEditWorkout(workout)}
                  onEdit={() => handleEditWorkout(workout)}
                  onDelete={() => handleDeleteWorkout(workout)}
                  onWorkoutUpdate={handleWorkoutUpdate}
                  showDate={true}
                />
              ))}
            </View>
          </ThemedView>
        )}
      </ScrollView>

      {/* Workout Modal */}
      <WorkoutModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingWorkout(undefined);
        }}
        onSave={handleSaveWorkout}
        workout={editingWorkout}
        selectedDate={selectedDate}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  dateSection: {
    marginBottom: 16,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  workoutsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  recentSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
});
