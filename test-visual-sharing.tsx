import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AchievementShareModal from './components/AchievementShareModal';
import { ThemedText } from './components/ThemedText';
import { ThemedView } from './components/ThemedView';
import { useAchievementShare } from './hooks/useAchievementShare';

/**
 * Test component for the new visual achievement sharing functionality
 * Place this in your app to test the visual achievement cards
 */
export default function VisualSharingTest() {
  const achievementShare = useAchievementShare();

  const testWorkoutComplete = () => {
    achievementShare.triggerWorkoutComplete(
      'Push Day Blast',
      '45 minutes',
      6
    );
  };

  const testPersonalRecord = () => {
    achievementShare.triggerPersonalRecord(
      'Bench Press',
      225,
      5,
      215
    );
  };

  const testMilestone = () => {
    achievementShare.triggerMilestone(
      '100 Workouts Completed!',
      'You\'ve reached an incredible milestone! 🎉'
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>
        Visual Achievement Sharing Test
      </ThemedText>
      
      <ThemedText style={styles.subtitle}>
        Test the new visual achievement cards that get generated when sharing to social media!
      </ThemedText>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testWorkoutComplete}>
          <FontAwesome5 name="dumbbell" size={20} color="white" />
          <ThemedText style={styles.buttonText}>
            Test Workout Complete
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testPersonalRecord}>
          <FontAwesome5 name="trophy" size={20} color="white" />
          <ThemedText style={styles.buttonText}>
            Test Personal Record
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testMilestone}>
          <FontAwesome5 name="medal" size={20} color="white" />
          <ThemedText style={styles.buttonText}>
            Test Milestone
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <ThemedText style={styles.instructionTitle}>
          🎯 How to Test Visual Sharing:
        </ThemedText>
        <ThemedText style={styles.instructionText}>
          1. Tap any button above to trigger an achievement
        </ThemedText>
        <ThemedText style={styles.instructionText}>
          2. In the sharing modal, select a platform (Instagram/Facebook recommended)
        </ThemedText>
        <ThemedText style={styles.instructionText}>
          3. Choose "Visual Achievement Card" option
        </ThemedText>
        <ThemedText style={styles.instructionText}>
          4. The app will create a beautiful visual card and share it!
        </ThemedText>
      </View>

      {/* Achievement Share Modal */}
      {achievementShare.isVisible && achievementShare.achievementType && achievementShare.achievementData && (
        <AchievementShareModal
          visible={achievementShare.isVisible}
          onClose={achievementShare.hideAchievementShare}
          achievementType={achievementShare.achievementType}
          achievementData={achievementShare.achievementData}
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
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 30,
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  instructions: {
    backgroundColor: '#F0F8FF',
    padding: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007AFF',
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 5,
    lineHeight: 20,
  },
});
