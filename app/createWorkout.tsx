import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Modal from 'react-native-modal';
import Calendar from '../components/Calendar';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import {
    ExerciseSet,
    MaxLift,
    Workout,
    WorkoutExercise
} from '../components/WorkoutModal';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { useColorScheme } from '../hooks/useColorScheme';
import { usePreferences } from '../hooks/usePreferences';
import { myExercisesService } from '../services/MyExercisesService';
import { Exercise as BaseExercise } from '../types/exercise';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateWorkoutScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const themeColor = colors.tint; // Add this line to define themeColor
  const { user } = useAuth();
  const { units } = usePreferences();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  // Parse the selected date from params, default to today
  const selectedDate = params.date ? new Date(params.date as string) : new Date();
  
  // Handle selected exercises returned from library screens
  const selectedExercisesParam = params.selectedExercises as string;
  
  // Handle selected workout returned from favorites
  const selectedWorkoutParam = params.selectedWorkout as string;
  
  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [workoutDate, setWorkoutDate] = useState(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [myExercises, setMyExercises] = useState<BaseExercise[]>([]);
  const [favoriteExercises, setFavoriteExercises] = useState<BaseExercise[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(true);

  // Store form state to preserve during parameter processing
  const formStateRef = useRef({
    title: '',
    duration: '',
    notes: '',
    workoutDate: selectedDate,
    exercises: [] as WorkoutExercise[]
  });

  // Update form state ref whenever form data changes
  useEffect(() => {
    formStateRef.current = {
      title,
      duration,
      notes,
      workoutDate,
      exercises
    };
  }, [title, duration, notes, workoutDate, exercises]);

  const handleStartWorkout = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a workout title');
      return;
    }
    
    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }
    
    // Validate exercises
    for (const exercise of exercises) {
      if (!exercise.name.trim()) {
        Alert.alert('Error', 'Please fill in all exercise names');
        return;
      }
    }

    const workoutData: Workout = {
      date: workoutDate,
      title: title.trim(),
      exercises,
      notes: notes.trim(),
      duration: duration ? parseInt(duration) : undefined,
    };

    // Navigate to ActiveWorkoutScreen instead of saving immediately
    router.push({
      pathname: '/activeWorkout',
      params: { workoutData: JSON.stringify(workoutData) }
    });
  };

  const saveMaxLifts = async (workout: Workout) => {
    if (!user) return;

    try {
      const maxLifts: MaxLift[] = [];
      
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
              unit: 'lbs', // Default to lbs for now
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
          unit: maxLift.unit || 'lbs', // Include unit field
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

  const saveCurrentWorkoutAsFavorite = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save favorites.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a workout title before saving as favorite.');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise before saving as favorite.');
      return;
    }

    try {
      const favoriteWorkout = {
        name: title.trim(),
        exercises: exercises.map(exercise => ({
          name: exercise.name,
          sets: exercise.sets,
          notes: exercise.notes,
          baseExercise: exercise.baseExercise
        })),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };

      console.log('=== SAVING FAVORITE WORKOUT ===');
      console.log('Full favoriteWorkout object:', JSON.stringify(favoriteWorkout, null, 2));
      console.log('Number of exercises:', favoriteWorkout.exercises.length);
      favoriteWorkout.exercises.forEach((ex, i) => {
        console.log(`Exercise ${i}:`, ex.name);
        console.log(`Exercise ${i} sets:`, ex.sets);
        if (ex.sets && ex.sets.length > 0) {
          ex.sets.forEach((set, j) => {
            console.log(`  Set ${j}:`, `${set.reps} reps, ${set.weight} weight`);
          });
        }
      });

      const favoritesRef = collection(db, 'profiles', user.uid, 'favoriteWorkouts');
      await addDoc(favoritesRef, favoriteWorkout);
      
      Alert.alert('Success', `"${title}" has been saved as a favorite workout!`);
    } catch (error) {
      console.error('Error saving favorite workout:', error);
      Alert.alert('Error', 'Failed to save favorite workout. Please try again.');
    }
  };

  const saveWorkoutDraft = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save workouts.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a workout title before saving.');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise before saving.');
      return;
    }

    // Validate exercises
    for (const exercise of exercises) {
      if (!exercise.name.trim()) {
        Alert.alert('Error', 'Please fill in all exercise names before saving.');
        return;
      }
    }

    try {
      const workoutData = {
        title: title.trim(),
        date: workoutDate, // Keep as Date object - Firebase will convert to Timestamp
        exercises,
        notes: notes.trim(),
        duration: duration ? parseInt(duration) : undefined,
        isCompleted: false, // Mark as planned (not completed)
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to main workouts collection as a planned workout
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      await addDoc(workoutsRef, workoutData);
      
      const isToday = workoutDate.toDateString() === new Date().toDateString();
      const isFuture = workoutDate > new Date();
      
      Alert.alert(
        'Workout Planned!', 
        `"${title}" has been saved${isFuture ? ' for ' + workoutDate.toLocaleDateString() : isToday ? ' for today' : ''}. You can find it in your workouts to start when ready.`,
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } catch (error) {
      console.error('Error saving planned workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  // Set up navigation header with start workout button
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Create Workout',
      headerShown: true,
      headerBackTitle: 'Back',
      headerTintColor: '#000000',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={saveWorkoutDraft}
            style={[styles.headerSaveButton, { backgroundColor: colors.tint + '20' }]}
          >
            <Text style={[styles.headerSaveText, { color: colors.tint }]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleStartWorkout}
            style={[styles.headerSaveButton, { backgroundColor: colors.tint }]}
          >
            <Text style={[styles.headerSaveText, { color: '#fff' }]}>Start</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, handleStartWorkout, saveWorkoutDraft, colors.tint]); // Re-run when functions change

  // Load user's saved exercises
  useEffect(() => {
    if (!user) return;
    
    const loadUserExercises = async () => {
      try {
        const userExercises = await myExercisesService.getMyExercises(user.uid);
        setMyExercises(userExercises);
        setFavoriteExercises(userExercises); // For now, favorites = my exercises
        console.log('Loaded user exercises:', userExercises.length);
      } catch (error) {
        console.error('Error loading user exercises:', error);
      }
    };
    
    loadUserExercises();
  }, [user]);

  const addExerciseFromLibrary = (exercise: BaseExercise) => {
    const newExercise: WorkoutExercise = {
      id: Date.now().toString(),
      name: exercise.name,
      sets: [
        {
          id: `${Date.now()}-1`,
          reps: '10',
          weight: '',
          notes: '',
        }
      ],
      notes: '',
      baseExercise: exercise,
    };
    setExercises([...exercises, newExercise]);
    setShowQuickActions(false); // Hide quick actions after adding first exercise
  };

  // Track if we've processed these parameters to avoid infinite loops
  const [processedParams, setProcessedParams] = useState<Set<string>>(new Set());

  // Handle selected exercises returned from library screens
  useEffect(() => {
    if (selectedExercisesParam && !processedParams.has(selectedExercisesParam)) {
      try {
        console.log('Raw selectedExercisesParam:', selectedExercisesParam);
        const selectedExercises: BaseExercise[] = JSON.parse(selectedExercisesParam);
        console.log('Parsed selectedExercises:', selectedExercises);
        console.log('Number of exercises:', selectedExercises.length);
        
        // Check if we have form data to restore
        const formDataParam = params.formData as string;
        if (formDataParam) {
          try {
            const formData = JSON.parse(decodeURIComponent(formDataParam));
            console.log('Restoring form data:', formData);
            
            // Restore form state
            setTitle(formData.title || '');
            setDuration(formData.duration || '');
            setNotes(formData.notes || '');
            if (formData.date) {
              setWorkoutDate(new Date(formData.date));
            }
            
            // Parse existing exercises
            let existingExercises: WorkoutExercise[] = [];
            if (formData.exercises) {
              try {
                existingExercises = JSON.parse(formData.exercises);
              } catch (e) {
                console.log('No existing exercises to parse');
              }
            }
            
            // Convert new selected exercises to WorkoutExercises
            const newWorkoutExercises: WorkoutExercise[] = selectedExercises.map((exercise, index) => ({
              id: `${Date.now()}-${index}`,
              name: exercise.name,
              sets: [
                {
                  id: `${Date.now()}-${index}-1`,
                  reps: '10',
                  weight: '',
                  notes: '',
                }
              ],
              notes: '',
              baseExercise: exercise,
            }));
            
            // Combine existing and new exercises
            setExercises([...existingExercises, ...newWorkoutExercises]);
          } catch (error) {
            console.error('Error parsing form data:', error);
            // Fallback to just adding exercises without restoring form
            const newWorkoutExercises: WorkoutExercise[] = selectedExercises.map((exercise, index) => ({
              id: `${Date.now()}-${index}`,
              name: exercise.name,
              sets: [
                {
                  id: `${Date.now()}-${index}-1`,
                  reps: '10',
                  weight: '',
                  notes: '',
                }
              ],
              notes: '',
              baseExercise: exercise,
            }));
            setExercises(prev => [...prev, ...newWorkoutExercises]);
          }
        } else {
          // No form data, just add exercises
          const newWorkoutExercises: WorkoutExercise[] = selectedExercises.map((exercise, index) => ({
            id: `${Date.now()}-${index}`,
            name: exercise.name,
            sets: [
              {
                id: `${Date.now()}-${index}-1`,
                reps: '10',
                weight: '',
                notes: '',
              }
            ],
            notes: '',
            baseExercise: exercise,
          }));
          setExercises(prev => [...prev, ...newWorkoutExercises]);
        }
        
        setShowQuickActions(false);
        
        // Mark this parameter as processed
        setProcessedParams(prev => new Set(prev).add(selectedExercisesParam));
      } catch (error) {
        console.error('Error parsing selected exercises:', error);
        Alert.alert('Error', `Failed to parse exercises: ${error}`);
      }
    }
  }, [selectedExercisesParam, processedParams]);

  // Handle selected workout returned from favorites  
  useEffect(() => {
    if (selectedWorkoutParam && !processedParams.has(selectedWorkoutParam)) {
      try {
        const selectedWorkout: any = JSON.parse(selectedWorkoutParam);
        console.log('=== LOADING FAVORITE WORKOUT ===');
        console.log('Full selectedWorkout object:', JSON.stringify(selectedWorkout, null, 2));
        console.log('selectedWorkout.exercises:', selectedWorkout.exercises);
        console.log('selectedWorkout.defaultSets:', selectedWorkout.defaultSets);
        console.log('Type of exercises:', typeof selectedWorkout.exercises);
        console.log('Is exercises array?', Array.isArray(selectedWorkout.exercises));
        if (selectedWorkout.exercises) {
          console.log('Exercises length:', selectedWorkout.exercises.length);
        }
        
        // Check if we have form data to restore first
        const formDataParam = params.formData as string;
        if (formDataParam) {
          try {
            const formData = JSON.parse(decodeURIComponent(formDataParam));
            console.log('Restoring form data with favorite workout:', formData);
            
            // Restore form state
            setTitle(formData.title || selectedWorkout.name || 'Favorite Workout');
            setDuration(formData.duration || '');
            setNotes(formData.notes || selectedWorkout.notes || '');
            if (formData.date) {
              setWorkoutDate(new Date(formData.date));
            }
            
            // Parse existing exercises from form data
            let existingExercises: WorkoutExercise[] = [];
            if (formData.exercises) {
              try {
                existingExercises = JSON.parse(formData.exercises);
              } catch (e) {
                console.log('No existing exercises to parse');
              }
            }
            
            // Convert favorite workout exercises and combine with existing
            let favoriteExercises: WorkoutExercise[] = [];
            if (selectedWorkout.exercises && Array.isArray(selectedWorkout.exercises)) {
              console.log('Loading favorite workout exercises:', selectedWorkout.exercises);
              // New format with proper exercise names
              favoriteExercises = selectedWorkout.exercises.map((exercise: any, index: number) => {
                console.log(`Exercise ${index}:`, exercise);
                console.log(`Exercise ${index} sets:`, exercise.sets);
                
                // Ensure sets have proper structure and IDs
                let processedSets = exercise.sets;
                if (Array.isArray(exercise.sets) && exercise.sets.length > 0) {
                  processedSets = exercise.sets.map((set: any, setIndex: number) => ({
                    id: set.id || `favorite-set-${index}-${setIndex}-${Date.now()}`,
                    reps: set.reps || '10',
                    weight: set.weight || '',
                    notes: set.notes || '',
                  }));
                } else {
                  // Fallback if no sets or invalid sets
                  processedSets = [
                    {
                      id: `favorite-set-${index}-${Date.now()}`,
                      reps: '10',
                      weight: '',
                      notes: '',
                    }
                  ];
                }
                
                return {
                  id: `favorite-${index}-${Date.now()}`,
                  name: exercise.name || `Exercise ${index + 1}`,
                  sets: processedSets,
                  notes: exercise.notes || '',
                  baseExercise: exercise.baseExercise,
                };
              });
            } else if (selectedWorkout.defaultSets && Array.isArray(selectedWorkout.defaultSets)) {
              // Legacy format with just sets
              favoriteExercises = selectedWorkout.defaultSets.map((set: any, index: number) => ({
                id: `favorite-${index}-${Date.now()}`,
                name: `Exercise ${index + 1}`, // Fallback for legacy format
                sets: [
                  {
                    id: `favorite-set-${index}-${Date.now()}`,
                    reps: set.reps || '10',
                    weight: set.weight || '',
                    notes: set.notes || '',
                  }
                ],
                notes: '',
              }));
            }
            
            // Combine existing and favorite exercises
            setExercises([...existingExercises, ...favoriteExercises]);
          } catch (error) {
            console.error('Error parsing form data with favorite workout:', error);
            // Fallback to just adding favorite workout without restoring form
            setTitle(selectedWorkout.name || 'Favorite Workout');
            setNotes(selectedWorkout.notes || '');
            
            let favoriteExercises: WorkoutExercise[] = [];
            if (selectedWorkout.exercises && Array.isArray(selectedWorkout.exercises)) {
              favoriteExercises = selectedWorkout.exercises.map((exercise: any, index: number) => ({
                id: `favorite-${index}-${Date.now()}`,
                name: exercise.name || `Exercise ${index + 1}`,
                sets: exercise.sets || [
                  {
                    id: `favorite-set-${index}-${Date.now()}`,
                    reps: '10',
                    weight: '',
                    notes: '',
                  }
                ],
                notes: exercise.notes || '',
                baseExercise: exercise.baseExercise,
              }));
            } else if (selectedWorkout.defaultSets && Array.isArray(selectedWorkout.defaultSets)) {
              favoriteExercises = selectedWorkout.defaultSets.map((set: any, index: number) => ({
                id: `favorite-${index}-${Date.now()}`,
                name: `Exercise ${index + 1}`,
                sets: [
                  {
                    id: `favorite-set-${index}-${Date.now()}`,
                    reps: set.reps || '10',
                    weight: set.weight || '',
                    notes: set.notes || '',
                  }
                ],
                notes: '',
              }));
            }
            
            setExercises(favoriteExercises);
          }
        } else {
          // No form data, just add favorite workout
          setTitle(selectedWorkout.name || 'Favorite Workout');
          setNotes(selectedWorkout.notes || '');
          
          let favoriteExercises: WorkoutExercise[] = [];
          if (selectedWorkout.exercises && Array.isArray(selectedWorkout.exercises)) {
            console.log('Loading favorite workout exercises (no form data):', selectedWorkout.exercises);
            favoriteExercises = selectedWorkout.exercises.map((exercise: any, index: number) => {
              console.log(`Exercise ${index}:`, exercise);
              console.log(`Exercise ${index} sets:`, exercise.sets);
              
              // Ensure sets have proper structure and IDs
              let processedSets = exercise.sets;
              if (Array.isArray(exercise.sets) && exercise.sets.length > 0) {
                processedSets = exercise.sets.map((set: any, setIndex: number) => ({
                  id: set.id || `favorite-set-${index}-${setIndex}-${Date.now()}`,
                  reps: set.reps || '10',
                  weight: set.weight || '',
                  notes: set.notes || '',
                }));
              } else {
                // Fallback if no sets or invalid sets
                processedSets = [
                  {
                    id: `favorite-set-${index}-${Date.now()}`,
                    reps: '10',
                    weight: '',
                    notes: '',
                  }
                ];
              }
              
              return {
                id: `favorite-${index}-${Date.now()}`,
                name: exercise.name || `Exercise ${index + 1}`,
                sets: processedSets,
                notes: exercise.notes || '',
                baseExercise: exercise.baseExercise,
              };
            });
          } else if (selectedWorkout.defaultSets && Array.isArray(selectedWorkout.defaultSets)) {
            favoriteExercises = selectedWorkout.defaultSets.map((set: any, index: number) => ({
              id: `favorite-${index}-${Date.now()}`,
              name: `Exercise ${index + 1}`,
              sets: [
                {
                  id: `favorite-set-${index}-${Date.now()}`,
                  reps: set.reps || '10',
                  weight: set.weight || '',
                  notes: set.notes || '',
                }
              ],
              notes: '',
            }));
          }
          
          setExercises(favoriteExercises);
        }
        
        setShowQuickActions(false);
        
        // Mark this parameter as processed
        setProcessedParams(prev => new Set(prev).add(selectedWorkoutParam));
      } catch (error) {
        console.error('Error parsing selected workout:', error);
      }
    }
  }, [selectedWorkoutParam, processedParams]);

  const addEmptyExercise = () => {
    const newExercise: WorkoutExercise = {
      id: Date.now().toString(),
      name: '',
      sets: [
        {
          id: `${Date.now()}-1`,
          reps: '10',
          weight: '',
          notes: '',
        }
      ],
      notes: '',
    };
    setExercises([...exercises, newExercise]);
    setShowQuickActions(false);
  };

  const addSetToExercise = (exerciseIndex: number) => {
    const updatedExercises = [...exercises];
    const newSet: ExerciseSet = {
      id: `${Date.now()}-${updatedExercises[exerciseIndex].sets.length + 1}`,
      reps: '10',
      weight: '',
      notes: '',
    };
    updatedExercises[exerciseIndex].sets.push(newSet);
    setExercises(updatedExercises);
  };

  const removeSetFromExercise = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...exercises];
    if (updatedExercises[exerciseIndex].sets.length > 1) {
      updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
      setExercises(updatedExercises);
    }
  };

  const updateExerciseSet = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: string) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      [field]: value
    };
    setExercises(updatedExercises);
  };

  const updateExercise = (index: number, field: keyof WorkoutExercise, value: any) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setExercises(updatedExercises);
  };

  const removeExercise = (index: number) => {
    const newExercises = exercises.filter((_, i) => i !== index);
    setExercises(newExercises);
    if (newExercises.length === 0) {
      setShowQuickActions(true); // Show quick actions if no exercises left
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Info Row */}
          <View style={styles.quickInfoRow}>
          {/* Date Selector */}
          <TouchableOpacity 
            style={[styles.dateSelector, { borderColor: colors.text + '20' }]}
            onPress={() => setShowDatePicker(true)}
          >
            <FontAwesome5 name="calendar-alt" size={14} color={colors.text + '60'} />
            <Text style={[styles.dateSelectorText, { color: colors.text }]}>
              {formatDate(workoutDate)}
            </Text>
          </TouchableOpacity>

          {/* Duration Input */}
          <View style={styles.durationContainer}>
            <TextInput
              style={[styles.durationInput, { color: colors.text, borderColor: colors.text + '20' }]}
              value={duration}
              onChangeText={setDuration}
              placeholder="45 min"
              placeholderTextColor={colors.text + '60'}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.section}>
          <TextInput
            style={[styles.titleInput, { color: colors.text, borderColor: colors.text + '20' }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Workout title (e.g., Upper Body Strength)"
            placeholderTextColor={colors.text + '60'}
          />
        </View>

        {/* Quick Actions */}
        {showQuickActions && (
          <View style={styles.quickActions}>
            <ThemedText style={styles.quickActionsTitle}>Quick Start</ThemedText>
            
            <View style={styles.quickActionButtons}>
              <TouchableOpacity
                style={[styles.quickActionButton, { borderColor: colors.tint + '30', backgroundColor: colors.tint + '10' }]}
                onPress={() => {
                  const formData = {
                    title,
                    duration,
                    notes,
                    date: workoutDate.toISOString(),
                    exercises: JSON.stringify(exercises)
                  };
                  router.push({
                    pathname: '/myExercises',
                    params: {
                      selectionMode: 'true',
                      returnTo: 'createWorkout',
                      formData: encodeURIComponent(JSON.stringify(formData))
                    }
                  });
                }}
              >
                <FontAwesome5 name="dumbbell" size={20} color={colors.tint} />
                <ThemedText style={styles.quickActionTitle}>My Exercises</ThemedText>
                <ThemedText style={styles.quickActionSubtitle}>{myExercises.length} saved</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { borderColor: '#FFD700' + '30', backgroundColor: '#FFD700' + '10' }]}
                onPress={() => {
                  // If we have enough content, show save/load options
                  if (title.trim() && exercises.length > 0) {
                    Alert.alert(
                      'Favorite Workout',
                      'What would you like to do?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Save as Favorite', 
                          onPress: () => saveCurrentWorkoutAsFavorite()
                        },
                        { 
                          text: 'Load Favorite', 
                          onPress: () => {
                            const formData = {
                              title,
                              duration,
                              notes,
                              date: workoutDate.toISOString(),
                              exercises: JSON.stringify(exercises)
                            };
                            router.push({
                              pathname: '/manageFavorites',
                              params: {
                                selectionMode: 'true',
                                returnTo: 'createWorkout',
                                formData: encodeURIComponent(JSON.stringify(formData))
                              }
                            });
                          }
                        }
                      ]
                    );
                  } else {
                    // Just load favorites if no content
                    const formData = {
                      title,
                      duration,
                      notes,
                      date: workoutDate.toISOString(),
                      exercises: JSON.stringify(exercises)
                    };
                    router.push({
                      pathname: '/manageFavorites',
                      params: {
                        selectionMode: 'true',
                        returnTo: 'createWorkout',
                        formData: encodeURIComponent(JSON.stringify(formData))
                      }
                    });
                  }
                }}
              >
                <FontAwesome5 name="star" size={20} color="#FFD700" solid />
                <ThemedText style={styles.quickActionTitle}>Fav Workouts</ThemedText>
                <ThemedText style={styles.quickActionSubtitle}>Save or load</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { borderColor: colors.text + '20', backgroundColor: colors.background + '50' }]}
                onPress={() => {
                  const formData = {
                    title,
                    duration,
                    notes,
                    date: workoutDate.toISOString(),
                    exercises: JSON.stringify(exercises)
                  };
                  router.push({
                    pathname: '/exerciseBrowserScreen',
                    params: {
                      selectionMode: 'true',
                      returnTo: 'createWorkout',
                      formData: encodeURIComponent(JSON.stringify(formData))
                    }
                  });
                }}
              >
                <FontAwesome5 name="search" size={20} color={colors.text} />
                <ThemedText style={styles.quickActionTitle}>Browse All</ThemedText>
                <ThemedText style={styles.quickActionSubtitle}>Find exercises</ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.startFromScratchButton, { borderColor: colors.text + '20' }]}
              onPress={addEmptyExercise}
            >
              <FontAwesome5 name="plus" size={16} color={colors.text} />
              <ThemedText style={styles.startFromScratchText}>Start from scratch</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Exercises List */}
        {exercises.length > 0 && (
          <View style={styles.exercisesList}>
            <View style={styles.exercisesHeader}>
              <ThemedText style={styles.exercisesTitle}>Exercises ({exercises.length})</ThemedText>
              <View style={styles.exerciseHeaderActions}>
                <TouchableOpacity
                  onPress={() => {
                    const formData = {
                      title,
                      duration,
                      notes,
                      date: workoutDate.toISOString(),
                      exercises: JSON.stringify(exercises)
                    };
                    router.push({
                      pathname: '/myExercises',
                      params: {
                        selectionMode: 'true',
                        returnTo: 'createWorkout',
                        formData: encodeURIComponent(JSON.stringify(formData))
                      }
                    });
                  }}
                  style={[styles.headerActionButton, { borderColor: colors.tint + '30', backgroundColor: colors.tint + '10' }]}
                >
                  <FontAwesome5 name="dumbbell" size={12} color={colors.tint} />
                  
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    // If we have enough content, show save/load options
                    if (title.trim() && exercises.length > 0) {
                      Alert.alert(
                        'Favorite Workout',
                        'What would you like to do?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Save as Favorite', 
                            onPress: () => saveCurrentWorkoutAsFavorite()
                          },
                          { 
                            text: 'Load Favorite', 
                            onPress: () => {
                              const formData = {
                                title,
                                duration,
                                notes,
                                date: workoutDate.toISOString(),
                                exercises: JSON.stringify(exercises)
                              };
                              router.push({
                                pathname: '/manageFavorites',
                                params: {
                                  selectionMode: 'true',
                                  returnTo: 'createWorkout',
                                  formData: encodeURIComponent(JSON.stringify(formData))
                                }
                              });
                            }
                          }
                        ]
                      );
                    } else {
                      // Just load favorites if no content
                      const formData = {
                        title,
                        duration,
                        notes,
                        date: workoutDate.toISOString(),
                        exercises: JSON.stringify(exercises)
                      };
                      router.push({
                        pathname: '/manageFavorites',
                        params: {
                          selectionMode: 'true',
                          returnTo: 'createWorkout',
                          formData: encodeURIComponent(JSON.stringify(formData))
                        }
                      });
                    }
                  }}
                  style={[styles.headerActionButton, { borderColor: '#FFD700' + '30', backgroundColor: '#FFD700' + '10' }]}
                >
                  <FontAwesome5 name="star" size={12} color="#FFD700" solid />
                  
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const formData = {
                      title,
                      duration,
                      notes,
                      date: workoutDate.toISOString(),
                      exercises: JSON.stringify(exercises)
                    };
                    router.push({
                      pathname: '/exerciseBrowserScreen',
                      params: {
                        selectionMode: 'true',
                        returnTo: 'createWorkout',
                        formData: encodeURIComponent(JSON.stringify(formData))
                      }
                    });
                  }}
                  style={[styles.headerActionButton, { borderColor: colors.text + '20', backgroundColor: colors.background + '50' }]}
                >
                  <FontAwesome5 name="search" size={12} color={colors.text} />
                  
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addEmptyExercise}
                  style={[styles.addExerciseButton, { backgroundColor: colors.tint }]}
                >
                  <FontAwesome5 name="plus" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {exercises.map((exercise, index) => (
              <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.background + '50', borderColor: colors.text + '10' }]}>
                <View style={styles.exerciseHeader}>
                  <TextInput
                    style={[styles.exerciseNameInput, { color: colors.text, borderColor: colors.text + '20' }]}
                    value={exercise.name}
                    onChangeText={(value) => updateExercise(index, 'name', value)}
                    placeholder="Exercise name"
                    placeholderTextColor={colors.text + '60'}
                  />
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity
                      onPress={() => updateExercise(index, 'isMaxLift', !exercise.isMaxLift)}
                      style={[styles.maxLiftButton, exercise.isMaxLift && { backgroundColor: '#FF6B35' + '20' }]}
                    >
                      <FontAwesome5 
                        name="trophy" 
                        size={12} 
                        color={exercise.isMaxLift ? "#FF6B35" : colors.text + '60'} 
                        solid={exercise.isMaxLift}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeExercise(index)}
                      style={styles.removeExerciseButton}
                    >
                      <FontAwesome5 name="trash" size={12} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.setsContainer}>
                  <View style={styles.setsHeader}>
                    <ThemedText style={styles.setsTitle}>Sets</ThemedText>
                    <TouchableOpacity
                      onPress={() => addSetToExercise(index)}
                      style={[styles.addSetButton, { backgroundColor: colors.tint + '20' }]}
                    >
                      <FontAwesome5 name="plus" size={10} color={colors.tint} />
                      <ThemedText style={[styles.addSetText, { color: colors.tint }]}>Add</ThemedText>
                    </TouchableOpacity>
                  </View>

                  {exercise.sets.map((set, setIndex) => (
                    <View key={set.id} style={styles.setRow}>
                      <View style={styles.setNumber}>
                        <ThemedText style={styles.setNumberText}>{setIndex + 1}</ThemedText>
                      </View>
                      
                      <View style={styles.setInputs}>
                        <TextInput
                          style={[styles.setInput, { color: colors.text, borderColor: colors.text + '20' }]}
                          value={set.reps}
                          onChangeText={(value) => updateExerciseSet(index, setIndex, 'reps', value)}
                          placeholder="Reps"
                          placeholderTextColor={colors.text + '60'}
                        />
                        <TextInput
                          style={[styles.setInput, { color: colors.text, borderColor: colors.text + '20' }]}
                          value={set.weight || ''}
                          onChangeText={(value) => updateExerciseSet(index, setIndex, 'weight', value)}
                          placeholder={`Weight (${units})`}
                          placeholderTextColor={colors.text + '60'}
                        />
                      </View>

                      {exercise.sets.length > 1 && (
                        <TouchableOpacity
                          onPress={() => removeSetFromExercise(index, setIndex)}
                          style={styles.removeSetButton}
                        >
                          <FontAwesome5 name="minus" size={10} color="#ff4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>

                <TextInput
                  style={[styles.exerciseNotesInput, { color: colors.text, borderColor: colors.text + '20' }]}
                  value={exercise.notes || ''}
                  onChangeText={(value) => updateExercise(index, 'notes', value)}
                  placeholder="Notes (optional)"
                  placeholderTextColor={colors.text + '60'}
                  multiline
                />
              </View>
            ))}
          </View>
        )}

        {/* Workout Notes */}
        {exercises.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Workout Notes</ThemedText>
            <TextInput
              style={[styles.workoutNotesInput, { color: colors.text, borderColor: colors.text + '20' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did you feel? Any observations..."
              placeholderTextColor={colors.text + '60'}
              multiline
              numberOfLines={3}
            />
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (

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
                  setWorkoutDate(date);
                  setShowDatePicker(false);
                }}
                workoutDates={[workoutDate]}
                themeColor={themeColor}
              />
            </ThemedView>
          </View>
        </Modal>



      )}
    </ThemedView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },
  headerSaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerSaveText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  quickInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateSelectorText: {
    fontSize: 14,
    flex: 1,
  },
  durationContainer: {
    width: 80,
  },
  durationInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  quickActions: {
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
  },
  startFromScratchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  startFromScratchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  exercisesList: {
    marginBottom: 20,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flex: 1,
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  headerActionText: {
    fontSize: 9,
    fontWeight: '600',
  },
  addExerciseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  exerciseNameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  maxLiftButton: {
    padding: 6,
    borderRadius: 4,
  },
  removeExerciseButton: {
    padding: 6,
  },
  setsContainer: {
    marginBottom: 12,
  },
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  setsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  addSetText: {
    fontSize: 10,
    fontWeight: '600',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  setNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberText: {
    fontSize: 10,
    fontWeight: '600',
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    textAlign: 'center',
  },
  removeSetButton: {
    padding: 4,
  },
  exerciseNotesInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  workoutNotesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
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
    borderBottomColor: '#e0e0e0',
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
});
