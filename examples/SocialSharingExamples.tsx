import { ThemedText } from '@/components/ThemedText';
import {
    generateShareContent,
    shareAchievement,
    sharePersonalRecord,
    shareToSocialMedia,
    shareWorkoutComplete
} from '@/utils/socialSharing';
import React from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';

/**
 * Example usage of the social sharing functionality
 * This shows how to implement sharing for different fitness scenarios
 */
export function SocialSharingExamples() {
  
  // Example 1: Share a personal record
  const handlePersonalRecordShare = async () => {
    try {
      const success = await sharePersonalRecord(
        'Bench Press',
        225, // weight in lbs
        5,   // reps
        'instagram' // specific platform, or omit for generic sharing
      );
      
      if (success) {
        console.log('Personal record shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing personal record:', error);
    }
  };

  // Example 2: Share a completed workout
  const handleWorkoutShare = async () => {
    try {
      const success = await shareWorkoutComplete(
        '60-minute',
        'Push day workout',
        '4 sets each'
        // platform is optional - will use generic sharing
      );
      
      if (success) {
        console.log('Workout shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing workout:', error);
    }
  };

  // Example 3: Share a general achievement
  const handleAchievementShare = async () => {
    try {
      const success = await shareAchievement(
        'Completed my first month of consistent workouts!',
        'facebook'
      );
      
      if (success) {
        console.log('Achievement shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing achievement:', error);
    }
  };

  // Example 4: Custom sharing with more control
  const handleCustomShare = async () => {
    try {
      // Generate custom content
      const content = generateShareContent('personal_record', {
        exercise: 'Deadlift',
        weight: 315,
        reps: 1
      });

      // Add custom image if available
      // content.imageUri = 'file://path-to-workout-photo.jpg';

      // Share to multiple platforms or let user choose
      const success = await shareToSocialMedia(content, {
        platform: 'generic', // This will show the system share sheet
        includeAppUrl: true
      });

      if (success) {
        console.log('Custom content shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing custom content:', error);
    }
  };

  // Example 5: Share with screenshot (placeholder)
  const handleShareWithScreenshot = async () => {
    // TODO: Implement screenshot capture
    // For now, this is a placeholder showing the concept
    Alert.alert(
      'Share with Screenshot',
      'This feature will capture a screenshot of your achievement and share it to Instagram.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            // In a real implementation, you would:
            // 1. Capture a screenshot of the achievement screen
            // 2. Save it to a temporary file
            // 3. Share it with the image

            const content = generateShareContent('achievement', {
              description: 'New personal best! Check out this achievement.'
            });

            // content.imageUri = 'file://captured-screenshot.jpg';

            await shareToSocialMedia(content, {
              platform: 'instagram' // Instagram requires images
            });
          }
        }
      ]
    );
  };

  return (
    <View style={{ padding: 20 }}>
      <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Social Sharing Examples
      </ThemedText>

      <TouchableOpacity
        style={styles.button}
        onPress={handlePersonalRecordShare}
      >
        <ThemedText style={styles.buttonText}>
          Share Personal Record
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleWorkoutShare}
      >
        <ThemedText style={styles.buttonText}>
          Share Workout Complete
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleAchievementShare}
      >
        <ThemedText style={styles.buttonText}>
          Share Achievement
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleCustomShare}
      >
        <ThemedText style={styles.buttonText}>
          Custom Share
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#E4405F' }]}
        onPress={handleShareWithScreenshot}
      >
        <ThemedText style={[styles.buttonText, { color: 'white' }]}>
          Share with Screenshot (Instagram)
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  button: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center' as const,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
};

export default SocialSharingExamples;
