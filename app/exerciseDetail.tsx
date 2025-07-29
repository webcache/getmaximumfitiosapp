import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import VideoPlayer from '@/components/VideoPlayer';
import type { Exercise as ExerciseType } from '@/types/exercise';
import { userExerciseStorage } from '@/utils/userExerciseStorage';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';

export default function ExerciseDetail() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { exerciseData } = useLocalSearchParams();
  
  const exercise: ExerciseType = exerciseData ? JSON.parse(exerciseData as string) : null;

  // Initialize userExerciseStorage when user is available
  useEffect(() => {
    if (user) {
      userExerciseStorage.initialize(user.uid);
    } else {
      userExerciseStorage.cleanup();
    }
  }, [user]);

  // Debug logging
  console.log('🏋️ ExerciseDetail received exerciseData:', !!exerciseData);
  console.log('🏋️ Parsed exercise:', exercise?.name);
  console.log('🏋️ Exercise video field:', exercise?.video);
  console.log('🏋️ Exercise video type:', typeof exercise?.video);
  console.log('🏋️ Has video?:', !!exercise?.video);

  if (!exercise) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>No exercise data found</ThemedText>
      </ThemedView>
    );
  }

  const handleAddToList = () => {
    try {
      userExerciseStorage.addExercise(exercise);
      Alert.alert('Success', `${exercise.name} added to your exercise list!`);
    } catch (error) {
      console.error('Error adding exercise to list:', error);
      Alert.alert('Error', 'Failed to add exercise to your list. Please try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Video Banner */}
        {exercise.video && (
          <View style={styles.videoBanner}>
            <VideoPlayer videoUrl={exercise.video} height={220} />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Exercise Header */}
          <View style={styles.header}>
            <ThemedText style={styles.exerciseName}>{exercise.name}</ThemedText>
            <View style={styles.categoryBadge}>
              <ThemedText style={styles.categoryText}>{exercise.category}</ThemedText>
            </View>
          </View>

          {/* Primary Muscles */}
          <View style={styles.detailSection}>
            <ThemedText style={styles.sectionTitle}>Primary Muscles</ThemedText>
            <ThemedText style={styles.detailText}>
              {exercise.primary_muscles.join(', ')}
            </ThemedText>
          </View>

          {/* Secondary Muscles */}
          {exercise.secondary_muscles.length > 0 && (
            <View style={styles.detailSection}>
              <ThemedText style={styles.sectionTitle}>Secondary Muscles</ThemedText>
              <ThemedText style={styles.detailText}>
                {exercise.secondary_muscles.join(', ')}
              </ThemedText>
            </View>
          )}

          {/* Equipment */}
          <View style={styles.detailSection}>
            <ThemedText style={styles.sectionTitle}>Equipment</ThemedText>
            <ThemedText style={styles.detailText}>
              {exercise.equipment.length > 0 
                ? exercise.equipment.join(', ') 
                : 'No equipment needed'
              }
            </ThemedText>
          </View>

          {/* Description */}
          {exercise.description && (
            <View style={styles.detailSection}>
              <ThemedText style={styles.sectionTitle}>Description</ThemedText>
              <ThemedText style={styles.detailText}>{exercise.description}</ThemedText>
            </View>
          )}

          {/* Instructions */}
          {exercise.instructions.length > 0 && (
            <View style={styles.detailSection}>
              <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>
              {exercise.instructions.map((instruction: string, index: number) => (
                <View key={index} style={styles.instructionItem}>
                  <ThemedText style={styles.instructionNumber}>{index + 1}.</ThemedText>
                  <ThemedText style={styles.instructionText}>{instruction}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Tips */}
          {exercise.tips && exercise.tips.length > 0 && (
            <View style={styles.detailSection}>
              <ThemedText style={styles.sectionTitle}>Tips</ThemedText>
              {exercise.tips.map((tip: string, index: number) => (
                <ThemedText key={index} style={styles.tipText}>• {tip}</ThemedText>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add to List Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(10, insets.bottom) }]}>
        <TouchableOpacity
          style={styles.addToListButton}
          onPress={handleAddToList}
        >
          <FontAwesome5 name="plus" size={16} color="#fff" />
          <ThemedText style={styles.addToListButtonText}>Add to My List</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  videoBanner: {
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  detailText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addToListButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  addToListButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
