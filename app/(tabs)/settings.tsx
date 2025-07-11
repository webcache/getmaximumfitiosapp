import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Exercise } from '@/types/exercise';
import { userExerciseStorage } from '@/utils/userExerciseStorage';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const [myExercises, setMyExercises] = useState<Exercise[]>([]);
  const [showMyExercises, setShowMyExercises] = useState(false);

  // Subscribe to user exercise storage changes
  useEffect(() => {
    const unsubscribe = userExerciseStorage.subscribe(() => {
      setMyExercises(userExerciseStorage.getExercises());
    });
    
    // Initialize with current storage state
    setMyExercises(userExerciseStorage.getExercises());
    
    return unsubscribe;
  }, []);

  const removeFromMyList = (exerciseId: string) => {
    userExerciseStorage.removeExercise(exerciseId);
    Alert.alert('Success', 'Exercise removed from your list!');
  };

  const clearAllExercises = () => {
    Alert.alert(
      'Clear All Exercises',
      'Are you sure you want to remove all exercises from your list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            userExerciseStorage.clearAll();
            Alert.alert('Success', 'All exercises cleared from your list!');
          },
        },
      ]
    );
  };

  const handleExerciseLibrary = () => {
    router.push('/exerciseBrowserScreen');
  };

  const settingsOptions = [
    {
      id: 'my-exercises',
      title: 'My Exercises',
      subtitle: `Manage your exercise list (${myExercises.length} exercises)`,
      icon: 'list',
      onPress: () => setShowMyExercises(!showMyExercises),
    },
    {
      id: 'exercise-library',
      title: 'Exercise Library',
      subtitle: 'Browse and learn exercises',
      icon: 'dumbbell',
      onPress: handleExerciseLibrary,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage your workout reminders',
      icon: 'bell',
      onPress: () => console.log('Notifications settings'),
    },
    {
      id: 'preferences',
      title: 'App Preferences',
      subtitle: 'Customize your experience',
      icon: 'sliders-h',
      onPress: () => console.log('App preferences'),
    },
    {
      id: 'backup',
      title: 'Data & Backup',
      subtitle: 'Sync and backup your data',
      icon: 'cloud-upload-alt',
      onPress: () => console.log('Data & Backup'),
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: 'question-circle',
      onPress: () => console.log('Help & Support'),
    },
    {
      id: 'about',
      title: 'About',
      subtitle: 'App version and information',
      icon: 'info-circle',
      onPress: () => console.log('About'),
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Customize your GetMaximumFit experience
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.settingsContainer}>
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.settingItem}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.settingContent}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 
                    name={option.icon} 
                    size={20} 
                    color="#007AFF" 
                  />
                </View>
                <View style={styles.textContainer}>
                  <ThemedText style={styles.settingTitle}>
                    {option.title}
                  </ThemedText>
                  <ThemedText style={styles.settingSubtitle}>
                    {option.subtitle}
                  </ThemedText>
                </View>
                <View style={styles.chevronContainer}>
                  <FontAwesome5 
                    name="chevron-right" 
                    size={16} 
                    color="#C7C7CC" 
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* My Exercises Management Section */}
        {showMyExercises && (
          <ThemedView style={styles.myExercisesSection}>
            <View style={styles.myExercisesHeader}>
              <ThemedText style={styles.myExercisesTitle}>
                My Exercise List ({myExercises.length})
              </ThemedText>
              {myExercises.length > 0 && (
                <TouchableOpacity
                  style={styles.clearAllButton}
                  onPress={clearAllExercises}
                >
                  <FontAwesome5 name="trash" size={14} color="#FF6B6B" />
                  <ThemedText style={styles.clearAllText}>Clear All</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {myExercises.length > 0 ? (
              <ScrollView style={styles.exercisesList}>
                {myExercises.map((exercise) => (
                  <View key={exercise.id} style={styles.exerciseItem}>
                    <View style={styles.exerciseInfo}>
                      <ThemedText style={styles.exerciseName}>
                        {exercise.name}
                      </ThemedText>
                      <ThemedText style={styles.exerciseCategory}>
                        {exercise.category}
                      </ThemedText>
                      <ThemedText style={styles.exerciseMuscles}>
                        {[...exercise.primary_muscles, ...exercise.secondary_muscles].join(', ')}
                      </ThemedText>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromMyList(exercise.id || '')}
                    >
                      <FontAwesome5 name="times" size={14} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyExercisesList}>
                <FontAwesome5 name="clipboard-list" size={48} color="#CCC" />
                <ThemedText style={styles.emptyText}>No exercises in your list</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Add exercises from the Exercise Library to build your personal list
                </ThemedText>
                <TouchableOpacity
                  style={styles.browseButton}
                  onPress={handleExerciseLibrary}
                >
                  <FontAwesome5 name="dumbbell" size={16} color="#007AFF" />
                  <ThemedText style={styles.browseButtonText}>Browse Exercise Library</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </ThemedView>
        )}

        <ThemedView style={styles.footer}>
          <ThemedText style={styles.versionText}>
            GetMaximumFit v1.0.0
          </ThemedText>
          <ThemedText style={styles.copyrightText}>
            © 2025 GetMaximumFit. All rights reserved.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  settingsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: '#000',
  },
  settingSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    color: '#666',
  },
  chevronContainer: {
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    paddingBottom: 100,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.7,
  },
  copyrightText: {
    fontSize: 12,
    opacity: 0.5,
  },
  // My Exercises styles
  myExercisesSection: {
    backgroundColor: '#F8F9FA',
    margin: 20,
    borderRadius: 12,
    paddingVertical: 20,
  },
  myExercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  myExercisesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  clearAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  exercisesList: {
    maxHeight: 300,
  },
  exerciseItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseMuscles: {
    fontSize: 12,
    color: '#666',
    opacity: 0.8,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyExercisesList: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    opacity: 0.7,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    marginBottom: 20,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  browseButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
