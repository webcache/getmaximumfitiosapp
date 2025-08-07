import { StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

/**
 * Non-animated version of HelloWave for testing
 */
export function HelloWave() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.text}>👋</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    // Simple static container
  },
  text: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
  },
});
