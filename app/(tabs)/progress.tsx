import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function ProgressScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Handle authentication state changes
  useEffect(() => {
    if (!user) {
      console.log('User logged out, redirecting to login...');
      router.replace('/login/loginScreen');
    }
  }, [user, router]);

  // Simulate loading progress data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading progress data...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Progress Tracking
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Monitor your fitness journey and achievements
        </ThemedText>
      </ThemedView>

      {/* Current Max Lifts Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Current Max Lifts 💪
        </ThemedText>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>225 lbs</ThemedText>
            <ThemedText style={styles.statLabel}>Bench Press</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>315 lbs</ThemedText>
            <ThemedText style={styles.statLabel}>Squat</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>405 lbs</ThemedText>
            <ThemedText style={styles.statLabel}>Deadlift</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>135 lbs</ThemedText>
            <ThemedText style={styles.statLabel}>Overhead Press</ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Workout Statistics Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Workout Statistics 📊
        </ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>24</ThemedText>
            <ThemedText style={styles.statDescription}>Workouts This Month</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>3.2</ThemedText>
            <ThemedText style={styles.statDescription}>Avg Sessions/Week</ThemedText>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>45 min</ThemedText>
            <ThemedText style={styles.statDescription}>Avg Workout Duration</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>12</ThemedText>
            <ThemedText style={styles.statDescription}>Week Streak</ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Goals Progress Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Goals Progress 🎯
        </ThemedText>
        
        <View style={styles.goalItem}>
          <View style={styles.goalHeader}>
            <ThemedText style={styles.goalName}>Bench Press 250 lbs</ThemedText>
            <ThemedText style={styles.goalProgress}>90%</ThemedText>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '90%' }]} />
          </View>
          <ThemedText style={styles.goalDescription}>25 lbs to go!</ThemedText>
        </View>

        <View style={styles.goalItem}>
          <View style={styles.goalHeader}>
            <ThemedText style={styles.goalName}>Lose 10 lbs</ThemedText>
            <ThemedText style={styles.goalProgress}>60%</ThemedText>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '60%' }]} />
          </View>
          <ThemedText style={styles.goalDescription}>4 lbs to go!</ThemedText>
        </View>

        <View style={styles.goalItem}>
          <View style={styles.goalHeader}>
            <ThemedText style={styles.goalName}>Run 5K under 25 min</ThemedText>
            <ThemedText style={styles.goalProgress}>45%</ThemedText>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '45%' }]} />
          </View>
          <ThemedText style={styles.goalDescription}>Current: 28:30</ThemedText>
        </View>
      </ThemedView>

      {/* Chart Placeholder Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Progress Charts 📈
        </ThemedText>
        <View style={styles.chartPlaceholder}>
          <ThemedText style={styles.chartText}>
            Weight Progress Chart
          </ThemedText>
          <ThemedText style={styles.chartSubtext}>
            Charts will be implemented with workout data
          </ThemedText>
        </View>
        <View style={styles.chartPlaceholder}>
          <ThemedText style={styles.chartText}>
            Strength Progress Chart
          </ThemedText>
          <ThemedText style={styles.chartSubtext}>
            Track your lifting progress over time
          </ThemedText>
        </View>
      </ThemedView>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  section: {
    margin: 15,
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statDescription: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 5,
  },
  goalItem: {
    marginBottom: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '500',
  },
  goalProgress: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  goalDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
  chartPlaceholder: {
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  chartText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  chartSubtext: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 50,
  },
});
