import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
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
import { captureRef } from 'react-native-view-shot';

import { useAuth } from '../contexts/AuthContext';
import { useColorScheme } from '../hooks/useColorScheme';
import { useFeatureGating } from '../hooks/useFeatureGating';
import { useDynamicThemeColor } from '../hooks/useThemeColor';
import {
  defaultSocialConnections,
  getSocialConnectionsWithPreferences,
  getSocialSharingPreferences,
  saveSocialSharingPreferences,
  SocialConnection,
  SocialSharingPreferences
} from '../services/socialSharingService';
import {
  getAvailableContentTypes,
  getAvailablePlatforms,
  shareWithFeatureGating
} from '../utils/gatedSocialSharing';
import { shareImageFile } from '../utils/screenshotSharing';
import {
  generateShareContent as generateShareContentUtil,
  shareToSocialMedia as shareToSocialMediaUtil
} from '../utils/socialSharing';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

// Complete the auth session when returning to the app
WebBrowser.maybeCompleteAuthSession();

interface SocialSharingModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SocialSharingModal({ visible, onClose }: SocialSharingModalProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { themeColor } = useDynamicThemeColor();
  const { hasFeature, currentTier } = useFeatureGating();
  
  // State for social connections
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>(defaultSocialConnections);
  
  // State for sharing preferences
  const [autoShare, setAutoShare] = useState(false);
  const [shareAchievements, setShareAchievements] = useState(true);
  const [shareWorkouts, setShareWorkouts] = useState(false);
  const [shareProgress, setShareProgress] = useState(false);
  
  // State for visual sharing
  const [showVisualCard, setShowVisualCard] = useState(false);
  const [achievementContent, setAchievementContent] = useState<string>('');
  const cardRef = useRef<View>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Feature gating: Get available platforms and content types
  const availablePlatforms = getAvailablePlatforms(hasFeature);
  const availableContentTypes = getAvailableContentTypes(hasFeature);

  // Filter social connections based on available platforms
  const filteredSocialConnections = socialConnections.filter(connection => 
    availablePlatforms.includes(connection.id)
  );

  // Load user's social sharing preferences from Firestore
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user || !visible) return;
      
      try {
        setIsLoading(true);
        console.log('🔄 Loading social sharing preferences for user:', user.uid);
        
        const preferences = await getSocialSharingPreferences(user.uid);
        
        // Update state with loaded preferences
        setAutoShare(preferences.autoShare);
        setShareAchievements(preferences.shareAchievements);
        setShareWorkouts(preferences.shareWorkouts);
        setShareProgress(preferences.shareProgress);
        
        // Update social connections with user preferences
        const connectionsWithPrefs = getSocialConnectionsWithPreferences(preferences);
        setSocialConnections(connectionsWithPrefs);
        
        console.log('✅ Loaded social sharing preferences successfully');
      } catch (error) {
        console.error('❌ Error loading social sharing preferences:', error);
        Alert.alert('Error', 'Failed to load your social sharing preferences. Using defaults.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user, visible]);

  // Enhanced sharing function with feature gating and visual content
  const shareToSocialMedia = async (platform: SocialConnection, content: string, imageUri?: string) => {
    try {
      // Determine content type based on current context
      let contentType: 'workout' | 'achievement' | 'progress' | 'personal_record' = 'workout';
      
      // Check if this is achievement content (and if user has feature access)
      if (content.toLowerCase().includes('achievement') && hasFeature('achievementSharing')) {
        contentType = 'achievement';
      } else if (content.toLowerCase().includes('progress') && hasFeature('advancedSocialSharing')) {
        contentType = 'progress';
      } else if (content.toLowerCase().includes('record') && hasFeature('achievementSharing')) {
        contentType = 'personal_record';
      }

      // Check if user can share this content type
      if (!availableContentTypes.includes(contentType)) {
        Alert.alert(
          'Premium Feature Required',
          `${contentType} sharing requires a Pro subscription. Upgrade to share achievements and progress!`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade to Pro', onPress: () => {
              // Close modal and navigate to upgrade
              onClose();
              // TODO: Navigate to premium upgrade screen
            }}
          ]
        );
        return;
      }

      // Create share content
      const shareContent = {
        type: contentType,
        title: 'Get Maximum Fit - Fitness Achievement',
        message: content,
        imageUri,
      };

      // For Instagram and Facebook (premium platforms), offer story sharing options
      if ((platform.id === 'instagram' || platform.id === 'facebook') && hasFeature('advancedSocialSharing')) {
        Alert.alert(
          `Share to ${platform.name}`,
          'How would you like to share?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Stories (Visual)',
              onPress: async () => {
                // Create visual achievement card and share it
                await takeAchievementScreenshot(content);
              },
            },
            {
              text: 'Regular Post',
              onPress: async () => {
                const success = await shareWithFeatureGating(
                  shareContent,
                  { 
                    platform: platform.id as 'instagram' | 'facebook',
                    onUpgradeRequired: () => {
                      Alert.alert(
                        'Premium Feature',
                        'Advanced social sharing requires Pro subscription!',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Upgrade', onPress: () => onClose() }
                        ]
                      );
                    }
                  },
                  hasFeature
                );
                
                if (success) {
                  Alert.alert('Success!', `Successfully shared to ${platform.name}!`);
                } else {
                  Alert.alert('Share Cancelled', 'Sharing was cancelled.');
                }
              },
            },
            {
              text: 'Visual Achievement Card',
              onPress: async () => {
                // Create and share visual achievement card
                await takeAchievementScreenshot(content);
              },
            },
          ]
        );
      } else {
        // For other platforms or freemium users, offer simplified options
        const canUseVisualCards = hasFeature('advancedSocialSharing');
        
        const options = [
          { text: 'Cancel', style: 'cancel' as const },
          {
            text: 'Share',
            onPress: async () => {
              const success = await shareWithFeatureGating(
                shareContent,
                { 
                  platform: platform.id as 'twitter' | 'whatsapp' | 'generic',
                  fallbackToBasic: true,
                  onUpgradeRequired: () => {
                    Alert.alert(
                      'Premium Feature',
                      'Advanced social sharing features require Pro subscription!',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Upgrade', onPress: () => onClose() }
                      ]
                    );
                  }
                },
                hasFeature
              );
              
              if (success) {
                Alert.alert('Success!', `Successfully shared to ${platform.name}!`);
              } else {
                Alert.alert('Share Cancelled', 'Sharing was cancelled.');
              }
            },
          }
        ];

        // Add visual card option for Pro users
        if (canUseVisualCards) {
          options.splice(1, 0, {
            text: 'Visual Achievement Card',
            onPress: async () => {
              await takeAchievementScreenshot(content);
            },
          });
        }

        Alert.alert(
          `Share to ${platform.name}`,
          canUseVisualCards ? 'Choose sharing format:' : 'Share your achievement:',
          options
        );
      }
    } catch (error: any) {
      console.error(`Error sharing to ${platform.name}:`, error);
      Alert.alert('Share Error', `Failed to share to ${platform.name}. Please try again.`);
    }
  };

  // Function to create a screenshot of achievement
  const takeAchievementScreenshot = async (content: string) => {
    try {
      // Truncate content if too long to ensure it fits in the card
      const maxLength = 120; // Maximum characters for card display
      const processedContent = content.length > maxLength 
        ? content.substring(0, maxLength).trim() + '...'
        : content;
      
      // Set the achievement content and show the visual card
      setAchievementContent(processedContent);
      setShowVisualCard(true);
      
      // Wait a moment for the card to render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!cardRef.current) {
        Alert.alert('Error', 'Unable to capture achievement card');
        setShowVisualCard(false);
        return;
      }

      // Capture the visual achievement card
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

      // Hide the visual card
      setShowVisualCard(false);

      // Share the image
      const shareSuccess = await shareImageFile(
        filePath, 
        'generic',
        `🏆 Achievement Unlocked!\n\n${content}\n\n#GetMaximumFit #Achievement #Fitness`
      );

      if (shareSuccess) {
        console.log('Achievement card shared successfully');
      }

      // Clean up after a delay
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        } catch (error) {
          console.warn('Failed to cleanup temporary file:', error);
        }
      }, 5000);

    } catch (error: any) {
      console.error('Error capturing achievement card:', error);
      setShowVisualCard(false);
      Alert.alert('Share Error', 'Unable to create achievement card. Please try again.');
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
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save preferences.');
      return;
    }

    try {
      setIsSaving(true);
      console.log('💾 Saving social sharing preferences...');

      const preferences: Omit<SocialSharingPreferences, 'createdAt' | 'updatedAt'> = {
        autoShare,
        shareAchievements,
        shareWorkouts,
        shareProgress,
        connectedPlatforms: socialConnections.filter(conn => conn.connected).map(conn => conn.id),
      };

      const success = await saveSocialSharingPreferences(user.uid, preferences);
      
      if (success) {
        Alert.alert('Success', 'Your social sharing preferences have been saved!');
        console.log('✅ Social sharing preferences saved successfully');
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('❌ Error saving social sharing preferences:', error);
      Alert.alert(
        'Save Failed', 
        'Failed to save your preferences. Please check your internet connection and try again.'
      );
    } finally {
      setIsSaving(false);
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
            {isLoading ? (
              <ThemedView style={styles.section}>
                <View style={styles.loadingContainer}>
                  <ThemedText style={styles.loadingText}>Loading your preferences...</ThemedText>
                </View>
              </ThemedView>
            ) : (
              <>
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
                Enable the platforms you&apos;d like to use for sharing your fitness achievements. 
                No account setup required - sharing opens the app or web browser.
              </ThemedText>

              {/* Free tier indicator */}
              {currentTier === 'freemium' && (
                <ThemedView style={[styles.tierNotice, { borderColor: themeColor + '30' }]}>
                  <FontAwesome5 name="crown" size={16} color="#FFD700" />
                  <ThemedText style={styles.tierNoticeText}>
                    Free plan includes basic sharing. Upgrade to Pro for Instagram, Facebook, and advanced features!
                  </ThemedText>
                </ThemedView>
              )}

              {filteredSocialConnections.map((connection) => {
                const isPremiumPlatform = !availablePlatforms.includes(connection.id);
                const isLocked = isPremiumPlatform && currentTier === 'freemium';
                
                return (
                  <View key={connection.id} style={[
                    styles.connectionItem,
                    isLocked && styles.lockedConnection
                  ]}>
                    <View style={[styles.connectionIcon, { backgroundColor: `${connection.color}15` }]}>
                      <FontAwesome5 
                        name={connection.icon} 
                        size={20} 
                        color={isLocked ? '#999' : connection.color} 
                      />
                      {isLocked && (
                        <View style={styles.lockOverlay}>
                          <FontAwesome5 name="lock" size={12} color="#999" />
                        </View>
                      )}
                    </View>
                    <View style={styles.connectionInfo}>
                      <View style={styles.connectionHeader}>
                        <ThemedText style={[
                          styles.connectionName,
                          isLocked && styles.lockedText
                        ]}>
                          {connection.name}
                          {isLocked && (
                            <ThemedText style={styles.proBadge}> 🔒 PRO</ThemedText>
                          )}
                        </ThemedText>
                      </View>
                      <ThemedText style={[
                        styles.connectionDescription,
                        isLocked && styles.lockedText
                      ]}>
                        {isLocked 
                          ? 'Upgrade to Pro to share on this platform' 
                          : connection.description
                        }
                      </ThemedText>
                    </View>
                    <View style={styles.connectionActions}>
                      {connection.connected && __DEV__ && !isLocked && (
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
                        value={connection.connected && !isLocked}
                        onValueChange={(value) => {
                          if (isLocked && value) {
                            Alert.alert(
                              'Premium Feature',
                              `${connection.name} sharing requires Pro subscription. Upgrade to unlock all social platforms!`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Upgrade to Pro', onPress: () => onClose() }
                              ]
                            );
                            return;
                          }
                          handleConnectionToggle(connection.id);
                        }}
                        disabled={isLocked}
                        trackColor={{ false: '#E0E0E0', true: `${connection.color}40` }}
                        thumbColor={connection.connected && !isLocked ? connection.color : '#f4f3f4'}
                      />
                    </View>
                  </View>
                );
              })}

              {/* Show locked platforms for freemium users */}
              {currentTier === 'freemium' && (
                <>
                  {socialConnections
                    .filter(connection => !availablePlatforms.includes(connection.id))
                    .map((connection) => (
                      <View key={connection.id} style={[styles.connectionItem, styles.lockedConnection]}>
                        <View style={[styles.connectionIcon, { backgroundColor: '#f5f5f5' }]}>
                          <FontAwesome5 
                            name={connection.icon} 
                            size={20} 
                            color="#999" 
                          />
                          <View style={styles.lockOverlay}>
                            <FontAwesome5 name="lock" size={12} color="#999" />
                          </View>
                        </View>
                        <View style={styles.connectionInfo}>
                          <View style={styles.connectionHeader}>
                            <ThemedText style={[styles.connectionName, styles.lockedText]}>
                              {connection.name}
                              <ThemedText style={styles.proBadge}> 🔒 PRO</ThemedText>
                            </ThemedText>
                          </View>
                          <ThemedText style={[styles.connectionDescription, styles.lockedText]}>
                            Upgrade to Pro to share on this platform
                          </ThemedText>
                        </View>
                        <View style={styles.connectionActions}>
                          <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={() => {
                              Alert.alert(
                                'Premium Feature',
                                `${connection.name} sharing requires Pro subscription. Upgrade to unlock all social platforms!`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Upgrade to Pro', onPress: () => onClose() }
                                ]
                              );
                            }}
                          >
                            <ThemedText style={styles.upgradeButtonText}>Upgrade</ThemedText>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                </>
              )}
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

              <View style={[
                styles.preferenceItem,
                !hasFeature('achievementSharing') && styles.lockedConnection
              ]}>
                <View style={styles.preferenceInfo}>
                  <ThemedText style={[
                    styles.preferenceName,
                    !hasFeature('achievementSharing') && styles.lockedText
                  ]}>
                    Achievements
                    {!hasFeature('achievementSharing') && (
                      <ThemedText style={styles.proBadge}> 🔒 PRO</ThemedText>
                    )}
                  </ThemedText>
                  <ThemedText style={[
                    styles.preferenceDescription,
                    !hasFeature('achievementSharing') && styles.lockedText
                  ]}>
                    {hasFeature('achievementSharing')
                      ? 'Share when you reach fitness milestones and goals'
                      : 'Upgrade to Pro to share achievements'
                    }
                  </ThemedText>
                </View>
                <Switch
                  value={shareAchievements && hasFeature('achievementSharing')}
                  onValueChange={(value) => {
                    if (!hasFeature('achievementSharing') && value) {
                      Alert.alert(
                        'Premium Feature',
                        'Achievement sharing requires Pro subscription. Upgrade to share your fitness milestones!',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Upgrade to Pro', onPress: () => onClose() }
                        ]
                      );
                      return;
                    }
                    setShareAchievements(value);
                  }}
                  disabled={!hasFeature('achievementSharing')}
                  trackColor={{ false: '#E0E0E0', true: `${themeColor}40` }}
                  thumbColor={shareAchievements && hasFeature('achievementSharing') ? themeColor : '#f4f3f4'}
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

              <View style={[
                styles.preferenceItem,
                !hasFeature('advancedSocialSharing') && styles.lockedConnection
              ]}>
                <View style={styles.preferenceInfo}>
                  <ThemedText style={[
                    styles.preferenceName,
                    !hasFeature('advancedSocialSharing') && styles.lockedText
                  ]}>
                    Progress Updates
                    {!hasFeature('advancedSocialSharing') && (
                      <ThemedText style={styles.proBadge}> 🔒 PRO</ThemedText>
                    )}
                  </ThemedText>
                  <ThemedText style={[
                    styles.preferenceDescription,
                    !hasFeature('advancedSocialSharing') && styles.lockedText
                  ]}>
                    {hasFeature('advancedSocialSharing')
                      ? 'Share weekly or monthly progress summaries'
                      : 'Upgrade to Pro to share progress updates'
                    }
                  </ThemedText>
                </View>
                <Switch
                  value={shareProgress && hasFeature('advancedSocialSharing')}
                  onValueChange={(value) => {
                    if (!hasFeature('advancedSocialSharing') && value) {
                      Alert.alert(
                        'Premium Feature',
                        'Progress sharing requires Pro subscription. Upgrade to share your fitness journey!',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Upgrade to Pro', onPress: () => onClose() }
                        ]
                      );
                      return;
                    }
                    setShareProgress(value);
                  }}
                  disabled={!hasFeature('advancedSocialSharing')}
                  trackColor={{ false: '#E0E0E0', true: `${themeColor}40` }}
                  thumbColor={shareProgress && hasFeature('advancedSocialSharing') ? themeColor : '#f4f3f4'}
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
                    You have full control over what gets shared. You can review and edit any post before it&apos;s published.
                  </ThemedText>
                </View>
              </View>
            </ThemedView>

            {/* Quick Share Test - Development Only */}
            {__DEV__ && (
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
                                await shareToSocialMediaUtil(content);
                              } catch (error: any) {
                                console.error('Share error:', error);
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
                                await shareToSocialMediaUtil(content);
                              } catch (error: any) {
                                console.error('Share error:', error);
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
            )}
            </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[
                styles.saveButton, 
                { backgroundColor: isSaving ? '#ccc' : themeColor },
                isSaving && styles.disabledButton
              ]} 
              onPress={handleSaveSettings}
              disabled={isSaving}
            >
              <ThemedText style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </SafeAreaView>
      
      {/* Hidden Visual Achievement Card for Screenshot Capture */}
      {showVisualCard && (
        <View style={styles.hiddenCard}>
          <View ref={cardRef} style={styles.achievementCard}>
            {/* Gradient Background Effect */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              backgroundColor: '#667eea',
              borderTopLeftRadius: 25,
              borderTopRightRadius: 25,
              opacity: 0.08,
            }} />
            
            <View style={styles.cardHeader}>
              {/* Enhanced Trophy with Glow Effect */}
              <View style={{
                width: 70, // Slightly smaller
                height: 70,
                borderRadius: 35,
                backgroundColor: '#FFD700',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#FFD700',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
                elevation: 10,
                borderWidth: 3,
                borderColor: '#FFF',
              }}>
                <FontAwesome5 name="trophy" size={32} color="#FFFFFF" style={{ // Smaller trophy
                  textShadowColor: 'rgba(0, 0, 0, 0.3)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                }} />
              </View>
              
              <ThemedText style={styles.cardTitle}>Achievement Unlocked!</ThemedText>
              
              {/* Decorative Stars */}
              <View style={{
                flexDirection: 'row',
                marginTop: 8, // Reduced margin
                alignItems: 'center',
              }}>
                <ThemedText style={{ fontSize: 18, color: '#FFD700', marginHorizontal: 4 }}>⭐</ThemedText>
                <ThemedText style={{ fontSize: 14, color: '#FFD700', marginHorizontal: 2 }}>✨</ThemedText>
                <ThemedText style={{ fontSize: 18, color: '#FFD700', marginHorizontal: 4 }}>⭐</ThemedText>
              </View>
            </View>
            
            <View style={styles.cardContent}>
              {/* Achievement Badge */}
              <View style={{
                backgroundColor: '#FF6B35',
                paddingHorizontal: 20, // Reduced padding
                paddingVertical: 8, // Reduced padding
                borderRadius: 25,
                marginBottom: 15, // Reduced margin
                shadowColor: '#FF6B35',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 8,
                borderWidth: 2,
                borderColor: '#FFF',
              }}>
                <ThemedText style={{
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: 14, // Reduced font size
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  textShadowColor: 'rgba(0, 0, 0, 0.2)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}>
                  Achievement
                </ThemedText>
              </View>
              
              <View style={{
                width: '100%',
                alignItems: 'center',
                paddingHorizontal: 5,
              }}>
                <ThemedText 
                  style={styles.cardDescription}
                  numberOfLines={4}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                  ellipsizeMode="tail"
                >
                  {achievementContent}
                </ThemedText>
              </View>
              
              {/* Progress Visualization */}
              <View style={{
                marginTop: 20, // Reduced margin
                alignItems: 'center',
              }}>
                <View style={{
                  width: 200, // Slightly smaller
                  height: 8, // Slightly smaller
                  backgroundColor: '#E8E8E8',
                  borderRadius: 4,
                  marginVertical: 10, // Reduced margin
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <View style={{
                    width: '88%',
                    height: '100%',
                    backgroundColor: '#00C851',
                    borderRadius: 4,
                    shadowColor: '#00C851',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 6,
                    elevation: 4,
                  }} />
                </View>
                <ThemedText style={{
                  fontSize: 12, // Further reduced font size
                  color: '#555',
                  fontWeight: '700',
                  letterSpacing: 0.2,
                  textAlign: 'center',
                  marginTop: 4,
                }}>
                  Keep crushing your goals! 💪
                </ThemedText>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <ThemedText style={styles.cardHashtags}>
                #GetMaximumFit #Achievement #FitnessGoals #HealthJourney
              </ThemedText>
              <ThemedText style={styles.cardUrl}>
                getmaximumfit.com
              </ThemedText>
            </View>
            
            <View style={styles.cardBrand}>
              {/* Enhanced Brand Icon */}
              <View style={{
                width: 30, // Slightly smaller
                height: 30,
                borderRadius: 15,
                backgroundColor: '#007AFF',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#007AFF',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
                elevation: 6,
                borderWidth: 2,
                borderColor: '#FFF',
              }}>
                <FontAwesome5 name="dumbbell" size={14} color="#FFFFFF" style={{ // Smaller icon
                  textShadowColor: 'rgba(0, 0, 0, 0.2)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }} />
              </View>
              <ThemedText style={styles.brandText}>GetMaximumFit</ThemedText>
            </View>
          </View>
        </View>
      )}
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
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
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
  
  // Styles for visual achievement card
  hiddenCard: {
    position: 'absolute',
    top: -10000,
    left: -10000,
    opacity: 0,
  },
  achievementCard: {
    width: 400,
    height: 700, // Increased height further to ensure no cutoff
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 20, // Further reduced padding to maximize content space
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
    borderWidth: 3,
    borderColor: '#FFD700',
    // Add gradient-like effect with multiple layers
    overflow: 'hidden',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 15, // Reduced margin
    paddingTop: 15, // Reduced padding
  },
  cardTitle: {
    fontSize: 22, // Further reduced font size
    fontWeight: '900',
    color: '#1A1A1A',
    marginTop: 12, // Further reduced margin
    textAlign: 'center',
    lineHeight: 26, // Reduced line height proportionally
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    paddingHorizontal: 10, // Add padding to prevent edge cutoff
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10, // Reduced to allow more text space
    paddingVertical: 10, // Further reduced padding
    minHeight: 200, // Set minimum height to ensure content space
    width: '100%', // Ensure full width utilization
  },
  cardDescription: {
    fontSize: 16, // Further reduced font size
    color: '#2C2C2C',
    textAlign: 'center',
    lineHeight: 22, // Reduced line height to ensure text fits
    fontWeight: '600',
    letterSpacing: 0.2,
    marginVertical: 6, // Further reduced margin
    paddingHorizontal: 15, // Increased horizontal padding for better containment
    width: '90%', // Constrain width to ensure wrapping
    maxWidth: 320, // Set maximum width to force wrapping
    flexShrink: 1, // Allow shrinking
  },
  cardFooter: {
    alignItems: 'center',
    marginTop: 20, // Reduced margin
    paddingVertical: 12, // Reduced padding
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 15,
    width: '100%',
  },
  cardHashtags: {
    fontSize: 16, // Reduced font size
    color: '#FF6B35',
    fontWeight: '700',
    marginBottom: 6, // Reduced margin
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  cardUrl: {
    fontSize: 15, // Slightly increased for readability
    color: '#007AFF',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12, // Reduced margin
    paddingTop: 12, // Reduced padding
    paddingBottom: 8, // Reduced bottom padding
    borderTopWidth: 2,
    borderTopColor: '#FFD700',
    width: '100%',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 18, // Reduced font size
    fontWeight: '800',
    color: '#007AFF',
    marginLeft: 10, // Reduced margin
    letterSpacing: 0.8,
  },
  
  // Feature gating styles
  tierNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  tierNoticeText: {
    marginLeft: 8,
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    flex: 1,
  },
  lockedConnection: {
    opacity: 0.6,
  },
  lockOverlay: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 2,
  },
  lockedText: {
    color: '#999',
  },
  proBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  upgradeButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

// Export utility functions for use in other parts of the app
export const shareWorkoutAchievement = async (achievementData: {
  title: string;
  description: string;
  customMessage?: string;
}, hasFeatureCheck?: (feature: string) => boolean) => {
  try {
    const message = achievementData.customMessage || 
      `🏆 ${achievementData.title}\n\n${achievementData.description}\n\n#MaximumFit #Fitness #Achievement`;
    
    const shareContent = {
      type: 'achievement' as const,
      title: 'Maximum Fit - Achievement Unlocked',
      message,
    };
    
    // Use feature gating if available
    if (hasFeatureCheck) {
      return await shareWithFeatureGating(shareContent, {
        onUpgradeRequired: () => {
          Alert.alert(
            'Premium Feature',
            'Achievement sharing requires Pro subscription!',
            [{ text: 'Upgrade to Pro', onPress: () => {} }]
          );
        }
      }, hasFeatureCheck);
    } else {
      // Fallback to regular sharing
      await shareToSocialMediaUtil(shareContent);
      return true;
    }
  } catch (error: any) {
    console.error('Error sharing achievement:', error);
    throw error;
  }
};

export const shareWorkoutComplete = async (workoutData: {
  name: string;
  duration: string;
  exercises: number;
  customMessage?: string;
}, hasFeatureCheck?: (feature: string) => boolean) => {
  try {
    const message = workoutData.customMessage || 
      `💪 Just completed "${workoutData.name}"!\n\n⏱️ Duration: ${workoutData.duration}\n🏋️‍♂️ Exercises: ${workoutData.exercises}\n\nFeeling stronger every day! #MaximumFit #Workout #Fitness`;
    
    const shareContent = {
      type: 'workout' as const,
      title: 'Maximum Fit - Workout Complete',
      message,
    };
    
    // Use feature gating if available
    if (hasFeatureCheck) {
      return await shareWithFeatureGating(shareContent, {
        fallbackToBasic: true,
        onUpgradeRequired: () => {
          Alert.alert(
            'Premium Feature',
            'Advanced workout sharing features require Pro subscription!',
            [{ text: 'Upgrade to Pro', onPress: () => {} }]
          );
        }
      }, hasFeatureCheck);
    } else {
      // Fallback to regular sharing
      await shareToSocialMediaUtil(shareContent);
      return true;
    }
  } catch (error: any) {
    console.error('Error sharing workout:', error);
    throw error;
  }
};

export const shareProgressUpdate = async (progressData: {
  period: string;
  achievements: string[];
  customMessage?: string;
}, hasFeatureCheck?: (feature: string) => boolean) => {
  try {
    const achievementsList = progressData.achievements.map(achievement => `• ${achievement}`).join('\n');
    const message = progressData.customMessage || 
      `📈 ${progressData.period} Progress Update!\n\n${achievementsList}\n\nConsistency is key! 🚀 #MaximumFit #Progress #FitnessJourney`;
    
    const shareContent = {
      type: 'progress' as const,
      title: 'Maximum Fit - Progress Update',
      message,
    };
    
    // Use feature gating if available
    if (hasFeatureCheck) {
      return await shareWithFeatureGating(shareContent, {
        onUpgradeRequired: () => {
          Alert.alert(
            'Premium Feature',
            'Progress sharing requires Pro subscription!',
            [{ text: 'Upgrade to Pro', onPress: () => {} }]
          );
        }
      }, hasFeatureCheck);
    } else {
      // Fallback to regular sharing
      await shareToSocialMediaUtil(shareContent);
      return true;
    }
  } catch (error: any) {
    console.error('Error sharing progress:', error);
    throw error;
  }
};
