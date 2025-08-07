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
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl, SafeAreaView, ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AchievementShareModal from '../../components/AchievementShareModal';
import Calendar from '../../components/Calendar';
import KeyboardSafeScreenWrapper from '../../components/KeyboardSafeScreenWrapper';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import WorkoutCard from '../../components/WorkoutCard';
import WorkoutModal, { ExerciseSet, Workout, WorkoutExercise } from '../../components/WorkoutModal';
import WorkoutSessionModal from '../../components/WorkoutSessionModal';
import { Colors } from '../../constants/Colors';
import { db } from '../../firebase';
import { useAchievementShare } from '../../hooks/useAchievementShare';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useDynamicThemeColor } from '../../hooks/useThemeColor';
import { healthKitService } from '../../services/HealthKitService';
import { convertExercisesToFormat, convertFirestoreDate, dateToFirestoreString } from '../../utils';

export default function WorkoutsScreen() {
  // ALL HOOKS MUST BE CALLED FIRST
  const { isReady, user } = useAuthGuard();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { themeColor } = useDynamicThemeColor();
  const insets = useSafeAreaInsets();
  
  // Achievement sharing hook
  const achievementShare = useAchievementShare();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<Workout[]>([]);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<Workout[]>([]);
  const [workoutDates, setWorkoutDates] = useState<Date[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workoutSessionVisible, setWorkoutSessionVisible] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch workouts from Firestore - stable callback without user dependency
  const fetchWorkouts = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      setLoading(true);
      console.log('Fetching workouts for user:', userId);
      
      const workoutsRef = collection(db, 'profiles', userId, 'workouts');
      const workoutsQuery = query(workoutsRef, orderBy('date', 'desc'));
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(workoutsQuery, (snapshot) => {
        console.log('Workouts snapshot received, count:', snapshot.size);
        const workoutData: Workout[] = [];
        const dates: Date[] = [];
        
        snapshot.forEach((doc) => {
          try {
            const data = doc.data();
            
            // Enhanced validation for required fields
            if (!data || typeof data !== 'object') {
              console.warn('Skipping workout with invalid data structure:', doc.id);
              return;
            }
            
            if (!data.title || !data.exercises) {
              console.warn('Skipping workout with missing required fields:', doc.id, { 
                hasTitle: !!data.title, 
                hasExercises: !!data.exercises 
              });
              return;
            }
            
            // Handle date conversion using proper UTC/local conversion
            const date = convertFirestoreDate(data.date);
            
            // Handle exercises conversion to proper format
            const exercises = convertExercisesToFormat(data.exercises, doc.id);
            
            // Enhanced validation for exercises array
            if (!Array.isArray(exercises) || exercises.length === 0) {
              console.warn('Skipping workout with invalid exercises:', doc.id, {
                exercisesType: typeof exercises,
                exercisesLength: Array.isArray(exercises) ? exercises.length : 'not array'
              });
              return;
            }
            
            // Validate each exercise in the array
            const validExercises = exercises.filter(ex => {
              if (!ex || typeof ex !== 'object') {
                console.warn('Filtering out invalid exercise object:', ex);
                return false;
              }
              if (!ex.name || typeof ex.name !== 'string') {
                console.warn('Filtering out exercise with invalid name:', ex);
                return false;
              }
              if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
                console.warn('Filtering out exercise with invalid sets:', ex);
                return false;
              }
              return true;
            });
            
            if (validExercises.length === 0) {
              console.warn('Skipping workout with no valid exercises after filtering:', doc.id);
              return;
            }
            
            const workout: Workout = {
              id: doc.id,
              title: String(data.title || 'Untitled Workout'),
              date,
              exercises: validExercises,
              notes: String(data.notes || ''),
              duration: typeof data.duration === 'number' ? data.duration : undefined,
              isCompleted: Boolean(data.isCompleted || false),
              completedAt: data.completedAt ? convertFirestoreDate(data.completedAt) : undefined,
            };
            
            workoutData.push(workout);
            dates.push(date);
          } catch (error) {
            console.error('Error processing workout document:', doc.id, error);
          }
        });
        
        setWorkouts(workoutData);
        setWorkoutDates(dates);
        
        // Filter upcoming workouts (future dates and today's uncompleted workouts)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcoming = workoutData.filter(workout => {
          const workoutDate = new Date(workout.date);
          workoutDate.setHours(0, 0, 0, 0);
          const isUpcoming = !workout.isCompleted && workoutDate >= today;
          console.log(`Workout "${workout.title}" - completed: ${workout.isCompleted}, date: ${workoutDate.toDateString()}, today: ${today.toDateString()}, isUpcoming: ${isUpcoming}`);
          return isUpcoming;
        });
        
        setUpcomingWorkouts(upcoming);
        setLoading(false);
        console.log('Workouts loaded successfully, count:', workoutData.length);
        console.log('Upcoming workouts count:', upcoming.length);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching workouts:', error);
      setLoading(false);
    }
  }, []);

  // Filter workouts for selected date
  useEffect(() => {
    const filtered = workouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      workoutDate.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      // Only show incomplete workouts for the selected date in the "Today" section
      const matchesDate = workoutDate.getTime() === selected.getTime();
      const isIncomplete = !workout.isCompleted;
      const shouldShow = matchesDate && isIncomplete;
      
      if (matchesDate) {
        console.log(`Workout "${workout.title}" for selected date - completed: ${workout.isCompleted}, showing in Today section: ${shouldShow}`);
      }
      
      return shouldShow;
    });
    setSelectedDateWorkouts(filtered);
    console.log(`Selected date workouts (incomplete only): ${filtered.length}`);
  }, [workouts, selectedDate]);

  // Initial data load
  useEffect(() => {
    if (user?.uid) {
      let workoutsUnsubscribe: any;
      
      const setupListeners = async () => {
        console.log('Setting up workouts listener for user:', user.uid);
        workoutsUnsubscribe = await fetchWorkouts(user.uid);
      };
      
      setupListeners();
      
      return () => {
        if (workoutsUnsubscribe && typeof workoutsUnsubscribe === 'function') {
          console.log('Cleaning up workouts listener');
          workoutsUnsubscribe();
        }
      };
    } else {
      console.log('No user available for workouts, clearing data');
      setWorkouts([]);
      setUpcomingWorkouts([]);
      setWorkoutDates([]);
      setLoading(false);
    }
  }, [user?.uid, fetchWorkouts]);

  const onRefresh = useCallback(async () => {
    if (!user?.uid) return;
    
    setRefreshing(true);
    console.log('Refreshing workouts for user:', user.uid);
    
    try {
      await fetchWorkouts(user.uid);
    } catch (error) {
      console.error('Error refreshing workouts:', error);
    }
    setRefreshing(false);
  }, [user?.uid, fetchWorkouts]);

  const cleanWorkoutData = (workout: Workout) => {
    // Clean exercises to remove any undefined values
    const cleanedExercises = workout.exercises?.map((exercise: WorkoutExercise) => {
      const cleanedSets = exercise.sets?.map((set: ExerciseSet) => ({
        id: set.id || `set-${Date.now()}-${Math.random()}`,
        reps: set.reps || '',
        weight: set.weight || '',
        notes: set.notes || ''
      })) || [];

      return {
        id: exercise.id || `exercise-${Date.now()}-${Math.random()}`,
        name: exercise.name || '',
        sets: cleanedSets,
        notes: exercise.notes || '',
        isMaxLift: exercise.isMaxLift || false
      };
    }) || [];

    return {
      ...workout,
      exercises: cleanedExercises,
      title: workout.title || '',
      notes: workout.notes || '',
      duration: workout.duration || undefined, // Keep as undefined if not set
      isCompleted: workout.isCompleted || false
    };
  };

  const handleWorkoutUpdate = async (updatedWorkout: Workout) => {
    if (!user || !updatedWorkout.id) return;

    console.log('handleWorkoutUpdate called with:', {
      id: updatedWorkout.id,
      title: updatedWorkout.title,
      isCompleted: updatedWorkout.isCompleted,
      completedAt: updatedWorkout.completedAt
    });

    // Check if workout is being marked as completed for the first time
    const originalWorkout = workouts.find(w => w.id === updatedWorkout.id);
    const isNewCompletion = !originalWorkout?.isCompleted && updatedWorkout.isCompleted;

    try {
      const cleanedWorkout = cleanWorkoutData(updatedWorkout);
      const workoutDoc = doc(db, 'profiles', user.uid, 'workouts', updatedWorkout.id);
      
      const dataToSave: any = {
        title: cleanedWorkout.title,
        date: dateToFirestoreString(cleanedWorkout.date),
        exercises: cleanedWorkout.exercises,
        isCompleted: cleanedWorkout.isCompleted,
        updatedAt: new Date().toISOString(),
      };

      // Only add optional fields if they have valid values
      if (cleanedWorkout.notes && cleanedWorkout.notes.trim() !== '') {
        dataToSave.notes = cleanedWorkout.notes;
      }
      if (cleanedWorkout.duration !== undefined && cleanedWorkout.duration !== null && cleanedWorkout.duration > 0) {
        dataToSave.duration = cleanedWorkout.duration;
      }
      if (cleanedWorkout.completedAt) {
        dataToSave.completedAt = cleanedWorkout.completedAt.toISOString();
      }

      console.log('Saving workout data to Firestore:', JSON.stringify(dataToSave, null, 2));

      await updateDoc(workoutDoc, dataToSave);

      // Trigger achievement sharing if workout was just completed
      if (isNewCompletion) {
        console.log('New workout completion detected, checking for achievements...');
        
        // Check for personal records in the workout
        const personalRecords = cleanedWorkout.exercises.filter(exercise => exercise.isMaxLift);
        
        if (personalRecords.length > 0) {
          // Show PR achievement for the first personal record
          const firstPR = personalRecords[0];
          const maxSet = firstPR.sets.reduce((max, set) => {
            const weight = parseFloat(set.weight || '0');
            return weight > parseFloat(max.weight || '0') ? set : max;
          }, firstPR.sets[0]);
          
          const weight = parseFloat(maxSet.weight || '0');
          const reps = parseInt(maxSet.reps || '0');
          
          console.log('Personal record detected:', { exercise: firstPR.name, weight, reps });
          
          achievementShare.triggerPersonalRecord(
            firstPR.name,
            weight,
            reps
          );
        } else {
          // Check for milestone achievements first
          const totalCompletedWorkouts = workouts.filter(w => w.isCompleted).length + 1; // +1 for the current completion
          
          let milestoneTriggered = false;
          
          // Check for workout count milestones
          if (totalCompletedWorkouts === 1) {
            achievementShare.triggerMilestone('First Workout Complete! 🎉', 'Welcome to your fitness journey!');
            milestoneTriggered = true;
          } else if (totalCompletedWorkouts === 5) {
            achievementShare.triggerMilestone('5 Workouts Complete! 💪', 'You\'re building a great habit!');
            milestoneTriggered = true;
          } else if (totalCompletedWorkouts === 10) {
            achievementShare.triggerMilestone('10 Workouts Milestone! 🏆', 'You\'re officially on fire!');
            milestoneTriggered = true;
          } else if (totalCompletedWorkouts === 25) {
            achievementShare.triggerMilestone('25 Workouts Strong! 🔥', 'Quarter century of dedication!');
            milestoneTriggered = true;
          } else if (totalCompletedWorkouts === 50) {
            achievementShare.triggerMilestone('50 Workout Champion! 👑', 'You\'re unstoppable!');
            milestoneTriggered = true;
          } else if (totalCompletedWorkouts === 100) {
            achievementShare.triggerMilestone('100 Workouts Legend! 🚀', 'You\'ve reached legendary status!');
            milestoneTriggered = true;
          }
          
          // If no milestone, show general workout completion achievement
          if (!milestoneTriggered) {
            console.log('Triggering workout completion achievement');
            
            achievementShare.triggerWorkoutComplete(
              cleanedWorkout.title,
              cleanedWorkout.duration ? `${cleanedWorkout.duration} min` : undefined,
              cleanedWorkout.exercises.length
            );
          }
        }
      }
    } catch (error) {
      console.error('Error updating workout:', error);
      Alert.alert('Error', 'Failed to update workout. Please try again.');
    }
  };

  const handleSaveWorkout = async (workoutData: Workout) => {
    if (!user) return;

    try {
      const cleanedWorkout = cleanWorkoutData(workoutData);
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      
      const dataToSave: any = {
        title: cleanedWorkout.title,
        date: dateToFirestoreString(cleanedWorkout.date),
        exercises: cleanedWorkout.exercises,
        isCompleted: cleanedWorkout.isCompleted,
        updatedAt: new Date().toISOString(),
      };

      // Only add optional fields if they have valid values
      if (cleanedWorkout.notes && cleanedWorkout.notes.trim() !== '') {
        dataToSave.notes = cleanedWorkout.notes;
      }
      if (cleanedWorkout.duration !== undefined && cleanedWorkout.duration !== null && cleanedWorkout.duration > 0) {
        dataToSave.duration = cleanedWorkout.duration;
      }
      if (cleanedWorkout.completedAt) {
        dataToSave.completedAt = cleanedWorkout.completedAt.toISOString();
      }

      console.log('Saving workout data to Firestore:', JSON.stringify(dataToSave, null, 2));

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

      // ✅ APPLE HEALTHKIT INTEGRATION - Save workout to HealthKit if enabled
      try {
        if (cleanedWorkout.isCompleted) {
          // Convert workout data to HealthKit format
          const completionTime = cleanedWorkout.completedAt || new Date(); // Use stored completion time or current time
          const workoutDuration = cleanedWorkout.duration || 60; // Default 60 minutes
          const startTime = new Date(completionTime.getTime() - (workoutDuration * 60 * 1000)); // Calculate start time based on duration
          
          const healthKitWorkout = {
            title: cleanedWorkout.title,
            startDate: startTime, // Use calculated start time
            endDate: completionTime, // Use actual completion time
            duration: workoutDuration,
            exercises: cleanedWorkout.exercises.map((ex: WorkoutExercise) => ({
              name: ex.name,
              sets: ex.sets.map((set: ExerciseSet) => ({
                reps: parseInt(set.reps) || 0,
                weight: set.weight ? parseFloat(set.weight) : undefined,
              })),
            })),
          };

          const healthKitSuccess = await healthKitService.saveWorkoutToHealthKit(healthKitWorkout, user.uid);
          if (healthKitSuccess) {
            console.log('Workout successfully synced to Apple HealthKit');
          } else {
            console.log('Workout not synced to HealthKit (disabled or unavailable)');
          }
        }
      } catch (healthKitError) {
        console.error('Error syncing workout to HealthKit:', healthKitError);
        // Don't fail the entire save operation if HealthKit sync fails
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
    // For now, still use the modal for editing existing workouts
    // TODO: Create separate edit screen
    setEditingWorkout(workout);
    setModalVisible(true);
  };

  const handleNewWorkout = () => {
    // Navigate to the new create workout screen
    router.push({
      pathname: '/createWorkout',
      params: { date: selectedDate.toISOString() }
    });
  };

  const handleStartWorkout = (workout: Workout) => {
    setActiveWorkout(workout);
    setWorkoutSessionVisible(true);
  };

  const handleStartDraft = (workout: Workout) => {
    // Navigate to create workout screen with workout data for editing
    router.push({
      pathname: '/createWorkout',
      params: { 
        selectedWorkout: JSON.stringify(workout),
        date: selectedDate.toISOString()
      }
    });
  };

  const handleDeleteDraft = async (workout: Workout) => {
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

  const handleWorkoutComplete = async (completedWorkout: Workout) => {
    // Mark workout as completed and save to Firestore
    const updatedWorkout = {
      ...completedWorkout,
      isCompleted: true,
      completedAt: new Date(),
    };
    
    await handleWorkoutUpdate(updatedWorkout);
    setWorkoutSessionVisible(false);
    setActiveWorkout(null);
  };

  const handleWorkoutSessionClose = () => {
    setWorkoutSessionVisible(false);
    setActiveWorkout(null);
  };

  const handleSyncWorkoutToHealthKit = async (workout: Workout) => {
    if (!user) return;

    try {
      // Check if HealthKit is available
      if (!healthKitService.isHealthKitAvailable()) {
        Alert.alert(
          'HealthKit Unavailable',
          'Apple HealthKit is not available on this device.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get user's HealthKit settings
      const settings = await healthKitService.getHealthKitSettings(user.uid);
      
      if (!settings.enabled) {
        Alert.alert(
          'HealthKit Disabled',
          'HealthKit sync is disabled. Please enable it in your profile settings first.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                // TODO: Navigate to settings screen
                console.log('Navigate to HealthKit settings');
              }
            }
          ]
        );
        return;
      }

      if (!settings.syncWorkouts) {
        Alert.alert(
          'Workout Sync Disabled',
          'Workout syncing to HealthKit is disabled. Please enable it in your HealthKit settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                // TODO: Navigate to settings screen
                console.log('Navigate to HealthKit settings');
              }
            }
          ]
        );
        return;
      }

      // Initialize HealthKit if not already initialized
      const initialized = await healthKitService.initializeHealthKit();
      if (!initialized) {
        Alert.alert(
          'HealthKit Initialization Failed',
          'Failed to initialize HealthKit. Please check your device permissions in the Health app.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Convert workout data to HealthKit format
      const completionTime = workout.completedAt || new Date(); // Use stored completion time or current time
      const workoutDuration = workout.duration || 60; // Default 60 minutes
      const startTime = new Date(completionTime.getTime() - (workoutDuration * 60 * 1000)); // Calculate start time based on duration
      
      const healthKitWorkout = {
        title: workout.title,
        startDate: startTime, // Use calculated start time
        endDate: completionTime, // Use actual completion time
        duration: workoutDuration,
        exercises: workout.exercises.map((ex: WorkoutExercise) => ({
          name: ex.name,
          sets: ex.sets.map((set: ExerciseSet) => ({
            reps: parseInt(set.reps) || 0,
            weight: set.weight ? parseFloat(set.weight) : undefined,
          })),
        })),
      };

      const success = await healthKitService.saveWorkoutToHealthKit(healthKitWorkout, user.uid);
      
      if (success) {
        Alert.alert(
          'HealthKit Sync',
          'Workout successfully synced to Apple Health!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'HealthKit Sync Failed',
          'Unable to sync workout to Apple Health. This may be due to missing permissions or HealthKit restrictions.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error syncing workout to HealthKit:', error);
      Alert.alert(
        'Sync Error',
        'Failed to sync workout to Apple Health. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatSelectedDate = (date: Date): string => {
    try {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
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
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Unknown Date';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const resetToToday = () => {
    setSelectedDate(new Date());
  };

  // Early return if auth not ready
  if (!isReady) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardSafeScreenWrapper
        keyboardVerticalOffset={88}
        style={styles.container}
      >
        <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollViewContent,
            { paddingBottom: 100 }
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Compact Date Navigation */}
          <ThemedView style={styles.dateNavigation}>
            <TouchableOpacity 
              onPress={() => navigateDate('prev')}
              style={[styles.dateNavButton, { borderColor: colors.text + '20' }]}
            >
              <FontAwesome5 name="chevron-left" size={16} color={colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateDisplay, { borderColor: colors.text + '20' }]}
            >
              <FontAwesome5 name="calendar-alt" size={16} color={themeColor} style={styles.calendarIcon} />
              <ThemedText style={styles.dateDisplayText}>
                {formatSelectedDate(selectedDate)}
              </ThemedText>
              {workoutDates.some(date => date.toDateString() === selectedDate.toDateString()) && (
                <View style={[styles.workoutIndicator, { backgroundColor: themeColor }]} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => navigateDate('next')}
              style={[styles.dateNavButton, { borderColor: colors.text + '20' }]}
            >
              <FontAwesome5 name="chevron-right" size={16} color={colors.text} />
            </TouchableOpacity>
          </ThemedView>

          {/* Selected Date Section */}
          <ThemedView style={styles.dateSection}>
            <View style={styles.dateSectionHeader}>
              <ThemedText type="subtitle" style={styles.dateTitle}>
                {formatSelectedDate(selectedDate)}
              </ThemedText>
              <TouchableOpacity
                onPress={handleNewWorkout}
                style={[styles.addButton, { backgroundColor: themeColor }]}
              >
                <FontAwesome5 name="plus" size={16} color="#fff" />
                <ThemedText style={styles.addButtonText}>Create Workout</ThemedText>
              </TouchableOpacity>
            </View>
            
            {/* Exercise Library Section */}
            <TouchableOpacity
              style={[styles.exerciseLibraryButton, { borderColor: colors.text + '20' }]}
              onPress={() => router.push('/exerciseBrowserScreen')}
              activeOpacity={0.7}
            >
              <View style={styles.exerciseLibraryContent}>
                <View style={styles.exerciseLibraryIcon}>
                  <FontAwesome5 name="book-open" size={24} color={themeColor} />
                </View>
                <View style={styles.exerciseLibraryText}>
                  <ThemedText style={styles.exerciseLibraryTitle}>
                    Exercise Library
                  </ThemedText>
                  <ThemedText style={styles.exerciseLibrarySubtitle}>
                    Browse exercises with descriptions and instructional videos
                  </ThemedText>
                </View>
                <View style={styles.exerciseLibraryChevron}>
                  <FontAwesome5 name="chevron-right" size={16} color="#C7C7CC" />
                </View>
              </View>
            </TouchableOpacity>

            {/* Workouts for selected date */}
            {loading ? (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={styles.emptyText}>Loading workouts...</ThemedText>
              </ThemedView>
            ) : selectedDateWorkouts.length > 0 ? (
              <View style={styles.workoutsList}>
                {selectedDateWorkouts
                  .filter(workout => {
                    // Extra validation before rendering
                    return workout && 
                           typeof workout === 'object' && 
                           workout.id && 
                           workout.title && 
                           Array.isArray(workout.exercises) && 
                           workout.exercises.length > 0;
                  })
                  .map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onPress={() => handleEditWorkout(workout)}
                    onEdit={() => handleEditWorkout(workout)}
                    onDelete={() => handleDeleteWorkout(workout)}
                    onSyncToHealthKit={handleSyncWorkoutToHealthKit}
                    onWorkoutUpdate={handleWorkoutUpdate}
                    onStartWorkout={() => handleStartWorkout(workout)}
                  />
                ))}
              </View>
            ) : (
              <ThemedView style={styles.emptyState}>
                {upcomingWorkouts.length > 0 ? (
                  // Show upcoming planned workouts when available
                  <View style={styles.draftsSection}>
                    <FontAwesome5 name="calendar-check" size={48} color={(colors.text || '#000000') + '30'} />
                    <ThemedText style={styles.draftsTitle}>Upcoming Workouts</ThemedText>
                    <ThemedText style={styles.draftsSubtitle}>
                      Your planned workouts for the coming days
                    </ThemedText>
                    {upcomingWorkouts.slice(0, 3).map((workout: Workout) => (
                      <TouchableOpacity
                        key={workout.id}
                        style={[styles.draftCard, { borderColor: colors.text + '20' }]}
                        onPress={() => handleStartDraft(workout)}
                      >
                        <View style={styles.draftContent}>
                          <View style={styles.draftHeader}>
                            <ThemedText style={styles.draftTitle}>{workout.title}</ThemedText>
                            <TouchableOpacity
                              onPress={() => handleDeleteDraft(workout)}
                              style={styles.draftDeleteButton}
                            >
                              <FontAwesome5 name="trash" size={12} color="#ff4444" />
                            </TouchableOpacity>
                          </View>
                          <ThemedText style={styles.draftExercises}>
                            {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                          </ThemedText>
                          <ThemedText style={styles.draftDate}>
                            Planned for {new Date(workout.date).toLocaleDateString()}
                          </ThemedText>
                        </View>
                        <FontAwesome5 name="chevron-right" size={14} color={colors.text + '40'} />
                      </TouchableOpacity>
                    ))}
                    {upcomingWorkouts.length > 3 && (
                      <ThemedText style={styles.draftsMore}>
                        +{upcomingWorkouts.length - 3} more upcoming workout{upcomingWorkouts.length - 3 !== 1 ? 's' : ''}
                      </ThemedText>
                    )}
                  </View>
                ) : (
                  // Show "no workouts planned" only when no upcoming workouts
                  <>
                    <FontAwesome5 name="dumbbell" size={48} color={(colors.text || '#000000') + '30'} />
                    <ThemedText style={styles.emptyText}>No workouts planned</ThemedText>
                    <ThemedText style={styles.emptySubtext}>
                      Tap {`"Create Workout"`} to create your first workout for {formatSelectedDate(selectedDate)?.toLowerCase() || 'this date'}
                    </ThemedText>
                  </>
                )}
              </ThemedView>
            )}
          </ThemedView>

          {/* Upcoming Workouts */}
          {upcomingWorkouts.filter(workout => {
            const workoutDate = new Date(workout.date);
            workoutDate.setHours(0, 0, 0, 0);
            const selected = new Date(selectedDate);
            selected.setHours(0, 0, 0, 0);
            return workoutDate.getTime() !== selected.getTime(); // Exclude today's workouts (already shown above)
          }).length > 0 ? (
            <ThemedView style={styles.recentSection}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Upcoming Workouts
              </ThemedText>
              <View style={styles.workoutsList}>
                {upcomingWorkouts
                  .filter(workout => {
                    const workoutDate = new Date(workout.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    const selected = new Date(selectedDate);
                    selected.setHours(0, 0, 0, 0);
                    return workoutDate.getTime() !== selected.getTime(); // Exclude today's workouts
                  })
                  .filter(workout => {
                    // Extra validation before rendering
                    return workout && 
                           typeof workout === 'object' && 
                           workout.id && 
                           workout.title && 
                           Array.isArray(workout.exercises) && 
                           workout.exercises.length > 0;
                  })
                  .slice(0, 10)
                  .map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onPress={() => handleEditWorkout(workout)}
                    onEdit={() => handleEditWorkout(workout)}
                    onDelete={() => handleDeleteWorkout(workout)}
                    onSyncToHealthKit={handleSyncWorkoutToHealthKit}
                    onWorkoutUpdate={handleWorkoutUpdate}
                    onStartWorkout={() => handleStartWorkout(workout)}
                    showDate={true}
                  />
                ))}
              </View>
            </ThemedView>
          ) : null}

          {/* Recent Workouts */}
          {workouts.filter(workout => workout.isCompleted).length > 0 ? (
            <ThemedView style={styles.recentSection}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Completed Workouts
              </ThemedText>
              <View style={styles.workoutsList}>
                {workouts
                  .filter(workout => workout.isCompleted)
                  .filter(workout => {
                    // Extra validation before rendering
                    return workout && 
                           typeof workout === 'object' && 
                           workout.id && 
                           workout.title && 
                           Array.isArray(workout.exercises) && 
                           workout.exercises.length > 0;
                  })
                  .slice(0, 10)
                  .map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onPress={() => handleEditWorkout(workout)}
                    onEdit={() => handleEditWorkout(workout)}
                    onDelete={() => handleDeleteWorkout(workout)}
                    onSyncToHealthKit={handleSyncWorkoutToHealthKit}
                    onWorkoutUpdate={handleWorkoutUpdate}
                    onStartWorkout={() => handleStartWorkout(workout)}
                    showDate={true}
                  />
                ))}
              </View>
            </ThemedView>
          ) : null}
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

        {/* Workout Session Modal */}
        <WorkoutSessionModal
          visible={workoutSessionVisible}
          workout={activeWorkout}
          onComplete={handleWorkoutComplete}
          onClose={handleWorkoutSessionClose}
        />

        {/* Date Picker Modal */}
        <Modal
          isVisible={showDatePicker}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          onBackdropPress={() => setShowDatePicker(false)}
          onSwipeComplete={() => setShowDatePicker(false)}
          swipeDirection="down"
          style={{ justifyContent: 'flex-end', margin: 0 }}
        >
          <View style={{ backgroundColor: 'transparent' }}>
            <ThemedView style={[styles.datePickerContainer, { 
              maxHeight: '60%', 
              minHeight: 400,
              borderTopLeftRadius: 16, 
              borderTopRightRadius: 16,
              paddingBottom: insets.bottom 
            }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.text + '20' }]}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
                </TouchableOpacity>
              
                <TouchableOpacity onPress={() => {
                  setSelectedDate(new Date());
                  setShowDatePicker(false);
                }}>
                  <ThemedText type="subtitle">Today</ThemedText>
                </TouchableOpacity>
              
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(false)}
                  style={[styles.doneButton, { backgroundColor: themeColor }]}
                >
                  <ThemedText style={styles.doneButtonText}>Done</ThemedText>
                </TouchableOpacity>
              </View>
              
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={(date) => {
                  setSelectedDate(date);
                  setShowDatePicker(false);
                }}
                workoutDates={workoutDates}
                themeColor={themeColor}
              />
            </ThemedView>
          </View>
        </Modal>

        {/* Achievement Share Modal */}
        {achievementShare.isVisible && achievementShare.achievementType && achievementShare.achievementData && (
          <AchievementShareModal
            visible={achievementShare.isVisible}
            onClose={achievementShare.hideAchievementShare}
            achievementType={achievementShare.achievementType}
            achievementData={achievementShare.achievementData}
          />
        )}
      </ThemedView>
      </KeyboardSafeScreenWrapper>
    </SafeAreaView>
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
    marginBottom: 12,
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
    paddingVertical: 24,
    paddingHorizontal: 8,
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
  // Exercise Library Button Styles
  exerciseLibraryButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  exerciseLibraryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseLibraryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#53525223',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseLibraryText: {
    flex: 1,
  },
  exerciseLibraryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseLibrarySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 18,
  },
  exerciseLibraryChevron: {
    marginLeft: 8,
  },
  // Compact Date Navigation Styles
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  dateNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#F8F9FA',
    position: 'relative',
  },
  calendarIcon: {
    marginRight: 8,
  },
  dateDisplayText: {
    fontSize: 16,
    fontWeight: '600',
  },
  workoutIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Date Picker Modal Styles
  datePickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Upcoming Workouts Styles
  draftsSection: {
    marginTop: 24,
    width: '100%',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  draftsSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 16,
  },
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  draftContent: {
    flex: 1,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  draftDeleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  draftExercises: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  draftDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  draftsMore: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
