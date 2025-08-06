import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { useColorScheme } from '../hooks/useColorScheme';
import { usePreferences } from '../hooks/usePreferences';
import { firestoreExerciseService } from '../services/FirestoreExerciseService';
import { myExercisesService } from '../services/MyExercisesService';
import { Exercise as BaseExercise } from '../types/exercise';
import Calendar from './Calendar';
import ExerciseInputWithSuggestions from './ExerciseInputWithSuggestions';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export interface ExerciseSet {
  id: string;
  reps: string; // Can be "10-12" or "30 seconds" etc.
  weight?: string;
  notes?: string;
}

// Workout-specific exercise that extends the base exercise
export interface WorkoutExercise {
  id: string;
  name: string;
  sets: ExerciseSet[]; // Changed from number to array of sets
  notes?: string;
  isMaxLift?: boolean;
  baseExercise?: BaseExercise;
}

export interface FavoriteWorkout {
  id: string;
  name: string;
  defaultSets: ExerciseSet[];
  notes?: string;
  createdAt: Date;
}

export interface FavoriteWorkoutTemplate {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
  notes?: string;
  createdAt: Date;
}

export interface MaxLift {
  id: string;
  exerciseName: string;
  weight: string;
  reps: string;
  date: Date;
  workoutId?: string;
  notes?: string;
}

export interface Workout {
  id?: string;
  date: Date;
  title: string;
  exercises: WorkoutExercise[];
  notes?: string;
  duration?: number;
  isCompleted?: boolean;
  completedAt?: Date;
}

interface WorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (workout: Workout) => void;
  workout?: Workout;
  selectedDate: Date;
}

