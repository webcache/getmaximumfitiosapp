// Example usage of the Social Sharing functionality
// This file demonstrates how to use the social sharing features in your app
// Updated to trigger build

import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { shareProgressUpdate, shareWorkoutAchievement, shareWorkoutComplete } from '../components/SocialSharingModal';
import { ThemedText } from '../components/ThemedText';

// Example: Share achievement from any screen
export const ShareAchievementExample = () => {
  const handleShareAchievement = async () => {
    try {
      await shareWorkoutAchievement({
        title: 'First Week Complete!',
        description: 'Just finished my first week of consistent workouts with Maximum Fit!',
        // customMessage: 'Optional custom message override'
      });
    } catch (error) {
      console.error('Failed to share achievement:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handleShareAchievement} style={{ padding: 10, backgroundColor: '#007AFF', borderRadius: 8 }}>
      <ThemedText style={{ color: 'white', textAlign: 'center' }}>Share Achievement</ThemedText>
    </TouchableOpacity>
  );
};

// Example: Share workout completion
export const ShareWorkoutExample = () => {
  const handleShareWorkout = async () => {
    try {
      await shareWorkoutComplete({
        name: 'Upper Body Blast',
        duration: '45 minutes',
        exercises: 8,
        // customMessage: 'Optional custom message override'
      });
    } catch (error) {
      console.error('Failed to share workout:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handleShareWorkout} style={{ padding: 10, backgroundColor: '#28A745', borderRadius: 8 }}>
      <ThemedText style={{ color: 'white', textAlign: 'center' }}>Share Workout</ThemedText>
    </TouchableOpacity>
  );
};

// Example: Share weekly progress
export const ShareProgressExample = () => {
  const handleShareProgress = async () => {
    try {
      await shareProgressUpdate({
        period: 'Weekly',
        achievements: [
          'Completed 5 workouts',
          'Increased bench press by 10 lbs',
          'Ran 3 miles without stopping',
          'Maintained consistency all week'
        ],
        // customMessage: 'Optional custom message override'
      });
    } catch (error) {
      console.error('Failed to share progress:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handleShareProgress} style={{ padding: 10, backgroundColor: '#FFC107', borderRadius: 8 }}>
      <ThemedText style={{ color: 'white', textAlign: 'center' }}>Share Progress</ThemedText>
    </TouchableOpacity>
  );
};

// Example: Add share button to workout completion screen
export const WorkoutCompletionWithShare = ({ workout }: { workout: any }) => {
  const handleQuickShare = () => {
    Alert.alert(
      'Share Workout',
      'Would you like to share your workout completion?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Share',
          onPress: () => shareWorkoutComplete({
            name: workout.title,
            duration: workout.duration || 'Unknown',
            exercises: workout.exercises?.length || 0,
          })
        }
      ]
    );
  };

  return (
    <View style={{ padding: 20, alignItems: 'center' }}>
      <ThemedText style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>
        Workout Complete! 🎉
      </ThemedText>
      
      <TouchableOpacity 
        onPress={handleQuickShare}
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: '#007AFF', 
          padding: 12, 
          borderRadius: 8,
          marginTop: 10
        }}
      >
        <FontAwesome5 name="share" size={16} color="white" style={{ marginRight: 8 }} />
        <ThemedText style={{ color: 'white', fontWeight: '600' }}>Share Achievement</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

// Example: Integration with workout context/state
export const useWorkoutSharing = () => {
  type UserSettings = {
    autoShare: boolean;
    shareWorkouts?: boolean;
    shareAchievements?: boolean;
  };

  const shareCompletedWorkout = async (workoutData: any, achievementData?: any) => {
    try {
      // Replace with actual value from user context
      const userSettings: UserSettings = {
        autoShare: false,
        shareWorkouts: false,
        shareAchievements: false,
      };

      if (userSettings.autoShare && userSettings.shareWorkouts) {
        await shareWorkoutComplete({
          name: workoutData.title,
          duration: workoutData.duration,
          exercises: workoutData.exercises?.length || 0,
        });
      }

      if (
        userSettings.autoShare &&
        userSettings.shareAchievements &&
        achievementData
      ) {
        await shareWorkoutAchievement({
          title: achievementData.title,
          description: achievementData.description,
        });
      }
    } catch (error) {
      console.error('Auto-share achievement failed:', error);
    }
  };

  // Placeholder for shareAchievement function, define as needed
  const shareAchievement = async (achievementData: any) => {
    try {
      await shareWorkoutAchievement({
        title: achievementData.title,
        description: achievementData.description,
      });
    } catch (error) {
      console.error('Share achievement failed:', error);
    }
  };

  return {
    shareCompletedWorkout,
    shareAchievement,
  };
};

/* 
INTEGRATION NOTES:

1. Import the sharing functions wherever you need them:
   import { shareWorkoutAchievement, shareWorkoutComplete, shareProgressUpdate } from '../components/SocialSharingModal';

2. Call them when appropriate events occur:
   - After workout completion
   - When achievements are unlocked
   - For weekly/monthly progress updates

3. Consider user preferences:
   - Check if auto-sharing is enabled
   - Respect which types of content the user wants to share
   - Allow manual sharing even if auto-share is disabled

4. Error handling:
   - The functions throw errors only for actual failures
   - User canceling share is handled gracefully
   - Always wrap in try-catch blocks

5. Customization:
   - All functions accept optional customMessage parameter
   - Modify the default messages to match your app's tone
   - Add additional parameters as needed for your use case
*/
