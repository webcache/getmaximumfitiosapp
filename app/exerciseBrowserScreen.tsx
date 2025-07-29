import ExerciseBrowser from '@/components/ExerciseBrowser';
import ThemedView from '@/components/ThemedView';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function ExerciseBrowserScreen() {
  return (
    <SafeAreaProvider>
      <ThemedView style={styles.container}>
        <ExerciseBrowser />
      </ThemedView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
