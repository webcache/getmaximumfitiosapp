import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React, { useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDynamicThemeColor } from '../hooks/useThemeColor';
import {
    generateShareContent,
    ShareContent,
    shareToSocialMedia
} from '../utils/socialSharing';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

const { width } = Dimensions.get('window');

interface AchievementShareModalProps {
  visible: boolean;
  onClose: () => void;
  achievementType: 'workout_complete' | 'personal_record' | 'achievement' | 'progress';
  achievementData: {
    title: string;
    description: string;
    // For workout completion
    workoutName?: string;
    duration?: string;
    exercises?: number;
    // For personal records
    exercise?: string;
    weight?: number;
    reps?: number;
    previousRecord?: number;
    // For general achievements
    milestone?: string;
    // Optional custom message and image
    customMessage?: string;
    imageUri?: string;
  };
}

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  shareApp: string;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    shareApp: 'instagram',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    shareApp: 'facebook',
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    shareApp: 'twitter',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    shareApp: 'whatsapp',
  },
];

export default function AchievementShareModal({ 
  visible, 
  onClose, 
  achievementType, 
  achievementData 
}: AchievementShareModalProps) {
  const { themeColor } = useDynamicThemeColor();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [shareAnimation] = useState(new Animated.Value(0));

  // Get enabled platforms from user preferences (for now, all are enabled)
  const enabledPlatforms = SOCIAL_PLATFORMS; // TODO: Filter based on user preferences

  const generateAchievementContent = (): ShareContent => {
    switch (achievementType) {
      case 'workout_complete':
        return generateShareContent('workout', {
          duration: achievementData.duration,
          exercises: achievementData.workoutName,
          sets: `${achievementData.exercises} exercises`,
        });
      
      case 'personal_record':
        return generateShareContent('personal_record', {
          exercise: achievementData.exercise,
          weight: achievementData.weight,
          reps: achievementData.reps,
        });
      
      case 'progress':
        return generateShareContent('progress', {
          timeframe: achievementData.milestone || 'Recent',
          achievement: achievementData.description,
        });
      
      case 'achievement':
      default:
        return generateShareContent('achievement', {
          description: achievementData.description,
        });
    }
  };

  const getAchievementIcon = () => {
    switch (achievementType) {
      case 'workout_complete':
        return 'dumbbell';
      case 'personal_record':
        return 'trophy';
      case 'progress':
        return 'chart-line';
      case 'achievement':
      default:
        return 'medal';
    }
  };

  const getAchievementColor = () => {
    switch (achievementType) {
      case 'workout_complete':
        return '#4CAF50';
      case 'personal_record':
        return '#FFD700';
      case 'progress':
        return '#2196F3';
      case 'achievement':
      default:
        return '#FF6B35';
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleShare = async () => {
    if (selectedPlatforms.length === 0) {
      Alert.alert('Select Platform', 'Please select at least one platform to share to.');
      return;
    }

    setIsSharing(true);
    
    // Start animation
    Animated.spring(shareAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    try {
      const content = generateAchievementContent();
      
      // Add custom message if provided
      if (achievementData.customMessage) {
        content.message = achievementData.customMessage;
      }
      
      // Add image if provided
      if (achievementData.imageUri) {
        content.imageUri = achievementData.imageUri;
      }

      // Share to each selected platform
      const sharePromises = selectedPlatforms.map(async (platformId) => {
        const platform = enabledPlatforms.find(p => p.id === platformId);
        if (!platform) return false;

        try {
          return await shareToSocialMedia(content, { 
            platform: platform.shareApp as any,
            includeAppUrl: true 
          });
        } catch (error) {
          console.error(`Failed to share to ${platform.name}:`, error);
          return false;
        }
      });

      const results = await Promise.all(sharePromises);
      const successCount = results.filter(Boolean).length;

      if (successCount > 0) {
        Alert.alert(
          'Success!', 
          `Successfully shared to ${successCount} platform${successCount > 1 ? 's' : ''}!`,
          [{ text: 'Great!', onPress: onClose }]
        );
      } else {
        Alert.alert('Share Failed', 'Unable to share to the selected platforms. Please try again.');
      }
    } catch (error) {
      console.error('Error sharing achievement:', error);
      Alert.alert('Error', 'Something went wrong while sharing. Please try again.');
    } finally {
      setIsSharing(false);
      shareAnimation.setValue(0);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ThemedView style={styles.container}>
          {/* Achievement Header */}
          <View style={[styles.header, { backgroundColor: getAchievementColor() }]}>
            <View style={styles.achievementIcon}>
              <FontAwesome5 
                name={getAchievementIcon()} 
                size={32} 
                color="white" 
              />
            </View>
            <ThemedText style={styles.headerTitle}>
              {achievementData.title}
            </ThemedText>
            <ThemedText style={styles.headerDescription}>
              {achievementData.description}
            </ThemedText>
          </View>

          {/* Share Question */}
          <View style={styles.content}>
            <ThemedText style={styles.shareQuestion}>
              Would you like to share your achievement?
            </ThemedText>
            
            <ThemedText style={styles.shareSubtext}>
              Choose the platforms where you'd like to share this accomplishment
            </ThemedText>

            {/* Platform Selection */}
            <View style={styles.platformsContainer}>
              {enabledPlatforms.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
                
                return (
                  <TouchableOpacity
                    key={platform.id}
                    style={[
                      styles.platformButton,
                      isSelected && { 
                        backgroundColor: `${platform.color}15`,
                        borderColor: platform.color,
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => togglePlatform(platform.id)}
                  >
                    <View style={[styles.platformIcon, { backgroundColor: platform.color }]}>
                      <FontAwesome5 
                        name={platform.icon} 
                        size={20} 
                        color="white" 
                      />
                    </View>
                    <ThemedText style={[
                      styles.platformName,
                      isSelected && { color: platform.color, fontWeight: '600' }
                    ]}>
                      {platform.name}
                    </ThemedText>
                    {isSelected && (
                      <FontAwesome5 
                        name="check-circle" 
                        size={16} 
                        color={platform.color} 
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Preview Message */}
            {selectedPlatforms.length > 0 && (
              <View style={styles.previewContainer}>
                <ThemedText style={styles.previewLabel}>Preview:</ThemedText>
                <View style={styles.previewMessage}>
                  <ThemedText style={styles.previewText}>
                    {generateAchievementContent().message}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}
              disabled={isSharing}
            >
              <ThemedText style={styles.skipButtonText}>
                Skip
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.shareButton, 
                { backgroundColor: themeColor },
                selectedPlatforms.length === 0 && styles.shareButtonDisabled
              ]} 
              onPress={handleShare}
              disabled={selectedPlatforms.length === 0 || isSharing}
            >
              {isSharing ? (
                <Animated.View style={{
                  transform: [{ 
                    rotate: shareAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}>
                  <FontAwesome5 name="spinner" size={16} color="white" />
                </Animated.View>
              ) : (
                <FontAwesome5 name="share-alt" size={16} color="white" />
              )}
              <ThemedText style={styles.shareButtonText}>
                {isSharing ? 'Sharing...' : `Share${selectedPlatforms.length > 1 ? ` (${selectedPlatforms.length})` : ''}`}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    padding: 30,
    alignItems: 'center',
  },
  achievementIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    padding: 25,
  },
  shareQuestion: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  shareSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 25,
  },
  platformsContainer: {
    marginBottom: 20,
  },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  platformIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  platformName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  previewContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  previewMessage: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
  shareButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

// Helper function to trigger the achievement share modal
export const showAchievementShare = (
  achievementType: AchievementShareModalProps['achievementType'],
  achievementData: AchievementShareModalProps['achievementData']
) => {
  // This would typically be managed by a global state or context
  // For now, return the props that can be used to show the modal
  return {
    achievementType,
    achievementData,
  };
};
