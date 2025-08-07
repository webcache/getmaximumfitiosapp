import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useAuth } from '../contexts/AuthContext';
import { useDynamicThemeColor } from '../hooks/useThemeColor';
import { preferencesManager, UnitType } from '../utils/preferences';

const colorOptions = [
  { name: 'Red', value: '#8c030e', description: 'Default red' },
  { name: 'Blue', value: '#007AFF', description: 'System blue' },
  { name: 'Green', value: '#28a745', description: 'Success green' },
  { name: 'Purple', value: '#6f42c1', description: 'Royal purple' },
  { name: 'Orange', value: '#fd7e14', description: 'Vibrant orange' },
  { name: 'Teal', value: '#17a2b8', description: 'Cool teal' },
  { name: 'Pink', value: '#e83e8c', description: 'Hot pink' },
  { name: 'Indigo', value: '#6610f2', description: 'Deep indigo' },
];

export default function OptionsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { themeColor: selectedColor } = useDynamicThemeColor();
  const [units, setUnits] = useState<UnitType>('lbs');
  const [loading, setLoading] = useState(true);
  const [dashboardImage, setDashboardImage] = useState<string | null>(null);

  const resetToDefaults = useCallback(() => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to reset preferences');
      return;
    }

    Alert.alert(
      'Reset to Defaults',
      'This will reset all options to their default values. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await preferencesManager.resetToDefaults(user.uid);
              Alert.alert('Success', 'All options have been reset to defaults.');
            } catch (error) {
              console.error('Error resetting options:', error);
              Alert.alert('Error', 'Failed to reset options');
            }
          },
        },
      ]
    );
  }, [user?.uid]);

  // Set up navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Options',
      headerShown: true,
      headerBackTitle: 'Back',
      headerTintColor: '#000000',
      headerRight: () => (
        <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
          <FontAwesome5 name="undo" size={20} color={selectedColor} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, resetToDefaults, selectedColor]);

  const loadSettings = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const preferences = await preferencesManager.loadPreferences(user.uid);
      setUnits(preferences.units);
      setDashboardImage(preferences.dashboardImage || null);
      // selectedColor is now handled by the useDynamicThemeColor hook
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      preferencesManager.setUserId(user.uid);
      loadSettings();
    }
    
    // Listen for preference changes
    const handlePreferencesChange = () => {
      const prefs = preferencesManager.getPreferences();
      setUnits(prefs.units);
      setDashboardImage(prefs.dashboardImage || null);
      // selectedColor is now handled by the useDynamicThemeColor hook
    };
    
    preferencesManager.addListener(handlePreferencesChange);
    
    return () => {
      preferencesManager.removeListener(handlePreferencesChange);
    };
  }, [user?.uid, loadSettings]);

  const saveUnitPreference = async (newUnits: UnitType) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to save preferences');
      return;
    }

    try {
      await preferencesManager.setUnits(newUnits, user.uid);
      
      Alert.alert(
        'Units Changed',
        `Weight units changed to ${newUnits.toUpperCase()}. This will take effect throughout the app.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving unit preference:', error);
      Alert.alert('Error', 'Failed to save unit preference');
    }
  };

  const saveThemeColor = async (color: string) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to save preferences');
      return;
    }

    try {
      await preferencesManager.setThemeColor(color, user.uid);
      
      Alert.alert(
        'Theme Color Changed',
        'The new color will be applied throughout the app. You may need to restart the app for all changes to take effect.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving theme color:', error);
      Alert.alert('Error', 'Failed to save theme color');
    }
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'We need camera access to take a photo. Please enable camera access in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                }
              }
            }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await saveDashboardImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Camera Error', 'Unable to access camera. Please try again.');
    }
  };

  const chooseFromLibrary = async () => {
    console.log('🔄 Starting photo library selection...');
    
    try {
      // Request permissions following the sample pattern
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Permission to access camera roll is required! Please enable it in Settings > Privacy & Security > Photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                }
              }
            }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      console.log('📸 Image picker result:', { 
        canceled: result.canceled,
        assetsLength: result.assets?.length || 0
      });

      if (!result.canceled && result.assets?.[0]) {
        console.log('📸 Selected image URI:', result.assets[0].uri);
        await saveDashboardImage(result.assets[0].uri);
      } else {
        console.log('📸 Image selection was canceled');
      }
    } catch (error) {
      console.error('❌ Error in chooseFromLibrary:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert(
        'Photo Library Error', 
        `Error: ${errorMessage}\n\nThis may be a development build issue. Try:\n1. Restarting the app\n2. Rebuilding the development client\n3. Checking iOS Settings > Privacy > Photos`
      );
    }
  };

  const saveDashboardImage = async (imageUri: string) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to save dashboard image');
      return;
    }

    try {
      console.log('📸 Saving dashboard image:', imageUri);
      await preferencesManager.setDashboardImage(imageUri, user.uid);
      setDashboardImage(imageUri);
      
      Alert.alert('Success', 'Dashboard image updated successfully!');
      console.log('✅ Dashboard image saved successfully');
    } catch (error) {
      console.error('❌ Error saving dashboard image:', error);
      Alert.alert(
        'Error', 
        'Failed to save dashboard image. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const resetToDefaultImage = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to reset dashboard image');
      return;
    }

    Alert.alert(
      'Reset to Default',
      'This will restore the default dashboard image. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await preferencesManager.setDashboardImage(null, user.uid);
              setDashboardImage(null);
              Alert.alert('Success', 'Dashboard image reset to default!');
            } catch (error) {
              console.error('Error resetting dashboard image:', error);
              Alert.alert('Error', 'Failed to reset dashboard image');
            }
          },
        },
      ]
    );
  };

  const showImageOptions = () => {
    Alert.alert(
      'Dashboard Image',
      'Choose how you want to update your dashboard image:',
      [
        { text: 'Take Photo', onPress: takePicture },
        { text: 'Choose from Library', onPress: chooseFromLibrary },
        { text: 'Reset to Default', onPress: resetToDefaultImage, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText>{!user ? 'Please log in to access options' : 'Loading options...'}</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Draft Migration Section - Temporary - COMPLETED AND HIDDEN */}
        {/* 
        <DraftMigrationComponent 
          onComplete={() => {
            Alert.alert('Success', 'Migration completed! You can now find your workouts in the "Upcoming Workouts" section.');
          }}
        />
        */}

        {/* Units Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Units
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Choose your preferred weight units for the entire app
          </ThemedText>
          
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <FontAwesome5 name="weight-hanging" size={20} color={selectedColor} />
              <View style={styles.optionText}>
                <ThemedText style={styles.optionTitle}>Weight Units</ThemedText>
                <ThemedText style={styles.optionSubtitle}>
                  {units === 'lbs' ? 'Pounds (lbs)' : 'Kilograms (kg)'}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={units === 'lbs'}
              onValueChange={(value) => saveUnitPreference(value ? 'lbs' : 'kg')}
              trackColor={{ false: '#767577', true: selectedColor }}
              thumbColor={units === 'lbs' ? '#fff' : '#f4f3f4'}
            />
          </View>
        </ThemedView>

        {/* Theme Color Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Theme Color
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Customize the accent color used throughout the app
          </ThemedText>
          
          <View style={styles.colorGrid}>
            {colorOptions.map((color) => (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorOption,
                  { backgroundColor: color.value },
                  selectedColor === color.value && styles.selectedColor,
                ]}
                onPress={() => saveThemeColor(color.value)}
              >
                {selectedColor === color.value && (
                  <FontAwesome5 name="check" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.selectedColorInfo}>
            <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
            <View>
              <ThemedText style={styles.selectedColorName}>
                {colorOptions.find(c => c.value === selectedColor)?.name || 'Custom'}
              </ThemedText>
              <ThemedText style={styles.selectedColorValue}>
                {selectedColor}
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Dashboard Image Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Dashboard Image
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Customize the header image on your dashboard
          </ThemedText>
          
          <View style={styles.dashboardImageContainer}>
            <View style={styles.dashboardImagePreview}>
              <Image
                source={dashboardImage ? { uri: dashboardImage } : require('@/assets/images/dashboard-image.png')}
                style={styles.dashboardImageThumbnail}
                contentFit="cover"
              />
            </View>
            <View style={styles.dashboardImageInfo}>
              <ThemedText style={styles.dashboardImageStatus}>
                {dashboardImage ? 'Custom Image' : 'Default Image'}
              </ThemedText>
              <TouchableOpacity
                style={[styles.changeDashboardImageButton, { borderColor: selectedColor }]}
                onPress={showImageOptions}
              >
                <FontAwesome5 name="camera" size={14} color={selectedColor} />
                <ThemedText style={[styles.changeDashboardImageText, { color: selectedColor }]}>
                  Change Image
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ThemedView>

        {/* More Options Coming Soon */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            More Options
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Additional customization options will be added in future updates
          </ThemedText>
          
          <View style={styles.comingSoonContainer}>
            <FontAwesome5 name="cog" size={40} color="#ccc" />
            <ThemedText style={styles.comingSoonText}>Coming Soon</ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  resetButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#333',
  },
  selectedColorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
  },
  selectedColorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedColorValue: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  comingSoonContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 12,
  },
  dashboardImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    gap: 16,
  },
  dashboardImagePreview: {
    width: 80,
    height: 45,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e9ecef',
  },
  dashboardImageThumbnail: {
    width: '100%',
    height: '100%',
  },
  dashboardImageInfo: {
    flex: 1,
    gap: 8,
  },
  dashboardImageStatus: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  changeDashboardImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderRadius: 8,
    backgroundColor: 'transparent',
    gap: 6,
    alignSelf: 'flex-start',
  },
  changeDashboardImageText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
