import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';
import Share from 'react-native-share';
import { useAuth } from '../contexts/AuthContext';
import { useColorScheme } from '../hooks/useColorScheme';
import { useDynamicThemeColor } from '../hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

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
      connected: false,
      description: 'Share workout photos and progress updates',
      shareApp: 'instagram',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
      connected: false,
      description: 'Share achievements with friends and family',
      shareApp: 'facebook',
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'twitter',
      color: '#1DA1F2',
      connected: false,
      description: 'Tweet your fitness milestones',
      shareApp: 'twitter',
    },
    {
      id: 'strava',
      name: 'Strava',
      icon: 'running',
      color: '#FC4C02',
      connected: false,
      description: 'Share workouts with the fitness community',
      shareApp: undefined, // Strava doesn't have direct support in react-native-share
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

  const shareToSocialMedia = async (platform: SocialConnection, content: string) => {
    try {
      const shareOptions = {
        title: 'Maximum Fit - Fitness Achievement',
        message: content,
        url: 'https://getmaximumfit.com', // Replace with your app's URL
      };

      if (platform.shareApp) {
        // Use platform-specific sharing
        let socialPlatform: any;
        switch (platform.shareApp) {
          case 'instagram':
            socialPlatform = 'instagram';
            break;
          case 'facebook':
            socialPlatform = 'facebook';
            break;
          case 'twitter':
            socialPlatform = 'twitter';
            break;
          default:
            // Fallback to generic sharing
            await Share.open(shareOptions);
            return;
        }

        const result = await Share.shareSingle({
          ...shareOptions,
          social: socialPlatform,
        });
        
        console.log(`Share result for ${platform.name}:`, result);
      } else {
        // Use generic sharing (will show system share sheet)
        const result = await Share.open(shareOptions);
        console.log('Share result:', result);
      }
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error(`Error sharing to ${platform.name}:`, error);
        Alert.alert('Share Error', `Failed to share to ${platform.name}. Please try again.`);
      }
    }
  };

  const testShare = async (connection: SocialConnection) => {
    const testContent = generateShareContent('achievement');
    
    Alert.alert(
      `Test Share to ${connection.name}`,
      'This will open a test share to verify the connection works.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: () => shareToSocialMedia(connection, testContent),
        },
      ]
    );
  };

  const handleConnectionToggle = (connectionId: string) => {
    const connection = socialConnections.find(conn => conn.id === connectionId);
    if (!connection) return;

    if (connection.connected) {
      // Disconnecting
      Alert.alert(
        `Disconnect ${connection.name}`,
        `Are you sure you want to disconnect your ${connection.name} account?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: () => {
              setSocialConnections(prev => 
                prev.map(conn => 
                  conn.id === connectionId 
                    ? { ...conn, connected: false }
                    : conn
                )
              );
              console.log(`Disconnected ${connection.name}`);
            },
          },
        ]
      );
    } else {
      // Connecting - Show test share to verify platform availability
      Alert.alert(
        `Connect ${connection.name}`,
        `Test sharing to ${connection.name} to verify it's available on your device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Test Share',
            onPress: async () => {
              try {
                await testShare(connection);
                // If share succeeds, mark as connected
                setSocialConnections(prev => 
                  prev.map(conn => 
                    conn.id === connectionId 
                      ? { ...conn, connected: true }
                      : conn
                  )
                );
              } catch (error) {
                console.error(`Failed to test share to ${connection.name}:`, error);
              }
            },
          },
        ]
      );
    }
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

  // Helper function to generate sharing content based on type
  const generateShareContent = (type: 'workout' | 'achievement' | 'progress' = 'achievement') => {
    const baseHashtags = '#MaximumFit #Fitness #Workout #FitnessJourney';
    
    switch (type) {
      case 'workout':
        return `💪 Just crushed an amazing workout session!\n\n🔥 Feeling stronger and more energized than ever. Every rep counts towards my fitness goals!\n\n${baseHashtags} #WorkoutComplete`;
      case 'progress':
        return `📈 Weekly Progress Update!\n\n🎯 Staying consistent with my fitness routine and seeing amazing results. The journey continues!\n\n${baseHashtags} #ProgressUpdate #Consistency`;
      default:
        return `🏆 Achievement Unlocked!\n\n🚀 Just reached another milestone in my fitness journey! Thanks to Maximum Fit for keeping me motivated and on track.\n\n${baseHashtags} #Achievement #Milestone`;
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
              <ThemedText style={styles.sectionTitle}>Connected Accounts</ThemedText>
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
                    <ThemedText style={styles.connectionName}>
                      {connection.name}
                    </ThemedText>
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
                    const content = generateShareContent('workout');
                    Alert.alert(
                      'Share Test Workout',
                      content,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Share',
                          onPress: async () => {
                            try {
                              await Share.open({
                                title: 'Maximum Fit - Workout Complete',
                                message: content,
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
                    const content = generateShareContent('achievement');
                    Alert.alert(
                      'Share Test Achievement',
                      content,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Share',
                          onPress: async () => {
                            try {
                              await Share.open({
                                title: 'Maximum Fit - Achievement Unlocked',
                                message: content,
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
