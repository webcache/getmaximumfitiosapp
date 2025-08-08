import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { shareImageFile } from '@/utils/screenshotSharing';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import * as FileSystem from 'expo-file-system';
import React, { useRef } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

interface AchievementCardProps {
  achievement: {
    title: string;
    description: string;
    icon: string;
    color: string;
    stats?: {
      exercise?: string;
      weight?: number;
      reps?: number;
      duration?: string;
    };
  };
  onShare?: (imageUri: string) => void;
}

/**
 * Achievement card that can be screenshotted and shared
 */
export default function ShareableAchievementCard({ achievement, onShare }: AchievementCardProps) {
  const cardRef = useRef<View>(null);

  const captureAndShare = async (platform?: string) => {
    try {
      if (!cardRef.current) {
        Alert.alert('Error', 'Unable to capture achievement card');
        return;
      }

      // Show loading state
      Alert.alert('Capturing...', 'Creating your achievement image...');

      // Capture the card as an image
      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      console.log('Achievement card captured:', uri);

      // Create a proper file path
      const filename = `achievement_${Date.now()}.png`;
      const filePath = `${FileSystem.cacheDirectory}${filename}`;
      
      // Copy to cache directory
      await FileSystem.copyAsync({
        from: uri,
        to: filePath,
      });

      // Share the image
      const shareSuccess = await shareImageFile(filePath);

      if (shareSuccess) {
        console.log('Achievement card shared successfully');
      }

      // Callback if provided
      if (onShare) {
        onShare(filePath);
      }

      // Clean up after a delay
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        } catch (error) {
          console.warn('Failed to cleanup temporary file:', error);
        }
      }, 5000);

    } catch (error) {
      console.error('Error capturing achievement card:', error);
      Alert.alert(
        'Screenshot Failed', 
        'Unable to capture the achievement card. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* This is the card that will be screenshotted */}
      <View ref={cardRef} style={styles.card} collapsable={false}>
        <ThemedView style={[styles.cardContent, { backgroundColor: achievement.color }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <FontAwesome5 name={achievement.icon} size={32} color="white" />
            </View>
            <ThemedText style={styles.appName}>Maximum Fit</ThemedText>
          </View>

          {/* Achievement Content */}
          <View style={styles.achievementContent}>
            <ThemedText style={styles.title}>{achievement.title}</ThemedText>
            <ThemedText style={styles.description}>{achievement.description}</ThemedText>
            
            {achievement.stats && (
              <View style={styles.stats}>
                {achievement.stats.exercise && (
                  <ThemedText style={styles.stat}>🏋️‍♂️ {achievement.stats.exercise}</ThemedText>
                )}
                {achievement.stats.weight && (
                  <ThemedText style={styles.stat}>⚡ {achievement.stats.weight} lbs</ThemedText>
                )}
                {achievement.stats.reps && (
                  <ThemedText style={styles.stat}>🔄 {achievement.stats.reps} reps</ThemedText>
                )}
                {achievement.stats.duration && (
                  <ThemedText style={styles.stat}>⏱️ {achievement.stats.duration}</ThemedText>
                )}
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.hashtags}>#MaximumFit #Achievement #Fitness</ThemedText>
            <ThemedText style={styles.url}>getmaximumfit.com</ThemedText>
          </View>
        </ThemedView>
      </View>

      {/* Share Buttons */}
      <View style={styles.shareButtons}>
        <TouchableOpacity 
          style={[styles.shareButton, { backgroundColor: '#E4405F' }]}
          onPress={() => captureAndShare('instagram')}
        >
          <FontAwesome5 name="instagram" size={16} color="white" />
          <ThemedText style={styles.shareButtonText}>Instagram</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.shareButton, { backgroundColor: '#1877F2' }]}
          onPress={() => captureAndShare('facebook')}
        >
          <FontAwesome5 name="facebook" size={16} color="white" />
          <ThemedText style={styles.shareButtonText}>Facebook</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.shareButton, { backgroundColor: '#666' }]}
          onPress={() => captureAndShare('generic')}
        >
          <FontAwesome5 name="share" size={16} color="white" />
          <ThemedText style={styles.shareButtonText}>More</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
  },
  card: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardContent: {
    borderRadius: 20,
    padding: 30,
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  achievementContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  stats: {
    alignItems: 'center',
    gap: 8,
  },
  stat: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  hashtags: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  url: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  shareButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
