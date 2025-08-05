import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import CacheSettingsModal from '../../components/CacheSettingsModal';
import HealthKitSettingsModal from '../../components/HealthKitSettingsModal';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsScreen() {
  const { user } = useAuth();
  const [cacheModalVisible, setCacheModalVisible] = useState(false);
  const [healthKitModalVisible, setHealthKitModalVisible] = useState(false);

  const handleCacheSettings = () => {
    setCacheModalVisible(true);
  };

  const handleHealthKitSettings = () => {
    setHealthKitModalVisible(true);
  };

  const settingsOptions = [
    {
      id: 'cache-settings',
      title: 'Data & Sync',
      subtitle: 'Manage offline data and sync settings',
      icon: 'cloud-download-alt',
      onPress: handleCacheSettings,
    },
    {
      id: 'healthkit-settings',
      title: 'Apple HealthKit',
      subtitle: 'Sync workouts with Apple Health',
      icon: 'heart',
      onPress: handleHealthKitSettings,
    },
    /* {
      id: 'preferences',
      title: 'App Preferences',
      subtitle: 'Customize your experience',
      icon: 'sliders-h',
      onPress: () => console.log('App preferences'),
    },
    {
      id: 'backup',
      title: 'Data & Backup',
      subtitle: 'Sync and backup your data',
      icon: 'cloud-upload-alt',
      onPress: () => console.log('Data & Backup'),
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: 'question-circle',
      onPress: () => console.log('Help & Support'),
    }, */
    {
      id: 'about',
      title: 'About',
      subtitle: 'App version and information',
      icon: 'info-circle',
      onPress: () => console.log('About'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Settings
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Customize your GetMaximumFit experience
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.settingsContainer}>
            {settingsOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
              style={styles.settingItem}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.settingContent}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 
                    name={option.icon} 
                    size={20} 
                    color="#007AFF" 
                  />
                </View>
                <View style={styles.textContainer}>
                  <ThemedText style={styles.settingTitle}>
                    {option.title}
                  </ThemedText>
                  <ThemedText style={styles.settingSubtitle}>
                    {option.subtitle}
                  </ThemedText>
                </View>
                <View style={styles.chevronContainer}>
                  <FontAwesome5 
                    name="chevron-right" 
                    size={16} 
                    color="#C7C7CC" 
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ThemedView>



        <ThemedView style={styles.footer}>
          <ThemedText style={styles.versionText}>
            GetMaximumFit v1.0.0
          </ThemedText>
          <ThemedText style={styles.copyrightText}>
            © 2025 GetMaximumFit. All rights reserved.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
    
    {/* Cache Settings Modal */}
    <CacheSettingsModal 
      visible={cacheModalVisible} 
      onClose={() => setCacheModalVisible(false)} 
    />
    
    {/* HealthKit Settings Modal */}
    <HealthKitSettingsModal 
      visible={healthKitModalVisible} 
      onClose={() => setHealthKitModalVisible(false)} 
    />
    </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 5,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  settingsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  // Removed duplicate safeArea style
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: '#000',
  },
  settingSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    color: '#666',
  },
  chevronContainer: {
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    paddingBottom: 100,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.7,
  },
  copyrightText: {
    fontSize: 12,
    opacity: 0.5,
  },
});
