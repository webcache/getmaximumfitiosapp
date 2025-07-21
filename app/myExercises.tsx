import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { Exercise } from '@/types/exercise';
import { userExerciseStorage } from '@/utils/userExerciseStorage';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useNavigation } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyExercisesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [myExercises, setMyExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const addMoreExercises = () => {
    router.push('/exerciseBrowserScreen');
  };

  // Set up navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'My Exercises',
      headerRight: () => (
        <TouchableOpacity
          onPress={addMoreExercises}
          style={styles.headerButton}
        >
          <FontAwesome5 name="plus" size={20} color="#007AFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Initialize userExerciseStorage with current user
  useEffect(() => {
    if (user?.uid) {
      userExerciseStorage.initialize(user.uid).then(() => {
        setLoading(false);
      });
    }
    
    return () => {
      userExerciseStorage.cleanup();
    };
  }, [user?.uid]);

  // Subscribe to user exercise storage changes
  useEffect(() => {
    const unsubscribe = userExerciseStorage.subscribe(() => {
      setMyExercises(userExerciseStorage.getExercises());
    });
    
    // Initialize with current storage state
    setMyExercises(userExerciseStorage.getExercises());
    
    return unsubscribe;
  }, []);

  const removeFromMyList = async (exercise: Exercise) => {
    Alert.alert(
      'Remove Exercise',
      `Remove "${exercise.name}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (exercise.id) {
              await userExerciseStorage.removeExercise(exercise.id);
            }
          },
        },
      ]
    );
  };

  const viewExerciseDetail = (exercise: Exercise) => {
    router.push({
      pathname: '/exerciseDetail',
      params: { exerciseData: JSON.stringify(exercise) }
    });
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
          onPress: async () => {
            await userExerciseStorage.clearAll();
          },
        },
      ]
    );
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => viewExerciseDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <ThemedText style={styles.exerciseName}>{item.name}</ThemedText>
          <ThemedText style={styles.exerciseCategory}>{item.category}</ThemedText>
        </View>
        <View style={styles.exerciseActions}>
          {item.video && (
            <FontAwesome5 name="video" size={16} color="#007AFF" style={styles.videoIcon} />
          )}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromMyList(item)}
          >
            <FontAwesome5 name="trash" size={14} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.muscleInfo}>
        <ThemedText style={styles.muscleLabel}>Primary: </ThemedText>
        <ThemedText style={styles.muscleText}>
          {item.primary_muscles.join(', ')}
        </ThemedText>
      </View>
      
      {item.secondary_muscles.length > 0 && (
        <View style={styles.muscleInfo}>
          <ThemedText style={styles.muscleLabel}>Secondary: </ThemedText>
          <ThemedText style={styles.muscleText}>
            {item.secondary_muscles.join(', ')}
          </ThemedText>
        </View>
      )}
      
      <View style={styles.equipmentInfo}>
        <FontAwesome5 name="dumbbell" size={12} color="#666" />
        <ThemedText style={styles.equipmentText}>
          {item.equipment.length > 0 ? item.equipment.join(', ') : 'No equipment needed'}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading your exercises...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Content */}
      {myExercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="dumbbell" size={60} color="#ccc" />
          <ThemedText style={styles.emptyTitle}>No exercises in your list</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            Add exercises from the Exercise Library to build your personal collection
          </ThemedText>
          <TouchableOpacity style={styles.addExercisesButton} onPress={addMoreExercises}>
            <FontAwesome5 name="plus" size={16} color="#fff" />
            <ThemedText style={styles.addExercisesButtonText}>Browse Exercise Library</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Stats */}
          <View style={styles.statsContainer}>
            <ThemedText style={styles.statsText}>
              {myExercises.length} exercise{myExercises.length !== 1 ? 's' : ''} in your list
            </ThemedText>
            {myExercises.length > 0 && (
              <TouchableOpacity onPress={clearAllExercises} style={styles.clearAllButton}>
                <ThemedText style={styles.clearAllText}>Clear All</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Exercise List */}
          <FlatList
            data={myExercises}
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id || item.name}
            style={styles.exerciseList}
            contentContainerStyle={[
              styles.exerciseListContent,
              { paddingBottom: Math.max(20, insets.bottom) }
            ]}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListContent: {
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseCategory: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  videoIcon: {
    opacity: 0.7,
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFF5F5',
  },
  muscleInfo: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  muscleLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  muscleText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    textTransform: 'capitalize',
  },
  equipmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  equipmentText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addExercisesButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  addExercisesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
