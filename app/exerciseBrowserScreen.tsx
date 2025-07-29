import ExerciseBrowser from '@/components/ExerciseBrowser';
import { ThemedView } from '@/components/ThemedView';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

export default function ExerciseBrowserScreen() {
  const navigation = useNavigation();

  // Set up navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Exercise Library',
      headerShown: true,
      headerBackTitle: 'Back',
      headerTintColor: '#000000',
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ExerciseBrowser />
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
