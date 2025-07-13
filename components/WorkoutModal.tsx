import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Exercise as BaseExercise } from '@/types/exercise';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import Calendar from './Calendar';
import ExerciseInputWithSuggestions from './ExerciseInputWithSuggestions';
import MyExerciseSelector from './MyExerciseSelector';
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
  baseExercise?: BaseExercise; // Reference to the original exercise data
}

export interface FavoriteExercise {
  id: string;
  name: string;
  defaultSets: ExerciseSet[];
  notes?: string;
  createdAt: Date;
}

export interface MaxLift {
  id: string;
  exerciseName: string;
  weight: string;
  reps: string;
  date: Date;
  workoutId?: string; // Optional since new workouts don't have IDs yet
  notes?: string; // Optional
}

export interface Workout {
  id?: string;
  date: Date;
  title: string;
  exercises: WorkoutExercise[];
  notes?: string;
  duration?: number; // in minutes
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
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [workoutDate, setWorkoutDate] = useState(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [favoriteExercises, setFavoriteExercises] = useState<FavoriteExercise[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showMyExercises, setShowMyExercises] = useState(false);
  
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
  
  // Fetch favorite exercises
  useEffect(() => {
    if (!user || !visible) return;

    const favoritesRef = collection(db, 'profiles', user.uid, 'favoriteExercises');
    const q = query(favoritesRef, orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favorites: FavoriteExercise[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        favorites.push({
          id: doc.id,
          name: data.name,
          defaultSets: data.defaultSets || [],
          notes: data.notes,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setFavoriteExercises(favorites);
    });

    return () => unsubscribe();
  }, [user, visible]);

  const addToFavorites = async (exercise: WorkoutExercise) => {
    if (!user) return;

    try {
      const favoriteRef = doc(db, 'profiles', user.uid, 'favoriteExercises', exercise.id);
      const favoriteExercise: Omit<FavoriteExercise, 'id'> = {
        name: exercise.name,
        defaultSets: exercise.sets,
        notes: exercise.notes,
        createdAt: new Date(),
      };
      
      await setDoc(favoriteRef, favoriteExercise);
      Alert.alert('Success', `${exercise.name} added to favorites!`);
    } catch (error) {
      console.error('Error adding to favorites:', error);
      Alert.alert('Error', 'Failed to add exercise to favorites.');
    }
  };

  const removeFromFavorites = async (favoriteId: string) => {
    if (!user) return;

    try {
      const favoriteRef = doc(db, 'profiles', user.uid, 'favoriteExercises', favoriteId);
      await deleteDoc(favoriteRef);
    } catch (error) {
      console.error('Error removing from favorites:', error);
      Alert.alert('Error', 'Failed to remove exercise from favorites.');
    }
  };

  const addFavoriteExercise = (favorite: FavoriteExercise) => {
    const newExercise: WorkoutExercise = {
      id: Date.now().toString(),
      name: favorite.name,
      sets: favorite.defaultSets.map(set => ({
        ...set,
        id: `${Date.now()}-${Math.random()}`, // Generate new IDs for the sets
      })),
      notes: favorite.notes,
    };
    
    setExercises([...exercises, newExercise]);
    setShowFavorites(false);
  };

  const addMyExercise = (exercise: BaseExercise) => {
    const newExercise: WorkoutExercise = {
      id: Date.now().toString(),
      name: exercise.name,
      sets: [
        {
          id: `${Date.now()}-1`,
          reps: '10-12',
          weight: '',
          notes: '',
        }
      ],
      notes: '',
      baseExercise: exercise, // Store reference to the original exercise
    };
    
    setExercises([...exercises, newExercise]);
    setShowMyExercises(false);
  };

  const handleExerciseInputSelect = (index: number, exercise: BaseExercise) => {
    // When user selects from auto-suggestions, update the exercise with base exercise data
    updateExercise(index, 'baseExercise', exercise);
  };

  const isExerciseInFavorites = (exerciseName: string) => {
    return favoriteExercises.some(fav => fav.name.toLowerCase() === exerciseName.toLowerCase());
  };
  
  const addExercise = () => {
    const newExercise: WorkoutExercise = {
      id: Date.now().toString(),
      name: '',
      sets: [
        {
          id: `${Date.now()}-1`,
          reps: '10-12',
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
      reps: '10-12',
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
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.text + '20' }]}>
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
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Date</ThemedText>
            <TouchableOpacity 
              style={[styles.dateButton, { borderColor: colors.text + '30' }]}
              onPress={() => setShowDatePicker(true)}
            >
              <ThemedText style={styles.dateButtonText}>{formatDate(workoutDate)}</ThemedText>
              <FontAwesome5 name="calendar-alt" size={16} color={colors.text + '60'} />
            </TouchableOpacity>
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
                  onPress={() => setShowMyExercises(true)}
                  style={[styles.myExercisesButton, { backgroundColor: colors.text + '10', borderColor: colors.tint }]}
                >
                  <FontAwesome5 name="dumbbell" size={14} color={colors.tint} />
                  <ThemedText style={[styles.myExercisesButtonText, { color: colors.tint }]}>
                    My Exercises
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowFavorites(true)}
                  style={[styles.favoritesButton, { backgroundColor: colors.text + '10', borderColor: colors.tint }]}
                >
                  <FontAwesome5 name="star" size={14} color={colors.tint} />
                  <ThemedText style={[styles.favoritesButtonText, { color: colors.tint }]}>
                    Favorites
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addExercise}
                  style={[styles.addButton, { backgroundColor: colors.tint }]}
                >
                  <FontAwesome5 name="plus" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            
            {exercises.map((exercise, index) => (
              <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.text + '05' }]}>
                <View style={styles.exerciseHeader}>
                  <ExerciseInputWithSuggestions
                    value={exercise.name}
                    onChangeText={(value) => updateExercise(index, 'name', value)}
                    onSelectExercise={(selectedExercise) => handleExerciseInputSelect(index, selectedExercise)}
                    placeholder="Exercise name"
                    style={[styles.exerciseNameInput, { borderColor: colors.text + '20' }]}
                  />
                  <View style={styles.exerciseHeaderActions}>
                    {exercise.name.trim() && (
                      <TouchableOpacity
                        onPress={() => isExerciseInFavorites(exercise.name) 
                          ? removeFromFavorites(favoriteExercises.find(fav => fav.name.toLowerCase() === exercise.name.toLowerCase())?.id || '')
                          : addToFavorites(exercise)
                        }
                        style={styles.favoriteButton}
                      >
                        <FontAwesome5 
                          name="star" 
                          size={14} 
                          color={isExerciseInFavorites(exercise.name) ? "#FFD700" : colors.text + '60'} 
                          solid={isExerciseInFavorites(exercise.name)}
                        />
                      </TouchableOpacity>
                    )}
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
                            placeholder="50 lbs"
                            placeholderTextColor={colors.text + '60'}
                          />
                        </View>
                      </View>
                      
                      {exercise.sets.length > 1 && (
                        <TouchableOpacity
                          onPress={() => removeSetFromExercise(index, setIndex)}
                          style={styles.removeSetButton}
                        >
                          <FontAwesome5 name="minus" size={12} color="#ff4444" />
                        </TouchableOpacity>
                      )}
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
            />
          </View>
        </ScrollView>
      </ThemedView>
      
      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <ThemedView style={styles.datePickerContainer}>
          <View style={[styles.header, { borderBottomColor: colors.text + '20' }]}>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
            </TouchableOpacity>
            
            <ThemedText type="subtitle">Select Date</ThemedText>
            
            <TouchableOpacity 
              onPress={() => setShowDatePicker(false)}
              style={[styles.saveButtonView, { backgroundColor: colors.tint }]}
            >
              <ThemedText style={styles.saveButtonText}>Done</ThemedText>
            </TouchableOpacity>
          </View>
          
          <Calendar
            selectedDate={workoutDate}
            onDateSelect={(date) => setWorkoutDate(date)}
            workoutDates={[]}
          />
        </ThemedView>
      </Modal>

      {/* Favorites Modal */}
      <Modal
        visible={showFavorites}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent
        onRequestClose={() => setShowFavorites(false)}
      >
        <View style={styles.favoritesModal}>
          <ThemedView style={[styles.favoritesContent, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={[styles.favoritesHeader, { borderBottomColor: colors.text + '20' }]}>
              <ThemedText type="subtitle">Favorite Exercises</ThemedText>
              <TouchableOpacity onPress={() => setShowFavorites(false)}>
                <FontAwesome5 name="times" size={20} color={colors.text + '60'} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={{ maxHeight: 400 }} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {favoriteExercises.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center', paddingBottom: 40 }}>
                  <FontAwesome5 name="star" size={48} color={colors.text + '30'} />
                  <ThemedText style={{ marginTop: 16, textAlign: 'center', opacity: 0.7 }}>
                    No favorite exercises yet
                  </ThemedText>
                  <ThemedText style={{ marginTop: 8, textAlign: 'center', opacity: 0.5, fontSize: 14 }}>
                    Star exercises while creating workouts to add them here
                  </ThemedText>
                </View>
              ) : (
                favoriteExercises.map((favorite) => (
                  <TouchableOpacity
                    key={favorite.id}
                    style={[styles.favoriteItem, { borderBottomColor: colors.text + '10' }]}
                    onPress={() => addFavoriteExercise(favorite)}
                  >
                    <ThemedText style={[styles.favoriteItemText, { color: colors.text }]}>
                      {favorite.name}
                    </ThemedText>
                    <ThemedText style={[styles.favoriteItemSets, { color: colors.text }]}>
                      {favorite.defaultSets.length} set{favorite.defaultSets.length !== 1 ? 's' : ''}
                    </ThemedText>
                    <FontAwesome5 name="plus" size={16} color={colors.tint} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* My Exercises Selector */}
      <MyExerciseSelector
        visible={showMyExercises}
        onClose={() => setShowMyExercises(false)}
        onSelectExercise={addMyExercise}
      />
    </Modal>
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
    padding: 12,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  exerciseNameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    fontWeight: '600',
    maxWidth: '70%',
  },
  removeButton: {
    padding: 8,
  },
  exerciseDetails: {
    gap: 8,
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
    flex: 1,
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
  favoritesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  favoritesButtonText: {
    fontSize: 12,
    fontWeight: '600',
    display: 'none',
  },
  myExercisesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  myExercisesButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  favoriteButton: {
    padding: 6,
  },
  maxLiftButton: {
    padding: 6,
    borderRadius: 4,
  },
  favoritesModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  favoritesContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    minHeight: 200,
  },
  favoritesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  favoriteItemText: {
    flex: 1,
    fontSize: 16,
  },
  favoriteItemSets: {
    fontSize: 12,
    opacity: 0.7,
    marginLeft: 8,
    marginRight: 12,
  },
});
