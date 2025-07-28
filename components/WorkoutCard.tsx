import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { ExerciseSet, Workout } from './WorkoutModal';

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onWorkoutUpdate?: (updatedWorkout: Workout) => void;
  showDate?: boolean;
}

export default function WorkoutCard({ 
  workout, 
  onPress, 
  onEdit, 
  onDelete,
  onWorkoutUpdate,
  showDate = false 
}: WorkoutCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [localWorkout, setLocalWorkout] = useState<Workout>(workout);
  
  // Sync workout prop changes with local state
  useEffect(() => {
    setLocalWorkout(workout);
  }, [workout]);
  
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
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };
  
  const getTotalSets = () => {
    return localWorkout.exercises.reduce((total, exercise) => {
      const sets = Array.isArray(exercise.sets) ? exercise.sets.length : (typeof exercise.sets === 'number' ? exercise.sets : 0);
      return total + sets;
    }, 0);
  };
  
  const isUpcoming = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workoutDate = new Date(localWorkout.date);
    workoutDate.setHours(0, 0, 0, 0);
    return workoutDate >= today && !localWorkout.isCompleted;
  };

  const isTodayOrFuture = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workoutDate = new Date(localWorkout.date);
    workoutDate.setHours(0, 0, 0, 0);
    return workoutDate >= today;
  };

  const toggleCompletion = () => {
    const updatedWorkout = { 
      ...localWorkout, 
      isCompleted: !localWorkout.isCompleted
    };
    setLocalWorkout(updatedWorkout);
    if (onWorkoutUpdate) {
      onWorkoutUpdate(updatedWorkout);
    }
  };
  
  const hasMaxLifts = () => {
    return localWorkout.exercises.some(exercise => exercise.isMaxLift);
  };
  
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <ThemedView style={[
        styles.card,
        { borderColor: colors.text + '20' },
        isUpcoming() && { borderLeftColor: colors.tint, borderLeftWidth: 4 },
        hasMaxLifts() && { 
          borderColor: '#d16d15',
          borderWidth: 2,
          backgroundColor: '#d16d15' + '08'
        }
      ]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <ThemedText type="subtitle" style={styles.title}>
                {localWorkout.title}
              </ThemedText>
              {hasMaxLifts() && (
                <View style={[styles.maxLiftBadge, { backgroundColor: '#d16d15' }]}>
                  <FontAwesome5 name="trophy" size={10} color="#fff" solid />
                  <ThemedText style={styles.maxLiftBadgeText}>
                    MAX
                  </ThemedText>
                </View>
              )}
            </View>
            {showDate && (
              <ThemedText style={[styles.date, { color: colors.text + '80' }]}>
                {formatDate(localWorkout.date)}
              </ThemedText>
            )}
            {localWorkout.isCompleted && (
              <View style={[styles.completedBadge, { backgroundColor: '#4CAF50' + '20' }]}>
                <FontAwesome5 name="check-circle" size={12} color="#4CAF50" solid />
                <ThemedText style={[styles.completedText, { color: '#4CAF50' }]}>
                  Completed
                </ThemedText>
              </View>
            )}
            {isUpcoming() && (
              <View style={[styles.upcomingBadge, { backgroundColor: colors.tint + '20' }]}>
                <ThemedText style={[styles.upcomingText, { color: colors.tint }]}>
                  Upcoming
                </ThemedText>
              </View>
            )}
          </View>
          
          <View style={styles.actions}>
            {isTodayOrFuture() && (
              <TouchableOpacity onPress={toggleCompletion} style={styles.actionButton}>
                <FontAwesome5 
                  name={localWorkout.isCompleted ? "undo" : "check"} 
                  size={16} 
                  color={localWorkout.isCompleted ? "#ff9800" : "#c8c8c8ff"} 
                  solid={!localWorkout.isCompleted}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <FontAwesome5 name="edit" size={16} color={colors.text + '60'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <FontAwesome5 name="trash" size={16} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.stats}>
          <View style={styles.stat}>
            <FontAwesome5 name="dumbbell" size={14} color={colors.text + '60'} />
            <ThemedText style={[styles.statText, { color: colors.text + '80' }]}>
              {localWorkout.exercises.length} exercises
            </ThemedText>
          </View>
          
          <View style={styles.stat}>
            <FontAwesome5 name="layer-group" size={14} color={colors.text + '60'} />
            <ThemedText style={[styles.statText, { color: colors.text + '80' }]}>
              {getTotalSets()} sets
            </ThemedText>
          </View>
          
          {localWorkout.duration && (
            <View style={styles.stat}>
              <FontAwesome5 name="clock" size={14} color={colors.text + '60'} />
              <ThemedText style={[styles.statText, { color: colors.text + '80' }]}>
                {localWorkout.duration} min
              </ThemedText>
            </View>
          )}
        </View>
        
        {localWorkout.exercises.length > 0 && (
          <View style={styles.exercisesContainer}>
            {localWorkout.exercises.map((exercise, exerciseIndex) => {
              const isExpanded = expandedExercises.has(exercise.id);
              const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
              
              return (
                <View key={exercise.id} style={styles.exerciseItem}>
                  <TouchableOpacity 
                    style={styles.exerciseHeader}
                    onPress={() => toggleExerciseExpansion(exercise.id)}
                  >
                    <View style={styles.exerciseNameContainer}>
                      <ThemedText style={[
                        styles.exerciseName, 
                        { color: colors.text },
                        exercise.isMaxLift && { color: '#d16d15', fontWeight: '600' }
                      ]}>
                        {exercise.name}
                      </ThemedText>
                      {exercise.isMaxLift && (
                        <FontAwesome5 name="trophy" size={12} color="#d16d15" solid />
                      )}
                    </View>
                    <View style={styles.exerciseHeaderRight}>
                      <ThemedText style={[styles.setsCount, { color: colors.text + '70' }]}>
                        {sets.length} set{sets.length !== 1 ? 's' : ''}
                      </ThemedText>
                      <FontAwesome5 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={12} 
                        color={colors.text + '60'} 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={styles.setsContainer}>
                      {sets.map((set, setIndex) => (
                        <View key={set.id} style={[styles.setRow, { borderColor: colors.text + '20' }]}>
                          <ThemedText style={[styles.setNumber, { color: colors.text + '60' }]}>
                            {setIndex + 1}
                          </ThemedText>
                          
                          <View style={styles.setInputs}>
                            <View style={styles.inputGroup}>
                              <ThemedText style={[styles.inputLabel, { color: colors.text + '70' }]}>
                                Reps
                              </ThemedText>
                              <TextInput
                                style={[
                                  styles.setInput,
                                  { 
                                    backgroundColor: colors.background + '80',
                                    borderColor: colors.text + '30',
                                    color: colors.text 
                                  }
                                ]}
                                value={set.reps}
                                onChangeText={(value) => updateExerciseSet(exerciseIndex, setIndex, 'reps', value)}
                                placeholder="10-12"
                                placeholderTextColor={colors.text + '50'}
                              />
                            </View>
                            
                            <View style={styles.inputGroup}>
                              <ThemedText style={[styles.inputLabel, { color: colors.text + '70' }]}>
                                Weight
                              </ThemedText>
                              <TextInput
                                style={[
                                  styles.setInput,
                                  { 
                                    backgroundColor: colors.background + '80',
                                    borderColor: colors.text + '30',
                                    color: colors.text 
                                  }
                                ]}
                                value={set.weight || ''}
                                onChangeText={(value) => updateExerciseSet(exerciseIndex, setIndex, 'weight', value)}
                                placeholder="135 lbs"
                                placeholderTextColor={colors.text + '50'}
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
                      ))}
                      
                      <TouchableOpacity
                        style={[styles.addSetButton, { borderColor: colors.tint + '40' }]}
                        onPress={() => addSetToExercise(exerciseIndex)}
                      >
                        <FontAwesome5 name="plus" size={12} color={colors.tint} />
                        <ThemedText style={[styles.addSetText, { color: colors.tint }]}>
                          Add Set
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
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
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    flex: 1,
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
  maxLiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  maxLiftBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
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
