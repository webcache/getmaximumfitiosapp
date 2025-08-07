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
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
      connected: false,
      description: 'Share achievements with friends and family',
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'twitter',
      color: '#1DA1F2',
      connected: false,
      description: 'Tweet your fitness milestones',
    },
    {
      id: 'strava',
      name: 'Strava',
      icon: 'running',
      color: '#FC4C02',
      connected: false,
      description: 'Share workouts with the fitness community',
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

  const handleConnectionToggle = (connectionId: string) => {
    setSocialConnections(prev => 
      prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, connected: !conn.connected }
          : conn
      )
    );

    // Show connection/disconnection flow
    const connection = socialConnections.find(conn => conn.id === connectionId);
    if (connection) {
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
                // TODO: Implement actual disconnection logic
                console.log(`Disconnecting ${connection.name}`);
              },
            },
          ]
        );
      } else {
        // Connecting
        Alert.alert(
          `Connect ${connection.name}`,
          `This will redirect you to ${connection.name} to authorize the connection.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => {
                // TODO: Implement actual connection logic (OAuth flow)
                console.log(`Connecting to ${connection.name}`);
                // For now, just toggle the state
                setSocialConnections(prev => 
                  prev.map(conn => 
                    conn.id === connectionId 
                      ? { ...conn, connected: true }
                      : conn
                  )
                );
              },
            },
          ]
        );
      }
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
                  <Switch
                    value={connection.connected}
                    onValueChange={() => handleConnectionToggle(connection.id)}
                    trackColor={{ false: '#E0E0E0', true: `${connection.color}40` }}
                    thumbColor={connection.connected ? connection.color : '#f4f3f4'}
                  />
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
});
