import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface Exercise {
  id?: string;
  name: string;
  sets: {
    id?: string;
    reps: string;
    weight?: string;
    notes?: string;
    isMaxLift?: boolean;
  }[];
  notes?: string;
  isMaxLift?: boolean;
}

interface WorkoutData {
  title: string;
  exercises: Exercise[];
  notes?: string;
  duration?: number;
}

interface WorkoutReviewModalProps {
  visible: boolean;
  workoutData: WorkoutData | null;
  onSave: (workoutData: WorkoutData, selectedDate: Date, editedTitle: string, notes?: string, duration?: number) => Promise<void>;
  onCancel: () => void;
}

export default function WorkoutReviewModal({
  visible,
  workoutData,
  onSave,
  onCancel,
}: WorkoutReviewModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Safe colors to prevent CoreGraphics NaN errors
  const safeColors = {
    text: colors?.text || '#000000',
    background: colors?.background || '#FFFFFF',
    tint: colors?.tint || '#007AFF'
  };

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState(45);
  const [saving, setSaving] = useState(false);

  // Update local state when workoutData changes
  React.useEffect(() => {
    if (workoutData) {
      setWorkoutTitle(workoutData.title);
      setWorkoutNotes(workoutData.notes || '');
      setWorkoutDuration(workoutData.duration || 45);
    }
  }, [workoutData]);

  const handleSave = async () => {
    if (!workoutData) return;
    
    if (!workoutTitle.trim()) {
      Alert.alert('Error', 'Please enter a workout title');
      return;
    }

    setSaving(true);
    try {
      const updatedWorkoutData = {
        ...workoutData,
        title: workoutTitle,
        notes: workoutNotes,
        duration: workoutDuration,
      };
      
      await onSave(updatedWorkoutData, selectedDate, workoutTitle, workoutNotes, workoutDuration);
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalSets = () => {
    if (!workoutData?.exercises) return 0;
    return workoutData.exercises.reduce((total, exercise) => total + (exercise.sets?.length || 0), 0);
  };

  // Early return if no workout data
  if (!workoutData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ThemedView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
              <FontAwesome5 name="times" size={20} color={safeColors.text} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Review Workout</ThemedText>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveButton, { backgroundColor: safeColors.tint }]}
              disabled={saving}
            >
              <ThemedText style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Workout Title */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Workout Title</ThemedText>
              <TextInput
                style={[styles.titleInput, { 
                  color: safeColors.text, 
                  borderColor: safeColors.text + '30',
                  backgroundColor: safeColors.background
                }]}
                value={workoutTitle}
                onChangeText={setWorkoutTitle}
                placeholder="Enter workout title"
                placeholderTextColor={safeColors.text + '60'}
                maxLength={100}
              />
            </View>

            {/* Date Selection */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Workout Date</ThemedText>
              <TouchableOpacity
                style={[styles.dateButton, { 
                  borderColor: safeColors.text + '30',
                  backgroundColor: safeColors.background
                }]}
                onPress={() => {
                  // For now, cycle through today, tomorrow, day after tomorrow
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const dayAfter = new Date();
                  dayAfter.setDate(dayAfter.getDate() + 2);
                  
                  const today = new Date();
                  if (selectedDate.toDateString() === today.toDateString()) {
                    setSelectedDate(tomorrow);
                  } else if (selectedDate.toDateString() === tomorrow.toDateString()) {
                    setSelectedDate(dayAfter);
                  } else {
                    setSelectedDate(today);
                  }
                }}
              >
                <FontAwesome5 name="calendar" size={16} color={safeColors.tint} />
                <ThemedText style={[styles.dateText, { color: safeColors.text }]}>
                  {formatDate(selectedDate)}
                </ThemedText>
                <FontAwesome5 name="chevron-right" size={14} color={safeColors.text + '60'} />
              </TouchableOpacity>
              <ThemedText style={[styles.dateHint, { color: safeColors.text + '60' }]}>
                Tap to cycle between today, tomorrow, and day after
              </ThemedText>
            </View>

            {/* Workout Summary */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Workout Summary</ThemedText>
              <View style={[styles.summaryCard, { 
                backgroundColor: safeColors.tint + '10',
                borderColor: safeColors.tint + '30'
              }]}>
                <View style={styles.summaryRow}>
                  <FontAwesome5 name="dumbbell" size={16} color={safeColors.tint} />
                  <ThemedText style={[styles.summaryText, { color: safeColors.text }]}>
                    {workoutData.exercises?.length || 0} exercises
                  </ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <FontAwesome5 name="layer-group" size={16} color={safeColors.tint} />
                  <ThemedText style={[styles.summaryText, { color: safeColors.text }]}>
                    {getTotalSets()} total sets
                  </ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <FontAwesome5 name="clock" size={16} color={safeColors.tint} />
                  <ThemedText style={[styles.summaryText, { color: safeColors.text }]}>
                    {workoutDuration} minutes
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Duration */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Duration (minutes)</ThemedText>
              <TextInput
                style={[styles.durationInput, { 
                  color: safeColors.text, 
                  borderColor: safeColors.text + '30',
                  backgroundColor: safeColors.background
                }]}
                value={workoutDuration.toString()}
                onChangeText={(text) => {
                  const duration = parseInt(text) || 0;
                  setWorkoutDuration(Math.max(0, Math.min(999, duration))); // Limit between 0-999
                }}
                placeholder="45"
                placeholderTextColor={safeColors.text + '60'}
                keyboardType="numeric"
                maxLength={3}
              />
              <ThemedText style={[styles.durationHint, { color: safeColors.text + '60' }]}>
                Estimated workout duration in minutes
              </ThemedText>
            </View>

            {/* Exercise List */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Exercises</ThemedText>
              {workoutData.exercises?.length > 0 ? (
                workoutData.exercises.map((exercise, index) => (
                  <View 
                    key={exercise.id || index} 
                    style={[styles.exerciseCard, { 
                      borderColor: safeColors.text + '20',
                      backgroundColor: safeColors.background
                    }]}
                  >
                    <ThemedText style={[styles.exerciseName, { color: safeColors.text }]}>
                      {exercise.name || 'Unnamed Exercise'}
                    </ThemedText>
                    <View style={styles.setsContainer}>
                      {exercise.sets?.map((set, setIndex) => (
                        <View key={set.id || setIndex} style={styles.setRow}>
                          <ThemedText style={[styles.setNumber, { color: safeColors.text + '70' }]}>
                            Set {setIndex + 1}:
                          </ThemedText>
                          <ThemedText style={[styles.setDetails, { color: safeColors.text }]}>
                            {set.reps} reps{set.weight ? ` @ ${set.weight}` : ''}
                          </ThemedText>
                        </View>
                      )) || (
                        <ThemedText style={[styles.setDetails, { color: safeColors.text + '60' }]}>
                          No sets defined
                        </ThemedText>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={[styles.exerciseCard, { 
                  borderColor: safeColors.text + '20',
                  backgroundColor: safeColors.background
                }]}>
                  <ThemedText style={[styles.exerciseName, { color: safeColors.text + '60' }]}>
                    No exercises found in workout
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Notes (Optional)</ThemedText>
              <TextInput
                style={[styles.notesInput, { 
                  color: safeColors.text, 
                  borderColor: safeColors.text + '30',
                  backgroundColor: safeColors.background
                }]}
                value={workoutNotes}
                onChangeText={setWorkoutNotes}
                placeholder="Add any notes about this workout..."
                placeholderTextColor={safeColors.text + '60'}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>
          </ScrollView>
        </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  cancelButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  dateHint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  setsContainer: {
    gap: 4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumber: {
    fontSize: 14,
    width: 50,
  },
  setDetails: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  durationInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  durationHint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