export default function WorkoutModal({ 
  visible, 
  onClose, 
  onSave, 
  workout, 
  selectedDate 
}: WorkoutModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { units } = usePreferences();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [workoutDate, setWorkoutDate] = useState(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showMyExercises, setShowMyExercises] = useState(false);
  const [showFavoriteExercises, setShowFavoriteExercises] = useState(false);
  const [myExercises, setMyExercises] = useState<BaseExercise[]>([]);
  const [favoriteExercises, setFavoriteExercises] = useState<BaseExercise[]>([]);
  const [libraryExercises, setLibraryExercises] = useState<(BaseExercise | string)[]>([]);
  
  // Initialize form when workout changes
  useEffect(() => {
    if (workout) {
      setTitle(workout.title);
      setExercises(workout.exercises);
      setNotes(workout.notes || '');
      setDuration(workout.duration?.toString() || '');
      setWorkoutDate(workout.date);
    } else {
      // Reset form for new workout
      setTitle('');
      setExercises([]);
      setNotes('');
      setDuration('');
      setWorkoutDate(selectedDate);
    }
  }, [workout, visible, selectedDate]);
  
  // Handle keyboard events for basic tracking
  useEffect(() => {
    if (!visible) return;

    const keyboardWillShow = (event: any) => {
      const height = event.endCoordinates.height;
      setKeyboardHeight(height);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const listeners = [
      Keyboard.addListener('keyboardWillShow', keyboardWillShow),
      Keyboard.addListener('keyboardWillHide', keyboardWillHide),
    ];

    return () => {
      listeners.forEach(listener => listener.remove());
    };
  }, [visible]);
  
  // Fetch exercise library for suggestions
  useEffect(() => {
    if (!user || !visible) return;
    
    // Load exercises from Firestore
    const loadExercises = async () => {
      try {
        console.log('Loading exercises from Firestore...');
        const firestoreExercises = await firestoreExerciseService.getAllExercisesSimple(100);
        console.log('Loaded exercises count:', firestoreExercises.length);
        
        if (firestoreExercises.length > 0) {
          console.log('Sample exercise:', firestoreExercises[0]);
          
          // Extract just the names as strings for additional suggestions
          const exerciseNames = firestoreExercises.map(exercise => exercise.name);
          console.log('Exercise names:', exerciseNames.slice(0, 5)); // Log first 5 names
          
          // Set both the full exercise objects and simple name strings for maximum compatibility
          setLibraryExercises([...firestoreExercises, ...exerciseNames]);
        } else {
          setLibraryExercises([]);
        }
      } catch (error) {
        console.error('Error loading exercises from Firestore:', error);
      }
    };
    
    loadExercises();
  }, [user, visible]);

  // Load user's saved exercises and favorites
  useEffect(() => {
    if (!user || !visible) return;
    
    const loadUserExercises = async () => {
      try {
        // Load my exercises from the user's personal collection
        const userExercises = await myExercisesService.getMyExercises(user.uid);
        setMyExercises(userExercises);
        console.log('Loaded user exercises:', userExercises.length);

        // For now, favorites are the same as my exercises (can be enhanced later)
        // TODO: Implement separate favorites collection if needed
        setFavoriteExercises(userExercises);
      } catch (error) {
        console.error('Error loading user exercises:', error);
      }
    };
    
    loadUserExercises();
  }, [user, visible]);

    const handleExerciseInputSelect = (index: number, exercise: BaseExercise | string) => {
    // When user selects from auto-suggestions
    if (typeof exercise === 'string') {
      console.log('handleExerciseInputSelect called with index:', index, 'and exercise string:', exercise);
      // If it's just a string, only update the name
      updateExercise(index, 'name', exercise);
      console.log('Exercise name updated to:', exercise);
    } else {
      console.log('handleExerciseInputSelect called with index:', index, 'and exercise object:', exercise.name);
      // If it's a full exercise object, update both baseExercise and name
      updateExercise(index, 'baseExercise', exercise);
      // Also update the name for consistency
      updateExercise(index, 'name', exercise.name);
      console.log('Exercise updated to:', exercise.name);
    }
  };

  const addExerciseFromPicker = (exercise: BaseExercise) => {
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
  };
  
  const addExercise = () => {
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
    console.log(`updateExercise called - index: ${index}, field: ${field}, value:`, value);
    
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    
    console.log('Updated exercise:', updatedExercises[index]);
    setExercises(updatedExercises);
  };
  
  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };
   const handleSave = async () => {
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
      id: workout?.id,
      date: workoutDate,
      title: title.trim(),
      exercises,
      notes: notes.trim(),
      duration: duration ? parseInt(duration) : undefined,
    };

    onSave(workoutData);

    // Save max lifts if any exercises are marked as max lifts
    await saveMaxLifts(workoutData);
  };
  
  const saveMaxLifts = async (workout: Workout) => {
    if (!user) return;

    try {
      const maxLifts: MaxLift[] = [];
      
      workout.exercises.forEach(exercise => {
        if (exercise.isMaxLift && exercise.sets.length > 0) {
          // Find the heaviest set for max lift tracking
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

      // Save each max lift to Firestore
      const maxLiftsRef = collection(db, 'profiles', user.uid, 'maxLifts');
      for (const maxLift of maxLifts) {
        const maxLiftDoc = doc(maxLiftsRef, maxLift.id);
        
        // Prepare data object, excluding undefined values
        const maxLiftData: any = {
          exerciseName: maxLift.exerciseName,
          weight: maxLift.weight,
          reps: maxLift.reps,
          date: maxLift.date,
          createdAt: new Date().toISOString(),
        };
        
        // Only include workoutId if it's defined
        if (maxLift.workoutId) {
          maxLiftData.workoutId = maxLift.workoutId;
        }
        
        // Only include notes if it's defined and not empty
        if (maxLift.notes && maxLift.notes.trim()) {
          maxLiftData.notes = maxLift.notes;
        }
        
        await setDoc(maxLiftDoc, maxLiftData);
      }
    } catch (error) {
      console.error('Error saving max lifts:', error);
    }
  };
  
  const formatDate = (date: Date) => {
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
    const newDate = new Date(workoutDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setWorkoutDate(newDate);
  };

  const resetToToday = () => {
    setWorkoutDate(new Date());
  };
  
  return (
    <>
      <Modal
        isVisible={visible}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        onBackdropPress={onClose}
        onSwipeComplete={onClose}
        swipeDirection="down"
        style={{ margin: 0 }}
        avoidKeyboard={true}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.text + '20', paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
          </TouchableOpacity>
          
          <ThemedText type="subtitle">
            {workout ? 'Edit Workout' : 'New Workout'}
          </ThemedText>
          
          <TouchableOpacity onPress={handleSave}>
            <ThemedText style={[styles.saveButton, { color: colors.tint }]}>
              Save
            </ThemedText>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Compact Date Navigation */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Date</ThemedText>
            <View style={styles.dateNavigation}>
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
                <FontAwesome5 name="calendar-alt" size={16} color={colors.tint} style={styles.calendarIcon} />
                <ThemedText style={styles.dateDisplayText}>
                  {formatDate(workoutDate)}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => navigateDate('next')}
                style={[styles.dateNavButton, { borderColor: colors.text + '20' }]}
              >
                <FontAwesome5 name="chevron-right" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Title */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Workout Title</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.text + '30' }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Upper Body Strength"
              placeholderTextColor={colors.text + '60'}
            />
          </View>
          
          {/* Duration */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Duration (minutes)</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.text + '30' }]}
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g., 45"
              placeholderTextColor={colors.text + '60'}
              keyboardType="numeric"
            />
          </View>
          
          {/* Exercises */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Exercises</ThemedText>
              <View style={styles.exerciseActions}>
                <TouchableOpacity
                  onPress={addExercise}
                  style={[styles.addButton, { backgroundColor: colors.tint }]}
                >
                  <FontAwesome5 name="plus" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Exercise Shortcuts */}
            <View style={styles.exerciseShortcuts}>
              <TouchableOpacity
                style={[styles.shortcutButton, { borderColor: colors.text + '20' }]}
                onPress={() => setShowMyExercises(true)}
                activeOpacity={0.7}
              >
                <View style={styles.shortcutContent}>
                  <View style={[styles.shortcutIcon, { backgroundColor: colors.tint + '15' }]}>
                    <FontAwesome5 name="dumbbell" size={16} color={colors.tint} />
                  </View>
                  <ThemedText style={styles.shortcutText}>My Exercises</ThemedText>
                  <FontAwesome5 name="chevron-right" size={12} color={colors.text + '40'} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shortcutButton, { borderColor: colors.text + '20' }]}
                onPress={() => setShowFavoriteExercises(true)}
                activeOpacity={0.7}
              >
                <View style={styles.shortcutContent}>
                  <View style={[styles.shortcutIcon, { backgroundColor: '#FFD700' + '15' }]}>
                    <FontAwesome5 name="star" size={16} color="#FFD700" solid />
                  </View>
                  <ThemedText style={styles.shortcutText}>Favorites</ThemedText>
                  <FontAwesome5 name="chevron-right" size={12} color={colors.text + '40'} />
                </View>
              </TouchableOpacity>
            </View>
            
            {exercises.map((exercise, index) => (
              <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.background + '05' }]}>
                <View style={styles.exerciseHeader}>
                  <ExerciseInputWithSuggestions
                    value={exercise.name}
                    onChangeText={(value) => updateExercise(index, 'name', value)}
                    onSelectExercise={(selectedExercise) => handleExerciseInputSelect(index, selectedExercise)}
                    placeholder={libraryExercises.length > 0 ? "Exercise name" : "Loading exercises..."}
                    style={[styles.exerciseNameInput, { borderColor: colors.text + '20' }]}
                    suggestionsSource={libraryExercises.length > 0 ? libraryExercises : []}
                  />
                  <View style={styles.exerciseHeaderActions}>
                    <TouchableOpacity
                      onPress={() => updateExercise(index, 'isMaxLift', !exercise.isMaxLift)}
                      style={[styles.maxLiftButton, exercise.isMaxLift && { backgroundColor: '#FF6B35' + '20' }]}
                    >
                      <FontAwesome5 
                        name="trophy" 
                        size={14} 
                        color={exercise.isMaxLift ? "#FF6B35" : colors.text + '60'} 
                        solid={exercise.isMaxLift}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeExercise(index)}
                      style={styles.removeButton}
                    >
                      <FontAwesome5 name="trash" size={14} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.exerciseDetails}>
                  <View style={styles.setsHeader}>
                    <ThemedText style={styles.setsTitle}>Sets</ThemedText>
                    <TouchableOpacity
                      onPress={() => addSetToExercise(index)}
                      style={[styles.addSetButton, { backgroundColor: colors.tint }]}
                    >
                      <FontAwesome5 name="plus" size={12} color="#fff" />
                      <ThemedText style={styles.addSetText}>Add Set</ThemedText>
                    </TouchableOpacity>
                  </View>
                  
                  {exercise.sets.map((set, setIndex) => (
                    <View key={set.id} style={styles.setRow}>
                      <View style={styles.setNumber}>
                        <ThemedText style={styles.setNumberText}>{setIndex + 1}</ThemedText>
                      </View>
                      
                      <View style={styles.setInputs}>
                        <View style={styles.setInput}>
                          <ThemedText style={styles.inputLabel}>Reps</ThemedText>
                          <TextInput
                            style={[styles.smallInput, { color: colors.text, borderColor: colors.text + '20' }]}
                            value={set.reps}
                            onChangeText={(value) => updateExerciseSet(index, setIndex, 'reps', value)}
                            placeholder="10-12"
                            placeholderTextColor={colors.text + '60'}
                          />
                        </View>
                        
                        <View style={styles.setInput}>
                          <ThemedText style={styles.inputLabel}>Weight</ThemedText>
                          <TextInput
                            style={[styles.smallInput, { color: colors.text, borderColor: colors.text + '20' }]}
                            value={set.weight || ''}
                            onChangeText={(value) => updateExerciseSet(index, setIndex, 'weight', value)}
                            placeholder={`50 ${units}`}
                            placeholderTextColor={colors.text + '60'}
                          />
                        </View>
                      </View>
                      
                      {exercise.sets.length > 1 ? (
                        <TouchableOpacity
                          onPress={() => removeSetFromExercise(index, setIndex)}
                          style={styles.removeSetButton}
                        >
                          <FontAwesome5 name="minus" size={12} color="#ff4444" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                  
                  <TextInput
                    style={[styles.notesInput, { color: colors.text, borderColor: colors.text + '20' }]}
                    value={exercise.notes || ''}
                    onChangeText={(value) => updateExercise(index, 'notes', value)}
                    placeholder="Exercise notes (optional)"
                    placeholderTextColor={colors.text + '60'}
                    multiline
                  />
                </View>
              </View>
            ))}
          </View>
          
          {/* Workout Notes */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Workout Notes</ThemedText>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.text + '30' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Overall workout notes, how you felt, etc."
              placeholderTextColor={colors.text + '60'}
              multiline
              numberOfLines={4}
              onFocus={() => {
                // Gently scroll toward the bottom when workout notes is focused
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 200);
              }}
            />
          </View>
        </ScrollView>
            </ThemedView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
      
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
                setWorkoutDate(new Date());
                setShowDatePicker(false);
              }}>
                <ThemedText type="subtitle">Today</ThemedText>
              </TouchableOpacity>
            
              <TouchableOpacity 
                onPress={() => setShowDatePicker(false)}
                style={[styles.doneButton, { backgroundColor: colors.tint }]}
              >
                <ThemedText style={styles.doneButtonText}>Done</ThemedText>
              </TouchableOpacity>
            </View>
          
            <Calendar
              selectedDate={workoutDate}
              onDateSelect={(date) => {
                setWorkoutDate(date);
                setShowDatePicker(false);
              }}
              workoutDates={[]}
              themeColor={colors.tint}
            />
          </ThemedView>
        </View>
      </Modal>

      {/* My Exercises Picker Modal */}
      <Modal
        isVisible={showMyExercises}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        onBackdropPress={() => setShowMyExercises(false)}
        onSwipeComplete={() => setShowMyExercises(false)}
        swipeDirection="down"
        style={{ margin: 0 }}
      >
        <ThemedView style={styles.pickerContainer}>
          <View style={[styles.header, { borderBottomColor: colors.text + '20', paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={() => setShowMyExercises(false)}>
              <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
            </TouchableOpacity>
            
            <ThemedText type="subtitle">My Exercises</ThemedText>
            
            <View style={{ width: 60 }} />
          </View>
          
          <ScrollView style={styles.pickerContent}>
            {myExercises.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome5 name="dumbbell" size={48} color={colors.text + '30'} />
                <ThemedText style={styles.emptyStateTitle}>No Saved Exercises</ThemedText>
                <ThemedText style={styles.emptyStateText}>
                  Visit the Exercise Browser to save exercises to your collection
                </ThemedText>
              </View>
            ) : (
              myExercises.map((exercise, index) => (
                <TouchableOpacity
                  key={`my-${index}`}
                  style={[styles.exercisePickerItem, { borderBottomColor: colors.text + '10' }]}
                  onPress={() => {
                    addExerciseFromPicker(exercise);
                    setShowMyExercises(false);
                  }}
                >
                  <View style={styles.exercisePickerInfo}>
                    <ThemedText style={styles.exercisePickerName}>{exercise.name}</ThemedText>
                    {exercise.category && (
                      <ThemedText style={styles.exercisePickerCategory}>{exercise.category}</ThemedText>
                    )}
                  </View>
                  <FontAwesome5 name="plus" size={16} color={colors.tint} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Favorite Exercises Picker Modal */}
      <Modal
        isVisible={showFavoriteExercises}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        onBackdropPress={() => setShowFavoriteExercises(false)}
        onSwipeComplete={() => setShowFavoriteExercises(false)}
        swipeDirection="down"
        style={{ margin: 0 }}
      >
        <ThemedView style={styles.pickerContainer}>
          <View style={[styles.header, { borderBottomColor: colors.text + '20', paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={() => setShowFavoriteExercises(false)}>
              <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
            </TouchableOpacity>
            
            <ThemedText type="subtitle">Favorite Exercises</ThemedText>
            
            <View style={{ width: 60 }} />
          </View>
          
          <ScrollView style={styles.pickerContent}>
            {favoriteExercises.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome5 name="star" size={48} color="#FFD700" />
                <ThemedText style={styles.emptyStateTitle}>No Favorite Exercises</ThemedText>
                <ThemedText style={styles.emptyStateText}>
                  Mark exercises as favorites in the Exercise Browser to see them here
                </ThemedText>
              </View>
            ) : (
              favoriteExercises.map((exercise, index) => (
                <TouchableOpacity
                  key={`fav-${index}`}
                  style={[styles.exercisePickerItem, { borderBottomColor: colors.text + '10' }]}
                  onPress={() => {
                    addExerciseFromPicker(exercise);
                    setShowFavoriteExercises(false);
                  }}
                >
                  <View style={styles.exercisePickerInfo}>
                    <ThemedText style={styles.exercisePickerName}>{exercise.name}</ThemedText>
                    {exercise.category && (
                      <ThemedText style={styles.exercisePickerCategory}>{exercise.category}</ThemedText>
                    )}
                  </View>
                  <View style={styles.exercisePickerActions}>
                    <FontAwesome5 name="star" size={14} color="#FFD700" solid />
                    <FontAwesome5 name="plus" size={16} color={colors.tint} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonView: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    opacity: 0.7,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseCard: {
    borderRadius: 8,
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
    zIndex: 99999
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
    zIndex: 1000
  },
  exerciseNameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#fff',
    maxWidth: '100%', // Increased from 70% to 100% for wider input
    minWidth: 200, // Ensure a reasonable minimum width
  },
  removeButton: {
    padding: 8,
  },
  exerciseDetails: {
    gap: 8,
    position: 'relative',
    zIndex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.7,
  },
  smallInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  datePickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  addSetText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  setNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  setInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.7,
  },
  removeSetButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#ffebee',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    justifyContent: 'flex-end',
    gap: 8,
  },
  exerciseHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  maxLiftButton: {
    padding: 6,
    borderRadius: 4,
  },
  exerciseShortcuts: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  shortcutButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'transparent',
  },
  shortcutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shortcutIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  pickerContainer: {
    flex: 1,
  },
  pickerContent: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
  },
  exercisePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  exercisePickerInfo: {
    flex: 1,
  },
  exercisePickerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  exercisePickerCategory: {
    fontSize: 12,
    opacity: 0.6,
    textTransform: 'capitalize',
  },
  exercisePickerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Compact Date Navigation Styles
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
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
  },
  calendarIcon: {
    marginRight: 8,
  },
  dateDisplayText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Date Picker Modal Styles (matching workouts screen)
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
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
