import ExerciseBrowser from '@/components/ExerciseBrowser';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function ExerciseBrowserScreen() {
  const router = useRouter();

  const handleExerciseSelect = (exercise: any) => {
    // Handle exercise selection - could navigate to detail screen
    console.log('Selected exercise:', exercise.name);
    // For now, just log the selection
  };

  return (
    <ThemedView style={styles.container}>
      <ExerciseBrowser 
        onExerciseSelect={handleExerciseSelect}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
