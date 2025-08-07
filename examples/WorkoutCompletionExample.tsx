import AchievementShareModal from '@/components/AchievementShareModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAchievementShare } from '@/hooks/useAchievementShare';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * Example component showing how to integrate achievement sharing
 * into your workout completion flow
 */
export default function WorkoutCompletionExample() {
  const {
    isVisible,
    achievementType,
    achievementData,
    triggerWorkoutComplete,
    triggerPersonalRecord,
    triggerMilestone,
    hideAchievementShare,
  } = useAchievementShare();

  const handleWorkoutComplete = () => {
    // Simulate workout completion
    const workoutData = {
      name: 'Push Day Blast',
      duration: '45 minutes',
      exercises: 6,
    };

    // Show completion confirmation first
    Alert.alert(
      '🎉 Workout Complete!',
      `Great job completing "${workoutData.name}" in ${workoutData.duration}!`,
      [
        {
          text: 'Just Finish',
          style: 'cancel',
        },
        {
          text: 'Share Achievement',
          onPress: () => triggerWorkoutComplete(
            workoutData.name, 
            workoutData.duration, 
            workoutData.exercises
          ),
        },
      ]
    );
  };

  const handlePersonalRecord = () => {
    // Simulate new PR
    const prData = {
      exercise: 'Bench Press',
      weight: 225,
      reps: 5,
      previousRecord: 215,
    };

    // Show PR celebration
    Alert.alert(
      '🏆 New Personal Record!',
      `Amazing! You just hit ${prData.weight} lbs on ${prData.exercise}!\nThat's a ${prData.weight - prData.previousRecord} lb improvement!`,
      [
        {
          text: 'Keep It Private',
          style: 'cancel',
        },
        {
          text: 'Share This Win!',
          onPress: () => triggerPersonalRecord(
            prData.exercise,
            prData.weight,
            prData.reps,
            prData.previousRecord
          ),
        },
      ]
    );
  };

  const handleMilestone = () => {
    // Simulate milestone achievement
    triggerMilestone(
      'First Month Complete!',
      'Completed 30 days of consistent workouts! 💪'
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>
        Achievement Sharing Demo
      </ThemedText>
      
      <ThemedText style={styles.subtitle}>
        Try different scenarios to see the sharing modal in action
      </ThemedText>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.workoutButton]} 
          onPress={handleWorkoutComplete}
        >
          <FontAwesome5 name="dumbbell" size={20} color="white" />
          <ThemedText style={styles.buttonText}>
            Complete Workout
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.prButton]} 
          onPress={handlePersonalRecord}
        >
          <FontAwesome5 name="trophy" size={20} color="white" />
          <ThemedText style={styles.buttonText}>
            Set New PR
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.milestoneButton]} 
          onPress={handleMilestone}
        >
          <FontAwesome5 name="medal" size={20} color="white" />
          <ThemedText style={styles.buttonText}>
            Reach Milestone
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <FontAwesome5 name="info-circle" size={16} color="#007AFF" />
        <ThemedText style={styles.infoText}>
          In your real app, these would be triggered automatically when users complete workouts or achieve new records.
        </ThemedText>
      </View>

      {/* Achievement Share Modal */}
      {achievementType && achievementData && (
        <AchievementShareModal
          visible={isVisible}
          onClose={hideAchievementShare}
          achievementType={achievementType}
          achievementData={achievementData}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 40,
  },
  buttonContainer: {
    gap: 20,
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  workoutButton: {
    backgroundColor: '#4CAF50',
  },
  prButton: {
    backgroundColor: '#FFD700',
  },
  milestoneButton: {
    backgroundColor: '#FF6B35',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#007AFF',
  },
});
