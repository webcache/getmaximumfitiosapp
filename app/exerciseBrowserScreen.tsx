import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import ExerciseBrowser from '../components/ExerciseBrowser';
import { ThemedView } from '../components/ThemedView';

export default function ExerciseBrowserScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  
  // Check if we're in selection mode
  const isSelectionMode = params.selectionMode === 'true';
  const returnTo = params.returnTo as string;

  // Set up navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isSelectionMode ? 'Select Exercises' : 'Exercise Library',
      headerShown: true,
      headerBackTitle: 'Back',
      headerTintColor: '#000000',
    });
  }, [navigation, isSelectionMode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ExerciseBrowser 
          selectionMode={isSelectionMode}
          returnTo={returnTo}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },
});
