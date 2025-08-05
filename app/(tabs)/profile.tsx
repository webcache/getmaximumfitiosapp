// app/(tabs)/profile.tsx
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import AccountLinking from '../../components/AccountLinking';
import AuthDebugComponent from '../../components/AuthDebugComponent';
import KeyboardSafeScreenWrapper from '../../components/KeyboardSafeScreenWrapper';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { db } from '../../firebase';
import { cacheManager } from '../../utils/cacheManager';

import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
  // ALL HOOKS MUST BE CALLED FIRST
  const { user, userProfile, loading, signOut } = useAuth();
  const router = useRouter();
  const isReady = !!user; // Add this line to define isReady based on user presence
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    height: '',
    weight: '',
  });

  // Add a resetProfile function to clear profile data in Firestore
  const resetProfile = async () => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        firstName: '',
        lastName: '',
        phone: '',
        height: '',
        weight: '',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error resetting profile:', error);
      throw error;
    }
  };

  // Initialize state with user data
  // Initialize state with user data
  useEffect(() => {
    setFormData({
      firstName: userProfile?.firstName || '',
      lastName: userProfile?.lastName || '',
      email: userProfile?.email || user?.email || '',
      phone: userProfile?.phone || '',
      height: userProfile?.height || '',
      weight: userProfile?.weight || ''
    });
  }, [userProfile, user]);

  // Test direct Firestore access - TEMPORARILY DISABLED
  // useEffect(() => {
  //   const testFirestoreAccess = async () => {
  //     if (user?.uid) {
  //       try {
  //         console.log('🧪 Testing direct Firestore access for UID:', user.uid);
  //         const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
  //         if (profileDoc.exists()) {
  //           const data = profileDoc.data();
  //           console.log('🧪 Direct Firestore read successful:', data);
  //           Alert.alert(
  //             'DEBUG: Direct Firestore Test',
  //             `Document exists: ${profileDoc.exists()}\n` +
  //             `FirstName: "${data?.firstName || 'empty'}"\n` +
  //             `LastName: "${data?.lastName || 'empty'}"\n` +
  //             `Height: "${data?.height || 'empty'}"\n` +
  //             `Weight: "${data?.weight || 'empty'}"`
  //           );
  //         } else {
  //           console.log('🧪 Direct Firestore read: Document does not exist');
  //           Alert.alert('DEBUG: Direct Firestore Test', 'Document does not exist!');
  //         }
  //       } catch (error) {
  //         console.error('🧪 Direct Firestore read error:', error);
  //         Alert.alert('DEBUG: Direct Firestore Test', `Error: ${error}`);
  //       }
  //     }
  //   };

  //   if (isReady && user && !userProfile) {
  //     // Only test if userProfile is not loaded yet
  //     testFirestoreAccess();
  //   }
  // }, [isReady, user, userProfile]);

  // Add this effect to log formData changes
  useEffect(() => {
    console.log('📊 Profile tab: formData state changed:', formData);
  }, [formData]);

  // Navigate to login when user signs out
  useEffect(() => {
    if (isReady && !user) {
      console.log('🚪 Profile: User signed out, redirecting to login...');
      router.replace('/login/loginScreen');
    }
  }, [isReady, user, router]);

  // Early return AFTER all hooks are called
  if (!isReady || loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  // Trust the centralized navigation in app/index.tsx - don't redirect here
  if (!user) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Redirecting...</ThemedText>
      </ThemedView>
    );
  }

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Check if weight has changed
      const previousWeight = userProfile?.weight;
      const newWeight = formData.weight;
      const hasWeightChanged = previousWeight !== newWeight && newWeight.trim() !== '';

      // Update profile in Firestore
      await updateDoc(doc(db, 'profiles', user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        height: formData.height,
        weight: formData.weight,
        updatedAt: new Date().toISOString(),
      });

      // If weight changed and is valid, add to weight history
      if (hasWeightChanged) {
        const weightValue = parseFloat(newWeight.replace(/[^\d.]/g, '')); // Extract numeric value
        if (!isNaN(weightValue) && weightValue > 0) {
          const weightHistoryRef = collection(db, 'profiles', user.uid, 'weightHistory');
          await addDoc(weightHistoryRef, {
            weight: weightValue,
            unit: newWeight.toLowerCase().includes('kg') ? 'kg' : 'lbs',
            date: new Date(),
            createdAt: new Date().toISOString(),
          });
        }
      }

      Alert.alert('Success', 'Profile updated successfully!');
      
      // Profile refreshed successfully
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled by the useEffect above
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Add a refreshProfile function to reload user profile data
  const refreshProfile = async () => {
    // You may need to implement this according to your app's logic.
    // For example, you could call a context method or re-fetch from Firestore.
    // Here is a simple example that reloads userProfile from Firestore:
    if (!user?.uid) return;
    try {
      const profileDoc = await import('firebase/firestore').then(({ getDoc, doc }) =>
        getDoc(doc(db, 'profiles', user.uid))
      );
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          height: data.height || '',
          weight: data.weight || ''
        });
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      throw error;
    }
  };

  // Add manual refresh function for testing
  const handleManualRefresh = async () => {
    if (!user?.uid) return;
    
    try {
      console.log('🔄 Manual refresh: Starting profile refresh...');
      await refreshProfile();
      console.log('🔄 Manual refresh: Profile refresh completed');
      Alert.alert('Success', 'Profile data refreshed successfully!');
    } catch (error) {
      console.error('🔄 Manual refresh error:', error);
      Alert.alert('Refresh Error', `Error: ${error}`);
    }
  };

  // Add profile reset function for debugging
  const handleProfileReset = async () => {
    if (!user?.uid) return;
    
    Alert.alert(
      'Reset Profile',
      'This will clear all profile data in Firestore. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Profile reset: Starting...');
              await resetProfile();
              console.log('🔄 Profile reset: Completed');
              Alert.alert('Success', 'Profile data reset successfully!');
            } catch (error) {
              console.error('🔄 Profile reset error:', error);
              Alert.alert('Reset Error', `Error: ${error}`);
            }
          }
        }
      ]
    );
  };

  // Add clear all app data function for debugging
  const handleClearAllData = async () => {
    Alert.alert(
      'Clear All App Data',
      'This will clear ALL app data including cache and local storage. The app may restart. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🧹 Clear all data: Starting...');
              await cacheManager.clearAllAppData();
              console.log('🧹 Clear all data: Completed');
              Alert.alert('Success', 'All app data cleared successfully! The app may restart.');
            } catch (error) {
              console.error('🧹 Clear all data error:', error);
              Alert.alert('Clear Error', `Error: ${error}`);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardSafeScreenWrapper style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Profile Settings
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Update your personal information
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.formContainer}>
          {/* Debug info - only show in development */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>DEBUG INFO (Remove when working)</Text>
              <Text style={styles.debugText}>User UID: {user?.uid || 'None'}</Text>
              <Text style={styles.debugText}>User Email: {user?.email || 'None'}</Text>
              <Text style={styles.debugText}>UserProfile exists: {userProfile ? 'Yes' : 'No'}</Text>
              {userProfile && (
                <>
                  <Text style={styles.debugText}>Profile firstName: {`"${userProfile.firstName}"`}</Text>
                  <Text style={styles.debugText}>Profile lastName: {`"${userProfile.lastName}"`}</Text>
                  <Text style={styles.debugText}>Profile height: {`"${userProfile.height}"`}</Text>
                  <Text style={styles.debugText}>Profile weight: {`"${userProfile.weight}"`}</Text>
                </>
              )}
              <Text style={styles.debugText}>Form firstName: {`"${formData.firstName}"`}</Text>
              <Text style={styles.debugText}>Form lastName: {`"${formData.lastName}"`}</Text>
              
              {/* Manual Refresh Button */}
              <TouchableOpacity
                style={styles.debugButton}
                onPress={handleManualRefresh}
              >
                <Text style={styles.debugButtonText}>Manual Refresh Profile</Text>
              </TouchableOpacity>
              
              {/* Reset Profile Button - For Debugging */}
              <TouchableOpacity
                style={[styles.debugButton, { backgroundColor: '#ff6b6b' }]}
                onPress={handleProfileReset}
              >
                <Text style={styles.debugButtonText}>Reset Profile Data</Text>
              </TouchableOpacity>

              {/* Clear All Data Button - For Debugging */}
              <TouchableOpacity
                style={[styles.debugButton, { backgroundColor: '#ffcc00' }]}
                onPress={handleClearAllData}
              >
                <Text style={styles.debugButtonText}>Clear All App Data</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              placeholder="Enter your first name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              placeholder="Enter your last name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={formData.email}
              editable={false}
              placeholder="Email address"
              placeholderTextColor="#999"
            />
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter your phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Height</Text>
            <TextInput
              style={styles.input}
              value={formData.height}
              onChangeText={(text) => setFormData({ ...formData, height: text })}
              placeholder="e.g., 5'10'' or 178cm"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Weight</Text>
            <TextInput
              style={styles.input}
              value={formData.weight}
              onChangeText={(text) => setFormData({ ...formData, weight: text })}
              placeholder="e.g., 150 lbs or 68 kg"
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.savingButton]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>

          {/* Debug buttons - only show in development */}
          {__DEV__ && (
            <>
              {/* Manual Refresh Button - For Testing */}
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleManualRefresh}
              >
                <Text style={styles.refreshButtonText}>Refresh Profile Data</Text>
              </TouchableOpacity>

              {/* Profile Reset Button - For Debugging */}
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleProfileReset}
              >
                <Text style={styles.resetButtonText}>Reset Profile Data</Text>
              </TouchableOpacity>
            </>
          )}
        </ThemedView>

        {/* Account Linking Section */}
        <View style={styles.sectionSeparator} />
        
        {/* Auth Debug Component - only show in development */}
        {__DEV__ && <AuthDebugComponent />}
        
        <AccountLinking />

        <ThemedView style={styles.signOutSection}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </KeyboardSafeScreenWrapper>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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
  formContainer: {
    padding: 20,
    paddingTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  savingButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Removed duplicate safeArea style
  sectionSeparator: {
    height: 20,
  },
  signOutSection: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  debugButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    marginTop: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  refreshButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#FF9500',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
