import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View
} from 'react-native';
import Share, { Social } from 'react-native-share';
import { useAuth } from '../contexts/AuthContext';
import { useColorScheme } from '../hooks/useColorScheme';
import { useDynamicThemeColor } from '../hooks/useThemeColor';
import {
    generateShareContent as generateShareContentUtil
} from '../utils/socialSharing';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

// Complete the auth session when returning to the app
WebBrowser.maybeCompleteAuthSession();

interface SocialSharingModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SocialConnection {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  description: string;
  shareApp?: string; // For react-native-share social app identifier
}

export default function SocialSharingModal({ visible, onClose }: SocialSharingModalProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { themeColor } = useDynamicThemeColor();
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'instagram',
      color: '#E4405F',
      connected: true, // Always available for simple sharing
      description: 'Share workout photos and progress updates',
      shareApp: 'instagram',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
      connected: true, // Always available for simple sharing
      description: 'Share achievements with friends and family',
      shareApp: 'facebook',
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'twitter',
      color: '#1DA1F2',
      connected: true, // Always available for simple sharing
      description: 'Tweet your fitness milestones',
      shareApp: 'twitter',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'whatsapp',
      color: '#25D366',
      connected: true, // Always available for simple sharing
      description: 'Share with friends and family',
      shareApp: 'whatsapp',
    },
  ]);

  const [autoShare, setAutoShare] = useState(false);
  const [shareAchievements, setShareAchievements] = useState(true);
  const [shareWorkouts, setShareWorkouts] = useState(false);
  const [shareProgress, setShareProgress] = useState(false);

  // Load user's social sharing preferences
  useEffect(() => {
    if (user && visible) {
      // TODO: Load user's social sharing preferences from Firestore
      // For now, we'll use default values
      console.log('Loading social sharing preferences for user:', user.uid);
    }
  }, [user, visible]);

  // Simple sharing function using react-native-share
  const shareToSocialMedia = async (platform: SocialConnection, content: string, imageUri?: string) => {
    try {
      let shareOptions: any = {
        title: 'Maximum Fit - Fitness Achievement',
        message: content,
        url: 'https://getmaximumfit.com',
      };

      // Add image if provided
      if (imageUri) {
        shareOptions.url = imageUri;
        shareOptions.type = 'image/jpeg';
      }

      if (platform.shareApp) {
        // Use platform-specific sharing
        let socialPlatform: Social;
        
        switch (platform.shareApp) {
          case 'instagram':
            socialPlatform = Social.Instagram;
            // For Instagram, we need an image
            if (!imageUri) {
              Alert.alert(
                'Image Required',
                'Instagram requires an image to share. Would you like to take a screenshot of your achievement?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Take Screenshot', onPress: () => takeAchievementScreenshot(content) }
                ]
              );
              return;
            }
            break;
          case 'facebook':
            socialPlatform = Social.Facebook;
            break;
          case 'twitter':
            socialPlatform = Social.Twitter;
            break;
          case 'whatsapp':
            socialPlatform = Social.Whatsapp;
            break;
          default:
            // Fallback to generic sharing
            await Share.open(shareOptions);
            return;
        }

        shareOptions.social = socialPlatform;
        
        try {
          const result = await Share.shareSingle(shareOptions);
          console.log(`Share result for ${platform.name}:`, result);
          Alert.alert('Success!', `Successfully shared to ${platform.name}!`);
        } catch (shareError: any) {
          console.log(`Platform-specific share failed, trying generic share:`, shareError);
          // If platform-specific sharing fails, fall back to generic share
          delete shareOptions.social;
          await Share.open(shareOptions);
        }
      } else {
        // Use generic sharing (will show system share sheet)
        const result = await Share.open(shareOptions);
        console.log('Share result:', result);
      }
    } catch (error: any) {
      if (error.message !== 'User did not share' && error.message !== 'User cancelled') {
        console.error(`Error sharing to ${platform.name}:`, error);
        Alert.alert('Share Error', `Failed to share to ${platform.name}. Please try again.`);
      }
    }
  };

  // Function to create a screenshot of achievement (placeholder)
  const takeAchievementScreenshot = async (content: string) => {
    // TODO: Implement screenshot functionality
    // For now, we'll just show the generic share
    Alert.alert('Screenshot Feature', 'Screenshot functionality will be implemented soon. Using text share for now.');
    
    const shareOptions = {
      title: 'Maximum Fit - Achievement',
      message: content,
      url: 'https://getmaximumfit.com',
    };
    
    try {
      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Share error:', error);
      }
    }
  };

  const testShare = async (connection: SocialConnection) => {
    const testContent = generateShareContentUtil('achievement', { description: 'Testing social sharing functionality!' });
    
    Alert.alert(
      `Test Share to ${connection.name}`,
      'This will test sharing to verify the platform works.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: () => shareToSocialMedia(connection, testContent.message),
        },
      ]
    );
  };

  const handleConnectionToggle = async (connectionId: string) => {
    const connection = socialConnections.find(conn => conn.id === connectionId);
    if (!connection) return;

    // For simple sharing, we just toggle the preference
    // No actual authentication needed
    setSocialConnections(prev => 
      prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, connected: !conn.connected }
          : conn
      )
    );

    const newState = !connection.connected;
    console.log(`${newState ? 'Enabled' : 'Disabled'} ${connection.name} sharing`);
  };

  const handleSaveSettings = async () => {
    try {
      if (!user) return;

      // TODO: Save social sharing preferences to Firestore
      const preferences = {
        autoShare,
        shareAchievements,
        shareWorkouts,
        shareProgress,
        connections: socialConnections.filter(conn => conn.connected).map(conn => conn.id),
      };

      console.log('Saving social sharing preferences:', preferences);
      
      // For now, just show success message
      Alert.alert('Settings Saved', 'Your social sharing preferences have been updated.');
      
    } catch (error) {
      console.error('Error saving social sharing preferences:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Social Sharing
            </ThemedText>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <FontAwesome5 name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Description */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.description}>
                Connect your social accounts to share your fitness journey and achievements with friends and the community.
              </ThemedText>
            </ThemedView>

            {/* Social Connections */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Available Platforms</ThemedText>
              
              <ThemedText style={styles.description}>
                Enable the platforms you'd like to use for sharing your fitness achievements. 
                No account setup required - sharing opens the app or web browser.
              </ThemedText>

              {socialConnections.map((connection) => (
                <View key={connection.id} style={styles.connectionItem}>
                  <View style={[styles.connectionIcon, { backgroundColor: `${connection.color}15` }]}>
                    <FontAwesome5 
                      name={connection.icon} 
                      size={20} 
                      color={connection.color} 
                    />
                  </View>
                  <View style={styles.connectionInfo}>
                    <View style={styles.connectionHeader}>
                      <ThemedText style={styles.connectionName}>
                        {connection.name}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.connectionDescription}>
                      {connection.description}
                    </ThemedText>
                  </View>
                  <View style={styles.connectionActions}>
                    {connection.connected && (
                      <TouchableOpacity
                        style={[styles.testButton, { borderColor: connection.color }]}
                        onPress={() => testShare(connection)}
                      >
                        <ThemedText style={[styles.testButtonText, { color: connection.color }]}>
                          Test
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                    <Switch
                      value={connection.connected}
                      onValueChange={() => handleConnectionToggle(connection.id)}
                      trackColor={{ false: '#E0E0E0', true: `${connection.color}40` }}
                      thumbColor={connection.connected ? connection.color : '#f4f3f4'}
                    />
                  </View>
                </View>
              ))}
            </ThemedView>

            {/* Sharing Preferences */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>What to Share</ThemedText>
              
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <ThemedText style={styles.preferenceName}>Auto Share</ThemedText>
                  <ThemedText style={styles.preferenceDescription}>
                    Automatically share when you complete achievements
                  </ThemedText>
                </View>
                <Switch
                  value={autoShare}
                  onValueChange={setAutoShare}
                  trackColor={{ false: '#E0E0E0', true: `${themeColor}40` }}
                  thumbColor={autoShare ? themeColor : '#f4f3f4'}
                />
              </View>

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <ThemedText style={styles.preferenceName}>Achievements</ThemedText>
                  <ThemedText style={styles.preferenceDescription}>
                    Share when you reach fitness milestones and goals
                  </ThemedText>
                </View>
                <Switch
                  value={shareAchievements}
                  onValueChange={setShareAchievements}
                  trackColor={{ false: '#E0E0E0', true: `${themeColor}40` }}
                  thumbColor={shareAchievements ? themeColor : '#f4f3f4'}
                />
              </View>

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <ThemedText style={styles.preferenceName}>Workouts</ThemedText>
                  <ThemedText style={styles.preferenceDescription}>
                    Share completed workouts and exercise sessions
                  </ThemedText>
                </View>
                <Switch
                  value={shareWorkouts}
                  onValueChange={setShareWorkouts}
                  trackColor={{ false: '#E0E0E0', true: `${themeColor}40` }}
                  thumbColor={shareWorkouts ? themeColor : '#f4f3f4'}
                />
              </View>

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <ThemedText style={styles.preferenceName}>Progress Updates</ThemedText>
                  <ThemedText style={styles.preferenceDescription}>
                    Share weekly or monthly progress summaries
                  </ThemedText>
                </View>
                <Switch
                  value={shareProgress}
                  onValueChange={setShareProgress}
                  trackColor={{ false: '#E0E0E0', true: `${themeColor}40` }}
                  thumbColor={shareProgress ? themeColor : '#f4f3f4'}
                />
              </View>
            </ThemedView>

            {/* Privacy Notice */}
            <ThemedView style={styles.section}>
              <View style={styles.privacyNotice}>
                <FontAwesome5 name="shield-alt" size={20} color="#666" style={styles.privacyIcon} />
                <View style={styles.privacyText}>
                  <ThemedText style={styles.privacyTitle}>Privacy & Control</ThemedText>
                  <ThemedText style={styles.privacyDescription}>
                    You have full control over what gets shared. You can review and edit any post before it's published.
                  </ThemedText>
                </View>
              </View>
            </ThemedView>

            {/* Quick Share Test */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Quick Share Test</ThemedText>
              <ThemedText style={styles.description}>
                Test how sharing will work with your connected accounts.
              </ThemedText>
              <View style={styles.quickShareButtons}>
                <TouchableOpacity
                  style={[styles.quickShareButton, { backgroundColor: `${themeColor}15`, borderColor: themeColor }]}
                  onPress={() => {
                    const content = generateShareContentUtil('workout', { 
                      duration: '45-minute',
                      exercises: 'Multiple exercises',
                      sets: 'great'
                    });
                    Alert.alert(
                      'Share Test Workout',
                      content.message,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Share',
                          onPress: async () => {
                            try {
                              await Share.open({
                                title: content.title,
                                message: content.message,
                                url: 'https://getmaximumfit.com',
                              });
                            } catch (error: any) {
                              if (error.message !== 'User did not share') {
                                console.error('Share error:', error);
                              }
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <FontAwesome5 name="dumbbell" size={16} color={themeColor} />
                  <ThemedText style={[styles.quickShareButtonText, { color: themeColor }]}>
                    Test Workout Share
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickShareButton, { backgroundColor: `${themeColor}15`, borderColor: themeColor }]}
                  onPress={() => {
                    const content = generateShareContentUtil('achievement', { 
                      description: 'Testing achievement sharing functionality!'
                    });
                    Alert.alert(
                      'Share Test Achievement',
                      content.message,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Share',
                          onPress: async () => {
                            try {
                              await Share.open({
                                title: content.title,
                                message: content.message,
                                url: 'https://getmaximumfit.com',
                              });
                            } catch (error: any) {
                              if (error.message !== 'User did not share') {
                                console.error('Share error:', error);
                              }
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <FontAwesome5 name="trophy" size={16} color={themeColor} />
                  <ThemedText style={[styles.quickShareButtonText, { color: themeColor }]}>
                    Test Achievement Share
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: themeColor }]} 
              onPress={handleSaveSettings}
            >
              <ThemedText style={styles.saveButtonText}>Save Settings</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 15,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.8,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  connectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  connectionDescription: {
    fontSize: 14,
    opacity: 0.6,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  preferenceInfo: {
    flex: 1,
  },
  preferenceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 14,
    opacity: 0.6,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
  },
  privacyIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 12,
    opacity: 0.7,
    lineHeight: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickShareButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  quickShareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  quickShareButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  setupNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF4E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  setupIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  setupText: {
    flex: 1,
  },
  setupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    marginBottom: 4,
  },
  setupDescription: {
    fontSize: 12,
    opacity: 0.8,
    lineHeight: 16,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  configRequired: {
    fontSize: 12,
    color: '#FF6B35',
    fontStyle: 'italic',
    marginTop: 2,
  },
});

// Export utility functions for use in other parts of the app
export const shareWorkoutAchievement = async (achievementData: {
  title: string;
  description: string;
  customMessage?: string;
}) => {
  try {
    const message = achievementData.customMessage || 
      `🏆 ${achievementData.title}\n\n${achievementData.description}\n\n#MaximumFit #Fitness #Achievement`;
    
    await Share.open({
      title: 'Maximum Fit - Achievement Unlocked',
      message,
      url: 'https://getmaximumfit.com',
    });
  } catch (error: any) {
    if (error.message !== 'User did not share') {
      console.error('Error sharing achievement:', error);
      throw error;
    }
  }
};

export const shareWorkoutComplete = async (workoutData: {
  name: string;
  duration: string;
  exercises: number;
  customMessage?: string;
}) => {
  try {
    const message = workoutData.customMessage || 
      `💪 Just completed "${workoutData.name}"!\n\n⏱️ Duration: ${workoutData.duration}\n🏋️‍♂️ Exercises: ${workoutData.exercises}\n\nFeeling stronger every day! #MaximumFit #Workout #Fitness`;
    
    await Share.open({
      title: 'Maximum Fit - Workout Complete',
      message,
      url: 'https://getmaximumfit.com',
    });
  } catch (error: any) {
    if (error.message !== 'User did not share') {
      console.error('Error sharing workout:', error);
      throw error;
    }
  }
};

export const shareProgressUpdate = async (progressData: {
  period: string;
  achievements: string[];
  customMessage?: string;
}) => {
  try {
    const achievementsList = progressData.achievements.map(achievement => `• ${achievement}`).join('\n');
    const message = progressData.customMessage || 
      `📈 ${progressData.period} Progress Update!\n\n${achievementsList}\n\nConsistency is key! 🚀 #MaximumFit #Progress #FitnessJourney`;
    
    await Share.open({
      title: 'Maximum Fit - Progress Update',
      message,
      url: 'https://getmaximumfit.com',
    });
  } catch (error: any) {
    if (error.message !== 'User did not share') {
      console.error('Error sharing progress:', error);
      throw error;
    }
  }
};
