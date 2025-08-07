import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { Exercise } from '@/types/exercise';
import { userExerciseStorage } from '@/utils/userExerciseStorage';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyExercisesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [myExercises, setMyExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  
  // Check if we're in selection mode
  const isSelectionMode = params.selectionMode === 'true';
  const returnTo = params.returnTo as string;

  const addMoreExercises = () => {
    if (isSelectionMode) {
      router.push(`/exerciseBrowserScreen?selectionMode=true&returnTo=${returnTo}`);
    } else {
      router.push('/exerciseBrowserScreen');
    }
  };

  const handleDone = () => {
    if (selectedExercises.length > 0 && returnTo) {
      const encodedExercises = encodeURIComponent(JSON.stringify(selectedExercises));
      if (returnTo === 'createWorkout') {
        // Include the original form data when returning
        const formData = params.formData as string;
        if (formData) {
          router.push({
            pathname: '/createWorkout',
            params: { 
              selectedExercises: encodedExercises,
              formData: formData
            }
          });
        } else {
          router.push({
            pathname: '/createWorkout',
            params: { selectedExercises: encodedExercises }
          });
        }
      } else {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const toggleExerciseSelection = (exercise: Exercise) => {
    console.log('toggleExerciseSelection called for:', exercise.name);
    console.log('Current selectedExercises before toggle:', selectedExercises.map(e => e.name));
    
    if (selectedExercises.find(e => e.id === exercise.id)) {
      const newSelection = selectedExercises.filter(e => e.id !== exercise.id);
      console.log('Removing exercise, new selection:', newSelection.map(e => e.name));
      setSelectedExercises(newSelection);
    } else {
      const newSelection = [...selectedExercises, exercise];
      console.log('Adding exercise, new selection:', newSelection.map(e => e.name));
      setSelectedExercises(newSelection);
    }
  };

  // Set up navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isSelectionMode ? 'Select Exercises' : 'My Saved Exercises',
      headerShown: true,
      headerBackTitle: 'Back',
      headerTintColor: '#000000',
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={addMoreExercises}
            style={styles.headerButton}
          >
            <FontAwesome5 name="plus" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, isSelectionMode]);

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

  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const isSelected = selectedExercises.find(e => e.id === item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.exerciseCard,
          isSelectionMode && isSelected && styles.selectedCard
        ]}
        onPress={() => isSelectionMode ? toggleExerciseSelection(item) : viewExerciseDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseInfo}>
            <ThemedText style={styles.exerciseName}>{item.name}</ThemedText>
            <ThemedText style={styles.exerciseCategory}>{item.category}</ThemedText>
          </View>
          <View style={styles.exerciseActions}>
            {isSelectionMode && (
              <View style={[styles.selectionIndicator, isSelected && styles.selectionIndicatorSelected]}>
                {isSelected && <FontAwesome5 name="check" size={12} color="#fff" />}
              </View>
            )}
            {!isSelectionMode && item.video && (
              <FontAwesome5 name="video" size={16} color="#007AFF" style={styles.videoIcon} />
            )}
            {!isSelectionMode && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromMyList(item)}
              >
                <FontAwesome5 name="trash" size={14} color="#FF3B30" />
              </TouchableOpacity>
            )}
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
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ThemedText>Loading your exercises...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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

      {/* Selection Mode Floating Action Button */}
      {isSelectionMode && (
        <TouchableOpacity
          style={[
            styles.floatingDoneButton,
            { backgroundColor: selectedExercises.length > 0 ? '#007AFF' : '#ccc' }
          ]}
          onPress={handleDone}
          disabled={selectedExercises.length === 0}
        >
          <ThemedText style={styles.floatingDoneButtonText}>
            Done ({selectedExercises.length})
          </ThemedText>
        </TouchableOpacity>
      )}
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
    backgroundColor: '#f5f5f5',
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 8,
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
  selectedCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#007AFF10',
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectionIndicatorSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  floatingDoneButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingDoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
