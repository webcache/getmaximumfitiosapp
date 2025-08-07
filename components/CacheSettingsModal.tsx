// components/CacheSettingsModal.tsx
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { cacheManager, CacheStatus } from '../utils/cacheManager';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface CacheSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CacheSettingsModal({ visible, onClose }: CacheSettingsModalProps) {
    const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadCacheStatus();
    }
  }, [visible]);

  const loadCacheStatus = async () => {
    setLoading(true);
    try {
      const status = await cacheManager.getCacheStatus();
      setCacheStatus(status);
    } catch (error) {
      console.error('Error loading cache status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceSync = async () => {
    setActionLoading('sync');
    try {
      const success = await cacheManager.forceSyncWithFirestore();
      if (success) {
        Alert.alert('Success', 'Data synced successfully with server.');
        await loadCacheStatus(); // Refresh status
      } else {
        Alert.alert('Error', 'Failed to sync with server. Please check your connection.');
      }
    } catch {
      Alert.alert('Error', 'Failed to sync with server. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGoOffline = async () => {
    setActionLoading('offline');
    try {
      const success = await cacheManager.goOffline();
      if (success) {
        Alert.alert('Offline Mode', 'App is now in offline mode. Data will be cached locally.');
        await loadCacheStatus();
      } else {
        Alert.alert('Error', 'Failed to go offline.');
      }
    } catch {
      Alert.alert('Error', 'Failed to go offline.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGoOnline = async () => {
    setActionLoading('online');
    try {
      const success = await cacheManager.goOnline();
      if (success) {
        Alert.alert('Online Mode', 'App is now online. Data will sync with server.');
        await loadCacheStatus();
      } else {
        Alert.alert('Error', 'Failed to go online. Please check your connection.');
      }
    } catch {
      Alert.alert('Error', 'Failed to go online.');
    } finally {
      setActionLoading(null);
    }
  };

    const handleDeleteAllUserData = () => {
        Alert.alert(
            'Delete All User Data',
            'This will permanently delete ALL your data from our servers including workouts, exercises, favorites, and profile information. This action cannot be undone.\n\nThis complies with GDPR data deletion requirements.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'I understand, delete everything',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Final Confirmation',
                            'Are you absolutely sure? This will delete ALL your data permanently.',
                            [
                                {
                                    text: 'Cancel',
                                    style: 'cancel',
                                },
                                {
                                    text: 'Yes, delete all my data',
                                    style: 'destructive',
                                    onPress: async () => {
                                        if (!user?.uid) {
                                            Alert.alert('Error', 'Unable to identify user. Please try logging in again.');
                                            return;
                                        }
                                        
                                        setLoading(true);
                                        try {
                                            await cacheManager.deleteAllUserData(user.uid);
                                            Alert.alert(
                                                'Success',
                                                'All your data has been permanently deleted.',
                                                [
                                                    {
                                                        text: 'OK',
                                                        onPress: () => {
                                                            onClose();
                                                            // User should be signed out after this
                                                        },
                                                    },
                                                ]
                                            );
                                        } catch (error) {
                                            console.error('Error deleting user data:', error);
                                            Alert.alert(
                                                'Error',
                                                'Failed to delete user data. Please try again or contact support.'
                                            );
                                        } finally {
                                            setLoading(false);
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    const handleClearCache = async () => {
        Alert.alert(
            'Clear All App Data',
            'This will clear all cached data and settings stored on this device. This does NOT delete your data from our servers.\n\nNote: To permanently delete all your account data from our servers (GDPR compliance), please use the "Delete All User Data" option below.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Clear Local Data',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await cacheManager.clearAllAppData();
                            Alert.alert('Success', 'All local app data has been cleared.');
                            loadCacheStatus();
                        } catch (error) {
                            console.error('Error clearing cache:', error);
                            Alert.alert('Error', 'Failed to clear app data.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleExportUserData = async () => {
        if (!user?.uid) {
            Alert.alert('Error', 'Unable to identify user. Please try logging in again.');
            return;
        }

        Alert.alert(
            'Export User Data',
            'This will export ALL your data from our servers in JSON format. This complies with GDPR data portability requirements.\n\nThe export includes your profile, workouts, exercises, favorites, and all other personal data.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Export My Data',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const success = await cacheManager.exportAllUserData(user.uid);
                            if (success) {
                                Alert.alert(
                                    'Export Complete',
                                    'Your data has been exported successfully. The file should be available in your device\'s share menu.'
                                );
                            } else {
                                Alert.alert('Error', 'Failed to export user data. Please try again.');
                            }
                        } catch (error) {
                            console.error('Error exporting user data:', error);
                            Alert.alert('Error', 'Failed to export user data. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Cache & Sync Settings
          </ThemedText>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesome5 name="times" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <ThemedText style={styles.loadingText}>Loading cache status...</ThemedText>
            </View>
          ) : cacheStatus ? (
            <>
              {/* Cache Status Section */}
              <ThemedView style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Cache Status
                </ThemedText>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Connection:</Text>
                <View style={styles.statusValue}>
                  <FontAwesome5 
                    name={cacheStatus.isOnline ? "wifi" : "exclamation-circle"} 
                    size={16} 
                    color={cacheStatus.isOnline ? "#28a745" : "#dc3545"} 
                  />
                  <Text style={[styles.statusText, { color: cacheStatus.isOnline ? "#28a745" : "#dc3545" }]}>
                    {cacheStatus.isOnline ? "Online" : "Offline"}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Last Sync:</Text>
                <Text style={styles.statusText}>
                  {cacheStatus.lastSyncTime 
                    ? cacheStatus.lastSyncTime.toLocaleString() 
                    : "Never"
                  }
                </Text>
              </View>

              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Cache Size:</Text>
                <Text style={styles.statusText}>{cacheStatus.cacheSize}</Text>
              </View>
            </ThemedView>

            {/* Actions Section */}
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Sync Actions
              </ThemedText>

              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleForceSync}
                disabled={actionLoading === 'sync'}
              >
                {actionLoading === 'sync' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <FontAwesome5 name="sync-alt" size={16} color="#FFF" />
                )}
                <Text style={styles.primaryButtonText}>Force Sync with Server</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={cacheStatus.isOnline ? handleGoOffline : handleGoOnline}
                disabled={actionLoading === 'offline' || actionLoading === 'online'}
              >
                {(actionLoading === 'offline' || actionLoading === 'online') ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <FontAwesome5 
                    name={cacheStatus.isOnline ? "exclamation-circle" : "wifi"} 
                    size={16} 
                    color="#007AFF" 
                  />
                )}
                <Text style={styles.secondaryButtonText}>
                  {cacheStatus.isOnline ? "Go Offline" : "Go Online"}
                </Text>
              </TouchableOpacity>
            </ThemedView>

            {/* Dangerous Actions Section */}
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={[styles.sectionTitle, styles.dangerTitle]}>
                Data Management (GDPR)
              </ThemedText>

              <TouchableOpacity
                style={[styles.actionButton, styles.infoButton]}
                onPress={handleExportUserData}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <FontAwesome5 name="download" size={16} color="#FFF" />
                )}
                <Text style={styles.infoButtonText}>Export All My Data (GDPR)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.warningButton]}
                onPress={handleClearCache}
                disabled={actionLoading === 'clear'}
              >
                {actionLoading === 'clear' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <FontAwesome5 name="trash-alt" size={16} color="#FFF" />
                )}
                <Text style={styles.warningButtonText}>Clear Offline Cache</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleClearCache}
                disabled={actionLoading === 'clearAll'}
              >
                {actionLoading === 'clearAll' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <FontAwesome5 name="exclamation-triangle" size={16} color="#FFF" />
                )}
                <Text style={styles.dangerButtonText}>Clear All App Data</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.gdprButton]}
                onPress={handleDeleteAllUserData}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <FontAwesome5 name="user-times" size={16} color="#FFF" />
                )}
                <Text style={styles.gdprButtonText}>Delete All User Data (GDPR)</Text>
              </TouchableOpacity>
            </ThemedView>

            {/* Help Section */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.helpText}>
                • <Text style={styles.bold}>Force Sync</Text>: Refreshes data from server{'\n'}
                • <Text style={styles.bold}>Clear Cache</Text>: Removes offline data, forces fresh download{'\n'}
                • <Text style={styles.bold}>Export My Data</Text>: Downloads all your data as JSON file (GDPR){'\n'}
                • <Text style={styles.bold}>Clear All Data</Text>: Resets app to initial state (local only){'\n'}
                • <Text style={styles.bold}>Delete All User Data</Text>: Permanently deletes ALL data from servers (GDPR)
              </ThemedText>
            </ThemedView>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>Failed to load cache status</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={loadCacheStatus}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  dangerTitle: {
    color: '#dc3545',
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningButton: {
    backgroundColor: '#ffc107',
  },
  warningButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    backgroundColor: '#17a2b8',
  },
  infoButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  dangerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  gdprButton: {
    backgroundColor: '#6f42c1',
  },
  gdprButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  bold: {
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
