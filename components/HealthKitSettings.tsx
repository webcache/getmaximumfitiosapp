import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { healthKitService, HealthKitSettings } from '../services/HealthKitService';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface HealthKitSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export default function HealthKitSettingsComponent({ visible, onClose }: HealthKitSettingsProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<HealthKitSettings>({
    enabled: false,
    autoSync: true,
    syncWorkouts: true,
    syncSteps: true,
    syncHeartRate: false,
  });
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const userSettings = await healthKitService.getHealthKitSettings(user.uid);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading HealthKit settings:', error);
    }
  }, [user?.uid]);

  useEffect(() => {
    // Only check HealthKit availability on iOS
    if (Platform.OS === 'ios') {
      setIsAvailable(healthKitService.isHealthKitAvailable());
    } else {
      setIsAvailable(false);
    }
    
    if (user?.uid) {
      loadSettings();
    }
  }, [user?.uid, loadSettings]);

  const updateSetting = async (key: keyof HealthKitSettings, value: boolean) => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      // If enabling HealthKit for the first time, initialize it
      if (key === 'enabled' && value && !settings.enabled) {
        const initialized = await healthKitService.initializeHealthKit();
        if (!initialized) {
          Alert.alert(
            'HealthKit Error',
            'Failed to initialize HealthKit. Please check your device settings and permissions.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
      }

      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      
      await healthKitService.updateHealthKitSettings(user.uid, { [key]: value });
      
      if (key === 'enabled' && value) {
        Alert.alert(
          'HealthKit Enabled',
          'Your workout data will now be synced to Apple Health. You can customize sync options below.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating HealthKit setting:', error);
      Alert.alert(
        'Error',
        'Failed to update HealthKit settings. Please try again.',
        [{ text: 'OK' }]
      );
      // Revert the setting
      setSettings(prev => ({ ...prev, [key]: !value }));
    } finally {
      setLoading(false);
    }
  };

  if (!visible) {
    return null;
  }

  if (!isAvailable) {
    return (
      <ThemedView style={styles.unavailableContainer}>
        <FontAwesome5 name="mobile-alt" size={48} color="#999" style={styles.unavailableIcon} />
        <ThemedText style={styles.unavailableTitle}>Apple HealthKit Not Available</ThemedText>
        <ThemedText style={styles.unavailableText}>
          HealthKit is only available on iOS devices. This feature is not supported on your current platform.
        </ThemedText>
      </ThemedView>
    );
  }

  const settingsOptions = [
    {
      key: 'enabled' as keyof HealthKitSettings,
      title: 'Enable Apple HealthKit',
      subtitle: 'Sync your workout data with Apple Health',
      icon: 'heart',
      value: settings.enabled,
      disabled: loading,
    },
    {
      key: 'syncWorkouts' as keyof HealthKitSettings,
      title: 'Sync Workouts',
      subtitle: 'Save completed workouts to Apple Health',
      icon: 'dumbbell',
      value: settings.syncWorkouts,
      disabled: loading || !settings.enabled,
    },
    {
      key: 'syncSteps' as keyof HealthKitSettings,
      title: 'Sync Steps',
      subtitle: 'Read step count from Apple Health',
      icon: 'walking',
      value: settings.syncSteps,
      disabled: loading || !settings.enabled,
    },
    {
      key: 'syncHeartRate' as keyof HealthKitSettings,
      title: 'Sync Heart Rate',
      subtitle: 'Read heart rate data from Apple Health',
      icon: 'heartbeat',
      value: settings.syncHeartRate,
      disabled: loading || !settings.enabled,
    },
    {
      key: 'autoSync' as keyof HealthKitSettings,
      title: 'Auto Sync',
      subtitle: 'Automatically sync data when workouts are completed',
      icon: 'sync-alt',
      value: settings.autoSync,
      disabled: loading || !settings.enabled,
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <FontAwesome5 name="times" size={20} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Apple HealthKit</ThemedText>
        <View style={styles.placeholderButton} />
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.description}>
          Connect with Apple HealthKit to automatically sync your workout data with the Apple Health app.
        </ThemedText>

        <View style={styles.settingsContainer}>
          {settingsOptions.map((option) => (
            <View key={option.key} style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, option.disabled && styles.disabledIcon]}>
                  <FontAwesome5 
                    name={option.icon} 
                    size={16} 
                    color={option.disabled ? "#999" : "#007AFF"} 
                  />
                </View>
                <View style={styles.textContainer}>
                  <ThemedText style={[styles.settingTitle, option.disabled && styles.disabledText]}>
                    {option.title}
                  </ThemedText>
                  <ThemedText style={[styles.settingSubtitle, option.disabled && styles.disabledText]}>
                    {option.subtitle}
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={option.value}
                onValueChange={(value) => updateSetting(option.key, value)}
                disabled={option.disabled}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={option.value ? '#fff' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        <View style={styles.infoContainer}>
          <FontAwesome5 name="info-circle" size={16} color="#007AFF" />
          <ThemedText style={styles.infoText}>
            HealthKit permissions will be requested when you enable this feature. 
            You can manage these permissions in your device&apos;s Health app settings.
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderButton: {
    width: 36,
    height: 36,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.8,
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  disabledIcon: {
    backgroundColor: '#f5f5f5',
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
    opacity: 0.8,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  unavailableIcon: {
    marginBottom: 20,
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
});
