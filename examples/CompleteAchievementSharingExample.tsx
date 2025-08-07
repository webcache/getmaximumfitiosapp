/**
 * Complete Achievement Sharing Example
 * 
 * This example shows how to integrate all the achievement sharing components
 * into your existing workout screens. It demonstrates:
 * 
 * 1. Text-based sharing (Twitter, Facebook, etc.)
 * 2. Visual sharing with screenshots (Instagram, etc.)
 * 3. Proper integration with workout completion flows
 * 4. Error handling and user feedback
 */

import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import our achievement sharing components
import AchievementShareModal from '../components/AchievementShareModal';
import ShareableAchievementCard from '../components/ShareableAchievementCard';
import { useAchievementShare } from '../hooks/useAchievementShare';

// Import sharing utilities
import { shareImageFile } from '../utils/screenshotSharing';
import { shareToSocialMedia } from '../utils/socialSharing';

// Types for our example
interface WorkoutData {
  id: string;
  name: string;
  duration: number;
  caloriesBurned: number;
  exercisesCompleted: number;
  personalRecords: Array<{
    exercise: string;
    weight: number;
    reps: number;
  }>;
}

export const CompleteAchievementSharingExample: React.FC = () => {
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutData | null>(null);
  const [showVisualShare, setShowVisualShare] = useState(false);
  
  // Use our achievement sharing hook
  const achievementShare = useAchievementShare();

  // Example workout data
  const exampleWorkout: WorkoutData = {
    id: '1',
    name: 'Push Day Workout',
    duration: 75, // minutes
    caloriesBurned: 450,
    exercisesCompleted: 8,
    personalRecords: [
      { exercise: 'Bench Press', weight: 225, reps: 8 },
      { exercise: 'Overhead Press', weight: 135, reps: 5 },
    ],
  };

  // Simulate workout completion
  const handleWorkoutComplete = () => {
    setSelectedWorkout(exampleWorkout);
    
    // Check if user achieved any personal records
    if (exampleWorkout.personalRecords.length > 0) {
      // Show PR-specific achievement modal
      achievementShare.triggerPersonalRecord(
        exampleWorkout.personalRecords[0].exercise,
        exampleWorkout.personalRecords[0].weight,
        exampleWorkout.personalRecords[0].reps
      );
    } else {
      // Show general workout completion modal
      achievementShare.showWorkoutComplete({
        workoutName: exampleWorkout.name,
        duration: `${exampleWorkout.duration} min`,
        exercises: exampleWorkout.exercisesCompleted,
      });
    }
  };

  // Simulate milestone achievement
  const handleMilestoneAchieved = () => {
    achievementShare.triggerMilestone('100 Workouts Completed!', 'You\'ve reached an amazing milestone! 🎉');
  };

  // Handle direct text-based sharing (bypass modal)
  const handleQuickTextShare = async (platform: 'twitter' | 'facebook' | 'whatsapp') => {
    if (!selectedWorkout) return;

    const shareContent = {
      type: 'workout' as const,
      title: 'Workout Complete!',
      message: `Just completed "${selectedWorkout.name}" in ${selectedWorkout.duration} minutes! 💪 Burned ${selectedWorkout.caloriesBurned} calories and hit ${selectedWorkout.personalRecords.length} personal records! #MaximumFit #WorkoutComplete`
    };

    const success = await shareToSocialMedia(shareContent, { platform });

    if (success) {
      Alert.alert('Success!', `Shared to ${platform}!`);
    }
  };

  // Handle visual sharing with screenshot
  const handleVisualShare = () => {
    if (!selectedWorkout) return;
    setShowVisualShare(true);
  };

  // Handle screenshot capture and sharing
  const handleScreenshotShare = async (imageUri: string) => {
    if (!selectedWorkout) return;

    // Use the image URI directly for sharing
    const success = await shareImageFile(
      imageUri,
      'generic',
      `Check out my latest workout achievement! 💪 #MaximumFit`
    );

    if (success) {
      Alert.alert('Success!', 'Achievement shared!');
      setShowVisualShare(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Achievement Sharing Examples</Text>
        
        {/* Trigger Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Trigger Achievement Modals</Text>
          <Text style={styles.description}>
            These buttons simulate different achievement scenarios that would 
            normally happen after completing a workout:
          </Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleWorkoutComplete}
          >
            <Text style={styles.buttonText}>Complete Workout with PR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleMilestoneAchieved}
          >
            <Text style={styles.buttonText}>Achieve Milestone</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Sharing Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Quick Text Sharing</Text>
          <Text style={styles.description}>
            Direct sharing without modal (useful for quick share buttons):
          </Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.smallButton, styles.twitterButton]} 
              onPress={() => handleQuickTextShare('twitter')}
            >
              <Text style={styles.smallButtonText}>Tweet</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.smallButton, styles.facebookButton]} 
              onPress={() => handleQuickTextShare('facebook')}
            >
              <Text style={styles.smallButtonText}>Facebook</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.smallButton, styles.whatsappButton]} 
              onPress={() => handleQuickTextShare('whatsapp')}
            >
              <Text style={styles.smallButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Visual Sharing Example */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Visual Achievement Sharing</Text>
          <Text style={styles.description}>
            Create beautiful achievement cards for Instagram and other visual platforms:
          </Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleVisualShare}
          >
            <Text style={styles.buttonText}>Create Achievement Card</Text>
          </TouchableOpacity>
        </View>

        {/* Implementation Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Implementation Notes</Text>
          <Text style={styles.description}>
            • The AchievementShareModal automatically appears when triggered{'\n'}
            • Text sharing works immediately without additional setup{'\n'}
            • Visual sharing creates screenshots for Instagram-style posts{'\n'}
            • All sharing respects user platform preferences{'\n'}
            • Graceful fallbacks handle missing apps or user cancellation
          </Text>
        </View>
      </ScrollView>

      {/* Achievement Share Modal - uses hook's internal state */}
      {achievementShare.isVisible && achievementShare.achievementType && achievementShare.achievementData && (
        <AchievementShareModal
          visible={achievementShare.isVisible}
          onClose={achievementShare.hideAchievementShare}
          achievementType={achievementShare.achievementType}
          achievementData={achievementShare.achievementData}
        />
      )}

      {/* Visual Achievement Card for Screenshot Sharing */}
      {showVisualShare && selectedWorkout && (
        <View style={styles.visualShareOverlay}>
          <View style={styles.visualShareContainer}>
            <Text style={styles.visualShareTitle}>Share Your Achievement</Text>
            
            <ShareableAchievementCard
              achievement={{
                title: "Workout Complete!",
                description: selectedWorkout.name,
                icon: "dumbbell",
                color: "#007AFF",
                stats: {
                  duration: `${selectedWorkout.duration} min`,
                  exercise: `${selectedWorkout.exercisesCompleted} exercises`,
                  weight: selectedWorkout.personalRecords.length,
                }
              }}
              onShare={handleScreenshotShare}
            />
            
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowVisualShare(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  smallButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  twitterButton: {
    backgroundColor: '#1DA1F2',
  },
  facebookButton: {
    backgroundColor: '#4267B2',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  visualShareOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualShareContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: '100%',
  },
  visualShareTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#666',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 15,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CompleteAchievementSharingExample;
