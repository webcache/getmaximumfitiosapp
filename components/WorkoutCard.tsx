import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { usePreferences } from '../hooks/usePreferences';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { ExerciseSet, Workout } from './WorkoutModal';

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSyncToHealthKit?: (workout: Workout) => Promise<void>;
  onWorkoutUpdate?: (updatedWorkout: Workout) => void;
  onStartWorkout?: (workout: Workout) => void;
  showDate?: boolean;
}

export default function WorkoutCard({ 
  workout, 
  onPress, 
  onEdit, 
  onDelete,
  onSyncToHealthKit,
  onWorkoutUpdate,
  onStartWorkout,
  showDate = false 
}: WorkoutCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { units } = usePreferences();
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [localWorkout, setLocalWorkout] = useState<Workout>(workout);
  const [syncingToHealthKit, setSyncingToHealthKit] = useState(false);
  
  // Sync workout prop changes with local state
  useEffect(() => {
    setLocalWorkout(workout);
  }, [workout]);
  
  // Defensive color handling to prevent NaN errors in CoreGraphics
  const safeColors = {
    text: colors?.text || '#000000',
    background: colors?.background || '#FFFFFF',
    tint: colors?.tint || '#007AFF'
  };
  
  // Enhanced data validation for workout object
  if (!workout || typeof workout !== 'object') {
    console.warn('Invalid workout object:', workout);
    return <View style={{ display: 'none' }} />;
  }
  
  if (!workout.title || typeof workout.title !== 'string') {
    console.warn('Invalid workout title:', workout);
    return <View style={{ display: 'none' }} />;
  }
  
  if (!workout.exercises || !Array.isArray(workout.exercises) || workout.exercises.length === 0) {
    console.warn('Invalid workout exercises:', workout);
    return <View style={{ display: 'none' }} />;
  }
  
  // Validate each exercise more thoroughly
  const hasValidExercises = workout.exercises.every(ex => {
    if (!ex || typeof ex !== 'object') {
      return false;
    }
    if (!ex.name || typeof ex.name !== 'string' || ex.name.trim() === '') {
      return false;
    }
    if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
      return false;
    }
    // Validate each set in the exercise
    return ex.sets.every(set => {
      if (!set || typeof set !== 'object') {
        return false;
      }
      return true; // Sets can have empty/null values, we'll handle them during rendering
    });
  });
  
  if (!hasValidExercises) {
    console.warn('Workout has invalid exercises:', workout);
    return <View style={{ display: 'none' }} />;
  }
  
  const toggleExerciseExpansion = (exerciseId: string) => {
    const newExpanded = new Set(expandedExercises);
    if (newExpanded.has(exerciseId)) {
      newExpanded.delete(exerciseId);
    } else {
      newExpanded.add(exerciseId);
    }
    setExpandedExercises(newExpanded);
  };

  const addSetToExercise = (exerciseIndex: number) => {
    const updatedWorkout = { ...localWorkout };
    const newSet: ExerciseSet = {
      id: `${Date.now()}-${updatedWorkout.exercises[exerciseIndex].sets.length + 1}`,
      reps: '10-12',
      weight: '',
      notes: '',
    };
    
    if (Array.isArray(updatedWorkout.exercises[exerciseIndex].sets)) {
      updatedWorkout.exercises[exerciseIndex].sets.push(newSet);
    } else {
      // Convert legacy format to new format
      updatedWorkout.exercises[exerciseIndex].sets = [newSet];
    }
    
    setLocalWorkout(updatedWorkout);
    if (onWorkoutUpdate) {
      onWorkoutUpdate(updatedWorkout);
    }
  };

  const removeSetFromExercise = (exerciseIndex: number, setIndex: number) => {
    const updatedWorkout = { ...localWorkout };
    const sets = updatedWorkout.exercises[exerciseIndex].sets;
    
    if (Array.isArray(sets) && sets.length > 1) {
      sets.splice(setIndex, 1);
      setLocalWorkout(updatedWorkout);
      if (onWorkoutUpdate) {
        onWorkoutUpdate(updatedWorkout);
      }
    }
  };

  const updateExerciseSet = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: string) => {
    const updatedWorkout = { ...localWorkout };
    const sets = updatedWorkout.exercises[exerciseIndex].sets;
    
    if (Array.isArray(sets) && sets[setIndex]) {
      sets[setIndex] = {
        ...sets[setIndex],
        [field]: value
      };
      setLocalWorkout(updatedWorkout);
      if (onWorkoutUpdate) {
        onWorkoutUpdate(updatedWorkout);
      }
    }
  };
  
  const formatDate = (date: Date) => {
    try {
      // Validate that we have a valid date object
      if (!date) {
        console.warn('formatDate: No date provided');
        return 'No Date';
      }
      
      // Handle various date input types
      let dateObj: Date;
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        console.warn('formatDate: Invalid date type:', typeof date);
        return 'Invalid Date';
      }
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('formatDate: Invalid date object:', date);
        return 'Invalid Date';
      }
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      if (dateObj.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (dateObj.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch (error) {
      console.warn('formatDate: Error formatting date:', error);
      return 'Invalid Date';
    }
  };
  
  const getTotalSets = () => {
    try {
      if (!localWorkout?.exercises || !Array.isArray(localWorkout.exercises)) {
        return 0;
      }
      
      return localWorkout.exercises.reduce((total, exercise) => {
        if (!exercise || typeof exercise !== 'object') {
          return total;
        }
        
        const sets = Array.isArray(exercise.sets) 
          ? exercise.sets.length 
          : (typeof exercise.sets === 'number' ? exercise.sets : 0);
        
        return total + (isNaN(sets) ? 0 : sets);
      }, 0);
    } catch (error) {
      console.warn('Error calculating total sets:', error);
      return 0;
    }
  };
  
  const isUpcoming = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workoutDate = new Date(workout.date);
    workoutDate.setHours(0, 0, 0, 0);
    return workoutDate >= today && !workout.isCompleted;
  };

  const isTodayOrFuture = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workoutDate = new Date(workout.date);
    workoutDate.setHours(0, 0, 0, 0);
    return workoutDate >= today;
  };

  const toggleCompletion = async () => {
    const isBeingCompleted = !workout.isCompleted; // Use prop data instead of local state
    console.log(`WorkoutCard toggleCompletion: "${workout.title}" from ${workout.isCompleted} to ${isBeingCompleted}`);
    
    const updatedWorkout = { 
      ...workout, // Use prop data as base instead of local state
      isCompleted: isBeingCompleted,
      // Set completedAt timestamp when marking as complete, clear it when marking as incomplete
      completedAt: isBeingCompleted ? new Date() : undefined
    };
    
    console.log('WorkoutCard calling onWorkoutUpdate with:', {
      id: updatedWorkout.id,
      title: updatedWorkout.title,
      isCompleted: updatedWorkout.isCompleted,
      completedAt: updatedWorkout.completedAt
    });
    
    // Don't update local state immediately - let the parent component and Firestore handle it
    
    // Notify parent component of the change
    if (onWorkoutUpdate) {
      try {
        await onWorkoutUpdate(updatedWorkout);
        console.log('WorkoutCard: onWorkoutUpdate completed successfully');
      } catch (error) {
        console.error('Error updating workout:', error);
      }
    }
  };

  const handleSyncToHealthKit = async () => {
    if (!onSyncToHealthKit || syncingToHealthKit) return;
    
    setSyncingToHealthKit(true);
    try {
      await onSyncToHealthKit(localWorkout);
    } catch (error) {
      console.error('Error syncing to HealthKit:', error);
    } finally {
      setSyncingToHealthKit(false);
    }
  };
  
  const hasMaxLifts = () => {
    return workout.exercises.some(exercise => exercise.isMaxLift);
  };
  
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <ThemedView style={[
        styles.card,
        { borderColor: safeColors.text + '20' },
        isUpcoming() && { borderLeftColor: safeColors.tint, borderLeftWidth: 4 },
        hasMaxLifts() && { 
          borderColor: '#d16d15',
          borderWidth: 2,
          backgroundColor: '#d16d15' + '08'
        }
      ]}>
        {/* MAX Lift Badge - Positioned in upper left corner */}
        {hasMaxLifts() && (
          <View style={styles.maxLiftCircle}>
            {/* 
              Choose one of the two options below:
              Option 1: Trophy Icon (currently active)
              Option 2: MAX Text (commented out)
              
              To switch to MAX text, comment out the trophy and uncomment the text
            */}
            <FontAwesome5 name="trophy" size={12} color="#fff" solid />
            
            {/* <ThemedText style={styles.maxLiftCircleText}>MAX</ThemedText> */}
          </View>
        )}
        
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <ThemedText type="subtitle" style={styles.title}>
                {localWorkout?.title && typeof localWorkout.title === 'string' ? localWorkout.title : 'Untitled Workout'}
              </ThemedText>
            </View>
            {showDate && workout.date ? (
              <ThemedText style={[styles.date, { color: safeColors.text + '80' }]}>
                {formatDate(workout.date)}
              </ThemedText>
            ) : null}
            {workout.isCompleted ? (
              <View style={[styles.completedBadge, { backgroundColor: '#4CAF50' + '20' }]}>
                <FontAwesome5 name="check-circle" size={12} color="#4CAF50" solid />
                <ThemedText style={[styles.completedText, { color: '#4CAF50' }]}>
                  Completed
                </ThemedText>
              </View>
            ) : null}
            {isUpcoming() ? (
              <View style={[styles.upcomingBadge, { backgroundColor: safeColors.tint + '20' }]}>
                <ThemedText style={[styles.upcomingText, { color: safeColors.tint }]}>
                  Upcoming
                </ThemedText>
              </View>
            ) : null}
          </View>
          
          <View style={styles.actions}>
            {isTodayOrFuture() ? (
              <TouchableOpacity onPress={toggleCompletion} style={styles.actionButton}>
                <FontAwesome5 
                  name={workout.isCompleted ? "undo" : "check"} 
                  size={16} 
                  color={workout.isCompleted ? "#ff9800" : "#c8c8c8ff"} 
                  solid={!workout.isCompleted}
                />
              </TouchableOpacity>
            ) : null}
            {workout.isCompleted && onSyncToHealthKit ? (
              <TouchableOpacity 
                onPress={handleSyncToHealthKit} 
                style={[styles.actionButton, syncingToHealthKit && styles.disabledButton]}
                disabled={syncingToHealthKit}
              >
                <FontAwesome5 
                  name={syncingToHealthKit ? "spinner" : "heartbeat"} 
                  size={16} 
                  color={syncingToHealthKit ? "#c8c8c8" : "#FF6B6B"} 
                  spin={syncingToHealthKit}
                />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <FontAwesome5 name="edit" size={16} color={safeColors.text + '60'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <FontAwesome5 name="trash" size={16} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.stats}>
          <View style={styles.stat}>
            <FontAwesome5 name="dumbbell" size={14} color={safeColors.text + '60'} />
            <ThemedText style={[styles.statText, { color: safeColors.text + '80' }]}>
              {`${localWorkout.exercises.length || 0} exercises`}
            </ThemedText>
          </View>
          
          <View style={styles.stat}>
            <FontAwesome5 name="layer-group" size={14} color={safeColors.text + '60'} />
            <ThemedText style={[styles.statText, { color: safeColors.text + '80' }]}>
              {`${getTotalSets() || 0} sets`}
            </ThemedText>
          </View>
          
          {localWorkout.duration ? (
            <View style={styles.stat}>
              <FontAwesome5 name="clock" size={14} color={safeColors.text + '60'} />
              <ThemedText style={[styles.statText, { color: safeColors.text + '80' }]}>
                {`${localWorkout.duration || 0} min`}
              </ThemedText>
            </View>
          ) : null}
        </View>
        
        {localWorkout.exercises && localWorkout.exercises.length > 0 ? (
          <View style={styles.exercisesContainer}>
            {localWorkout.exercises
              .filter(exercise => {
                // Extra filter to ensure we only render valid exercises
                return exercise && 
                       typeof exercise === 'object' && 
                       exercise.name && 
                       typeof exercise.name === 'string' && 
                       exercise.name.trim() !== '' &&
                       Array.isArray(exercise.sets) && 
                       exercise.sets.length > 0;
              })
              .map((exercise, exerciseIndex) => {
              // Enhanced data validation to prevent rendering issues
              if (!exercise || typeof exercise !== 'object') {
                console.warn('Invalid exercise object:', exercise);
                return <View key={`invalid-exercise-${exerciseIndex}`} style={{ display: 'none' }} />; // Return hidden view instead of null
              }
              
              // Generate fallback ID if missing
              const exerciseId = exercise.id && typeof exercise.id === 'string' 
                ? exercise.id 
                : `exercise-${exerciseIndex}-${Date.now()}`;
              
              if (!exercise.name || typeof exercise.name !== 'string') {
                console.warn('Invalid exercise name:', exercise);
                return <View key={exerciseId} style={{ display: 'none' }} />; // Return hidden view instead of null
              }
              
              if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) {
                console.warn('Invalid exercise sets:', exercise);
                return <View key={exerciseId} style={{ display: 'none' }} />; // Return hidden view instead of null
              }
              
              const isExpanded = expandedExercises.has(exerciseId);
              const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
              
              return (
                <View key={exerciseId} style={styles.exerciseItem}>
                  <TouchableOpacity 
                    style={styles.exerciseHeader}
                    onPress={() => toggleExerciseExpansion(exerciseId)}
                  >
                    <View style={styles.exerciseNameContainer}>
                      <ThemedText style={[
                        styles.exerciseName, 
                        { color: safeColors.text },
                        exercise.isMaxLift && { color: '#d16d15', fontWeight: '600' }
                      ]}>
                        {exercise?.name && typeof exercise.name === 'string' ? exercise.name : 'Unknown Exercise'}
                      </ThemedText>
                      {exercise.isMaxLift && (
                        <FontAwesome5 name="trophy" size={12} color="#d16d15" solid />
                      )}
                    </View>
                    <View style={styles.exerciseHeaderRight}>
                      <ThemedText style={[styles.setsCount, { color: safeColors.text + '70' }]}>
                        {`${(sets.length || 0)} set${(sets.length || 0) !== 1 ? 's' : ''}`}
                      </ThemedText>
                      <FontAwesome5 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={12} 
                        color={safeColors.text + '60'} 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={styles.setsContainer}>
                      {sets
                        .filter(set => set && typeof set === 'object') // Filter out invalid sets
                        .map((set, setIndex) => {
                        // Generate fallback ID if missing
                        const setId = set.id && typeof set.id === 'string' 
                          ? set.id 
                          : `set-${exerciseIndex}-${setIndex}-${Date.now()}`;
                        
                        return (
                          <View key={setId} style={[styles.setRow, { borderColor: safeColors.text + '20' }]}>
                            <ThemedText style={[styles.setNumber, { color: safeColors.text + '60' }]}>
                              {setIndex + 1}
                            </ThemedText>
                            
                            <View style={styles.setInputs}>
                              <View style={styles.inputGroup}>
                                <ThemedText style={[styles.inputLabel, { color: safeColors.text + '70' }]}>
                                  Reps
                                </ThemedText>
                                <TextInput
                                  style={[
                                    styles.setInput,
                                    { 
                                      backgroundColor: safeColors.background + '80',
                                      borderColor: safeColors.text + '30',
                                      color: safeColors.text 
                                    }
                                  ]}
                                  value={set?.reps ? String(set.reps) : ''}
                                  onChangeText={(value) => updateExerciseSet(exerciseIndex, setIndex, 'reps', value)}
                                  placeholder="10-12"
                                  placeholderTextColor={safeColors.text + '50'}
                                  keyboardType="default"
                                  returnKeyType="next"
                                  blurOnSubmit={false}
                                />
                              </View>
                              
                              <View style={styles.inputGroup}>
                                <ThemedText style={[styles.inputLabel, { color: safeColors.text + '70' }]}>
                                  Weight
                                </ThemedText>
                                <TextInput
                                  style={[
                                    styles.setInput,
                                    { 
                                      backgroundColor: safeColors.background + '80',
                                      borderColor: safeColors.text + '30',
                                      color: safeColors.text 
                                    }
                                  ]}
                                  value={set?.weight ? String(set.weight) : ''}
                                  onChangeText={(value) => updateExerciseSet(exerciseIndex, setIndex, 'weight', value)}
                                  placeholder={`135 ${units}`}
                                  placeholderTextColor={safeColors.text + '50'}
                                  keyboardType="default"
                                  returnKeyType="done"
                                />
                              </View>
                            </View>
                            
                            {sets.length > 1 && (
                              <TouchableOpacity
                                style={styles.removeSetButton}
                                onPress={() => removeSetFromExercise(exerciseIndex, setIndex)}
                              >
                                <FontAwesome5 name="times" size={12} color="#ff4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                      
                      <TouchableOpacity
                        style={[styles.addSetButton, { borderColor: safeColors.tint + '40' }]}
                        onPress={() => addSetToExercise(exerciseIndex)}
                      >
                        <FontAwesome5 name="plus" size={12} color={safeColors.tint} />
                        <ThemedText style={[styles.addSetText, { color: safeColors.tint }]}>
                          Add Set
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Start Workout Button - Bottom Center */}
        {!workout.isCompleted && onStartWorkout && (
          <View style={[
            styles.startWorkoutContainer,
            // Add extra top margin if there are no exercises
            !workout.exercises?.length && { marginTop: 20 }
          ]}>
            <TouchableOpacity 
              onPress={() => onStartWorkout(workout)} 
              style={styles.startWorkoutButton}
            >
              <FontAwesome5 name="play" size={24} color="white" />
              
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    flex: 1,
    flexShrink: 1,
  },
  date: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  startWorkoutContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  startWorkoutButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'absolute',
    bottom: -36,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  startWorkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
  },
  exercisesContainer: {
    marginTop: 8,
  },
  exerciseItem: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  exerciseNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  exerciseHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setsCount: {
    fontSize: 12,
  },
  setsContainer: {
    paddingLeft: 8,
    paddingBottom: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    marginLeft: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  setInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  removeSetButton: {
    padding: 8,
    marginLeft: 8,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addSetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  exercisePreview: {
    marginTop: 8,
  },
  exerciseList: {
    fontSize: 14,
    lineHeight: 20,
  },
  upcomingBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  upcomingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  maxLiftCircle: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d16d15',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  maxLiftCircleText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  completedBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
