import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { FeatureGate } from './FeatureGate';
import { ThemedText } from './ThemedText';
import { UsageTracker, useFeatureUsage } from './UsageTracker';

interface FeatureExamplesProps {
  onShowPaywall: () => void;
}

/**
 * Example component showing how to integrate feature gating
 * into various parts of your app
 */
export function FeatureExamples({ onShowPaywall }: FeatureExamplesProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { checkAndUseFeature } = useFeatureUsage('aiQueriesPerMonth');
  const [isCreatingWorkout, setIsCreatingWorkout] = useState(false);

  // Example: AI Query with usage tracking
  const handleAIQuery = async () => {
    const canUse = await checkAndUseFeature(() => {
      Alert.alert(
        'AI Limit Reached',
        'You\'ve used all your AI queries this month. Upgrade to Pro for unlimited AI assistance!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: onShowPaywall }
        ]
      );
    });

    if (canUse) {
      // Proceed with AI query
      Alert.alert('Success', 'AI query executed! Usage has been tracked.');
    }
  };

  // Example: Creating a custom workout with limits
  const handleCreateWorkout = () => {
    setIsCreatingWorkout(true);
    // Your workout creation logic here
    setTimeout(() => {
      setIsCreatingWorkout(false);
      Alert.alert('Success', 'Workout created!');
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Feature Examples
      </ThemedText>

      {/* Example 1: AI Feature with Usage Tracking */}
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            AI Assistant
          </ThemedText>
          <UsageTracker feature="aiQueriesPerMonth" onUpgradePress={onShowPaywall} />
        </View>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={handleAIQuery}
        >
          <FontAwesome5 name="robot" size={16} color="white" />
          <ThemedText style={styles.buttonText}>
            Ask AI for Workout Advice
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Example 2: Feature Gate for Advanced Analytics */}
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Advanced Analytics
        </ThemedText>
        
        <FeatureGate 
          feature="advancedWorkoutAnalytics" 
          onUpgradePress={onShowPaywall}
        >
          <View style={styles.analyticsContent}>
            <FontAwesome5 name="chart-line" size={24} color={colors.tint} />
            <ThemedText>Advanced workout analytics and insights</ThemedText>
            <ThemedText style={{ color: colors.text + '70' }}>
              Detailed performance metrics, progress trends, and personalized recommendations
            </ThemedText>
          </View>
        </FeatureGate>
      </View>

      {/* Example 3: Custom Workout Creation with Limits */}
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Custom Workouts
          </ThemedText>
          <UsageTracker feature="maxCustomWorkouts" onUpgradePress={onShowPaywall} />
        </View>
        
        <FeatureGate 
          feature="maxCustomWorkouts" 
          onUpgradePress={onShowPaywall}
          fallback={
            <View style={styles.limitReached}>
              <ThemedText>You've reached your custom workout limit</ThemedText>
            </View>
          }
        >
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={handleCreateWorkout}
            disabled={isCreatingWorkout}
          >
            <FontAwesome5 name="plus" size={16} color="white" />
            <ThemedText style={styles.buttonText}>
              {isCreatingWorkout ? 'Creating...' : 'Create Custom Workout'}
            </ThemedText>
          </TouchableOpacity>
        </FeatureGate>
      </View>

      {/* Example 4: Premium Social Features */}
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Social Features
        </ThemedText>
        
        <FeatureGate 
          feature="achievementSharing" 
          onUpgradePress={onShowPaywall}
        >
          <View style={styles.socialContent}>
            <FontAwesome5 name="share-alt" size={20} color={colors.tint} />
            <ThemedText>Achievement Sharing</ThemedText>
            <ThemedText style={{ color: colors.text + '70' }}>
              Share your achievements with friends and social media
            </ThemedText>
          </View>
        </FeatureGate>

        <FeatureGate 
          feature="socialChallenges" 
          onUpgradePress={onShowPaywall}
        >
          <View style={styles.socialContent}>
            <FontAwesome5 name="trophy" size={20} color={colors.tint} />
            <ThemedText>Social Challenges</ThemedText>
            <ThemedText style={{ color: colors.text + '70' }}>
              Compete with friends in fitness challenges
            </ThemedText>
          </View>
        </FeatureGate>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  analyticsContent: {
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  socialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
  },
  limitReached: {
    padding: 16,
    alignItems: 'center',
  },
});

export default FeatureExamples;
