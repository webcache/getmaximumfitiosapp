import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useNavigation } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
    Alert,
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
  }, [navigation]);

  useEffect(() => {
    if (user?.uid) {
      preferencesManager.setUserId(user.uid);
      loadSettings();
    }
    
    // Listen for preference changes
    const handlePreferencesChange = () => {
      const prefs = preferencesManager.getPreferences();
      setUnits(prefs.units);
      // selectedColor is now handled by the useDynamicThemeColor hook
    };
    
    preferencesManager.addListener(handlePreferencesChange);
    
    return () => {
      preferencesManager.removeListener(handlePreferencesChange);
    };
  }, [user?.uid]);

  const loadSettings = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const preferences = await preferencesManager.loadPreferences(user.uid);
      setUnits(preferences.units);
      // selectedColor is now handled by the useDynamicThemeColor hook
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const resetToDefaults = () => {
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
});
