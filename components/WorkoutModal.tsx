import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
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
import { useColorScheme } from '../hooks/useColorScheme';
import { usePreferences } from '../hooks/usePreferences';
import { firestoreExerciseService } from '../services/FirestoreExerciseService';
import { myExercisesService } from '../services/MyExercisesService';
import { Exercise as BaseExercise } from '../types/exercise';
import Calendar from './Calendar';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export interface ExerciseSet {
  id: string;
  reps: string;
  weight?: string;
  notes?: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
  notes?: string;
  isMaxLift?: boolean;
  baseExercise?: BaseExercise;
}

export interface FavoriteWorkout {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
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
  const [showLibraryExercises, setShowLibraryExercises] = useState(false);
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

    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', keyboardWillShow);
    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', keyboardWillHide);

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, [visible]);

  // Load user exercises when modal opens
  useEffect(() => {
    if (!visible || !user) return;
    
    const loadExercises = async () => {
      try {
        // Load user's saved exercises
        const userExercises = await myExercisesService.getMyExercises(user.uid);
        setMyExercises(userExercises);
        setFavoriteExercises(userExercises); // For now, favorites = my exercises
        
        // Load exercise library
        const libraryData = await firestoreExerciseService.getAllExercisesSimple();
        setLibraryExercises(libraryData);
      } catch (error) {
        console.error('Error loading exercises:', error);
      }
    };
    
    loadExercises();
  }, [visible, user]);

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
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a workout title.');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise.');
      return;
    }

    // Validate exercises
    for (const exercise of exercises) {
      if (!exercise.name.trim()) {
        Alert.alert('Error', 'Please fill in all exercise names.');
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
      isCompleted: workout?.isCompleted || false,
      completedAt: workout?.completedAt,
    };

    onSave(workoutData);
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
                {/* Quick Info Row */}
                <View style={styles.quickInfoRow}>
                  {/* Date Selector */}
                  <TouchableOpacity 
                    style={[styles.dateSelector, { borderColor: colors.text + '20' }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <FontAwesome5 name="calendar-alt" size={14} color={colors.text + '60'} />
                    <ThemedText style={styles.dateSelectorText}>
                      {formatDate(workoutDate)}
                    </ThemedText>
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
                {exercises.length === 0 && (
                  <View style={styles.quickActions}>
                    <ThemedText style={styles.quickActionsTitle}>Quick Start</ThemedText>
                    
                    <View style={styles.quickActionButtons}>
                      <TouchableOpacity
                        style={[styles.quickActionButton, { borderColor: colors.tint + '30', backgroundColor: colors.tint + '10' }]}
                        onPress={() => setShowMyExercises(true)}
                      >
                        <FontAwesome5 name="dumbbell" size={20} color={colors.tint} />
                        <ThemedText style={styles.quickActionTitle}>My Exercises</ThemedText>
                        <ThemedText style={styles.quickActionSubtitle}>{myExercises.length} saved</ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quickActionButton, { borderColor: '#FFD700' + '30', backgroundColor: '#FFD700' + '10' }]}
                        onPress={() => setShowFavoriteExercises(true)}
                      >
                        <FontAwesome5 name="star" size={20} color="#FFD700" solid />
                        <ThemedText style={styles.quickActionTitle}>Fav Workouts</ThemedText>
                        <ThemedText style={styles.quickActionSubtitle}>Load template</ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quickActionButton, { borderColor: colors.text + '20', backgroundColor: colors.background + '50' }]}
                        onPress={() => setShowLibraryExercises(true)}
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
                          onPress={() => setShowMyExercises(true)}
                          style={[styles.headerActionButton, { borderColor: colors.tint + '30', backgroundColor: colors.tint + '10' }]}
                        >
                          <FontAwesome5 name="dumbbell" size={12} color={colors.tint} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setShowFavoriteExercises(true)}
                          style={[styles.headerActionButton, { borderColor: '#FFD700' + '30', backgroundColor: '#FFD700' + '10' }]}
                        >
                          <FontAwesome5 name="star" size={12} color="#FFD700" solid />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setShowLibraryExercises(true)}
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
    gap: 8,
  },
  headerActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addExerciseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  maxLiftButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeExerciseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  addSetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
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
    color: '#666',
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  removeSetButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNotesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
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
  datePickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
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
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  pickerContent: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  exercisePickerInfo: {
    flex: 1,
  },
  exercisePickerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  exercisePickerCategory: {
    fontSize: 12,
    opacity: 0.6,
  },
  exercisePickerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
