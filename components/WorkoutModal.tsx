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
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string; // Can be "10-12" or "30 seconds" etc.
  weight?: string;
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
  
  // Initialize form when workout changes
  useEffect(() => {
    if (workout) {
      setTitle(workout.title);
      setExercises(workout.exercises);
      setNotes(workout.notes || '');
      setDuration(workout.duration?.toString() || '');
    } else {
      // Reset form for new workout
      setTitle('');
      setExercises([]);
      setNotes('');
      setDuration('');
    }
  }, [workout, visible]);
  
  const addExercise = () => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: '',
      sets: 3,
      reps: '10-12',
      weight: '',
      notes: '',
    };
    setExercises([...exercises, newExercise]);
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
      date: selectedDate,
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
            <ThemedText style={styles.dateText}>{formatDate(selectedDate)}</ThemedText>
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
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <ThemedText style={styles.detailLabel}>Sets</ThemedText>
                      <TextInput
                        style={[styles.smallInput, { color: colors.text, borderColor: colors.text + '20' }]}
                        value={exercise.sets.toString()}
                        onChangeText={(value) => updateExercise(index, 'sets', parseInt(value) || 0)}
                        keyboardType="numeric"
                        placeholder="3"
                        placeholderTextColor={colors.text + '60'}
                      />
                    </View>
                    
                    <View style={styles.detailItem}>
                      <ThemedText style={styles.detailLabel}>Reps</ThemedText>
                      <TextInput
                        style={[styles.smallInput, { color: colors.text, borderColor: colors.text + '20' }]}
                        value={exercise.reps}
                        onChangeText={(value) => updateExercise(index, 'reps', value)}
                        placeholder="10-12"
                        placeholderTextColor={colors.text + '60'}
                      />
                    </View>
                    
                    <View style={styles.detailItem}>
                      <ThemedText style={styles.detailLabel}>Weight</ThemedText>
                      <TextInput
                        style={[styles.smallInput, { color: colors.text, borderColor: colors.text + '20' }]}
                        value={exercise.weight || ''}
                        onChangeText={(value) => updateExercise(index, 'weight', value)}
                        placeholder="e.g., 50 lbs"
                        placeholderTextColor={colors.text + '60'}
                      />
                    </View>
                  </View>
                  
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
});
