import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
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
import Calendar from './Calendar';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export interface ExerciseSet {
  id: string;
  reps: string; // Can be "10-12" or "30 seconds" etc.
  weight?: string;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[]; // Changed from number to array of sets
  notes?: string;
}

export interface Workout {
  id?: string;
  date: Date;
  title: string;
  exercises: Exercise[];
  notes?: string;
  duration?: number; // in minutes
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
  
  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [workoutDate, setWorkoutDate] = useState(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
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
  
  const addExercise = () => {
    const newExercise: Exercise = {
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
  
  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setExercises(updatedExercises);
  };
  
  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };
  
  const handleSave = () => {
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
              <TouchableOpacity
                onPress={addExercise}
                style={[styles.addButton, { backgroundColor: colors.tint }]}
              >
                <FontAwesome5 name="plus" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {exercises.map((exercise, index) => (
              <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.text + '05' }]}>
                <View style={styles.exerciseHeader}>
                  <TextInput
                    style={[styles.exerciseNameInput, { color: colors.text, borderColor: colors.text + '20' }]}
                    value={exercise.name}
                    onChangeText={(value) => updateExercise(index, 'name', value)}
                    placeholder="Exercise name"
                    placeholderTextColor={colors.text + '60'}
                  />
                  <TouchableOpacity
                    onPress={() => removeExercise(index)}
                    style={styles.removeButton}
                  >
                    <FontAwesome5 name="trash" size={14} color="#ff4444" />
                  </TouchableOpacity>
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
    marginBottom: 12,
  },
  exerciseNameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
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
});
