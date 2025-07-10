import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { firestoreExerciseService } from '@/services/FirestoreExerciseService';
import { Exercise } from '@/types/exercise';
import { userExerciseStorage } from '@/utils/userExerciseStorage';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import exercise data - using a sample for now
const sampleExercises: Exercise[] = [
  {
    id: '1',
    name: 'Push-ups',
    category: 'Chest',
    primary_muscles: ['Chest', 'Triceps'],
    secondary_muscles: ['Shoulders'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    instructions: ['Start in plank position', 'Lower body to ground', 'Push back up'],
    description: 'A classic bodyweight exercise that targets the chest, triceps, and shoulders.',
    tips: ['Keep your core tight throughout the movement', 'Maintain a straight line from head to heels'],
    video: 'https://www.youtube.com/watch?v=IODxDxX7oi4'
  },
  {
    id: '2',
    name: 'Pull-ups',
    category: 'Back',
    primary_muscles: ['Lats', 'Biceps'],
    secondary_muscles: ['Rear Delts'],
    equipment: ['Pull-up Bar'],
    difficulty: 'Intermediate',
    instructions: ['Hang from bar', 'Pull body up', 'Lower with control'],
    description: 'An upper body pulling exercise that primarily targets the latissimus dorsi.',
    tips: ['Start with assisted variations if needed', 'Focus on controlled movement'],
    video: 'https://www.youtube.com/watch?v=eGo4IYlbE5g'
  },
  {
    id: '3',
    name: 'Squats',
    category: 'Legs',
    primary_muscles: ['Quadriceps', 'Glutes'],
    secondary_muscles: ['Hamstrings'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    instructions: ['Stand with feet shoulder-width apart', 'Lower into squat', 'Return to standing'],
    description: 'A fundamental lower body exercise that strengthens the legs and glutes.',
    tips: ['Keep your knees aligned with your toes', 'Go as low as your mobility allows'],
    video: 'https://www.youtube.com/watch?v=aclHkVaku9U'
  },
  {
    id: '4',
    name: 'Deadlifts',
    category: 'Back',
    primary_muscles: ['Hamstrings', 'Glutes'],
    secondary_muscles: ['Lower Back'],
    equipment: ['Barbell'],
    difficulty: 'Advanced',
    instructions: ['Stand with barbell', 'Hinge at hips', 'Lift weight to standing'],
    description: 'A compound movement that targets the posterior chain muscles.',
    tips: ['Keep the bar close to your body', 'Maintain a neutral spine throughout'],
    video: 'https://www.youtube.com/watch?v=VytMEdoHnEg'
  },
  {
    id: '5',
    name: 'Plank',
    category: 'Core',
    primary_muscles: ['Core'],
    secondary_muscles: ['Shoulders'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    instructions: ['Start in push-up position', 'Hold position', 'Keep core tight'],
    description: 'An isometric core exercise that builds stability and strength.',
    tips: ['Focus on breathing while holding', 'Keep your hips level'],
    video: 'https://www.youtube.com/watch?v=ASdvN_XEl_c'
  },
];

export default function ExerciseLibraryScreen() {
  const insets = useSafeAreaInsets();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState(['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio']);
  const [addedExercises, setAddedExercises] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadExercises();
    
    // Subscribe to user exercise storage changes
    const unsubscribe = userExerciseStorage.subscribe(() => {
      setAddedExercises(userExerciseStorage.getAddedIds());
    });
    
    // Initialize with current storage state
    setAddedExercises(userExerciseStorage.getAddedIds());
    
    return unsubscribe;
  }, []);

  const loadExercises = async () => {
    try {
      setLoading(true);
      
      // Try to load categories and exercises from Firestore
      const [categoriesResult, exercisesResult] = await Promise.all([
        firestoreExerciseService.getCategories(),
        firestoreExerciseService.searchExercises({ pageSize: 100 })
      ]);
      
      // Update categories
      if (categoriesResult.length > 0) {
        setCategories(['All', ...categoriesResult]);
      }
      
      // Update exercises
      if (exercisesResult.data.length > 0) {
        console.log('Loaded exercises from Firestore:', exercisesResult.data.length);
        setExercises(exercisesResult.data);
        setFilteredExercises(exercisesResult.data);
      } else {
        console.log('No exercises found in Firestore, using sample data');
        // Fall back to sample data if Firestore is empty
        setExercises(sampleExercises);
        setFilteredExercises(sampleExercises);
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      // Fall back to sample data on error
      setExercises(sampleExercises);
      setFilteredExercises(sampleExercises);
      Alert.alert('Error', 'Failed to load exercises from database. Using sample data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filterExercises = () => {
      let filtered = exercises;

      // Filter by category
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(
          (exercise) => exercise.category.toLowerCase() === selectedCategory.toLowerCase()
        );
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (exercise) =>
            exercise.name.toLowerCase().includes(query) ||
            exercise.primary_muscles.some((muscle: string) => muscle.toLowerCase().includes(query)) ||
            exercise.secondary_muscles.some((muscle: string) => muscle.toLowerCase().includes(query)) ||
            exercise.category.toLowerCase().includes(query)
        );
      }

      setFilteredExercises(filtered);
    };

    filterExercises();
  }, [searchQuery, selectedCategory, exercises]);

  const handleExercisePress = (exercise: Exercise) => {
    console.log('🔍 Exercise pressed:', exercise.name);
    console.log('🔍 Current showModal state:', showModal);
    console.log('🔍 Setting selectedExercise:', exercise);
    setSelectedExercise(exercise);
    console.log('🔍 Setting showModal to true');
    setShowModal(true);
    console.log('🔍 Modal state should now be true');
    
    // Force a re-render to make sure state is updated
    setTimeout(() => {
      console.log('🔍 After timeout - showModal:', showModal);
    }, 100);
  };

  const closeModal = () => {
    console.log('🔍 Closing modal');
    setShowModal(false);
    setSelectedExercise(null);
  };

  const addToMyList = (exercise: Exercise) => {
    const success = userExerciseStorage.addExercise(exercise);
    if (success) {
      console.log('✅ Added exercise to my list:', exercise.name);
      Alert.alert('Success', `${exercise.name} added to your exercise list!`);
    } else {
      console.log('⚠️ Exercise already in list:', exercise.name);
      Alert.alert('Info', `${exercise.name} is already in your list!`);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return '#4CAF50';
      case 'intermediate':
        return '#FF9800';
      case 'advanced':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'chest':
        return 'expand-arrows-alt';
      case 'back':
        return 'arrows-alt-v';
      case 'shoulders':
        return 'arrows-alt';
      case 'arms':
        return 'fist-raised';
      case 'legs':
        return 'running';
      case 'core':
        return 'circle';
      case 'cardio':
        return 'heartbeat';
      default:
        return 'dumbbell';
    }
  };

  // Debug logs
  console.log('🔍 Component render - showModal:', showModal, 'selectedExercise:', selectedExercise?.name);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading exercises...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Search and Filter Section */}
      <ThemedView style={[styles.searchFilterSection, { paddingTop: Math.max(15, insets.top) }]}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <FontAwesome5 name="search" size={16} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.selectedCategoryButton,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <ThemedText
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.selectedCategoryText,
                ]}
              >
                {category}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ThemedView>

      <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.resultCount}>
          {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
        </ThemedText>

        {filteredExercises.map((exercise) => (
          <TouchableOpacity
            key={exercise.id}
            style={styles.exerciseCard}
            onPress={() => handleExercisePress(exercise)}
            activeOpacity={0.7}
          >
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseIconContainer}>
                <FontAwesome5
                  name={getCategoryIcon(exercise.category)}
                  size={20}
                  color="#007AFF"
                />
              </View>
              <View style={styles.exerciseInfo}>
                <ThemedText style={styles.exerciseName}>{exercise.name}</ThemedText>
                <ThemedText style={styles.exerciseCategory}>{exercise.category}</ThemedText>
              </View>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(exercise.difficulty || 'Beginner') },
                ]}
              >
                <ThemedText style={styles.difficultyText}>
                  {exercise.difficulty}
                </ThemedText>
              </View>
            </View>

            <View style={styles.exerciseDetails}>
              <ThemedText style={styles.targetMuscles}>
                Target: {[...exercise.primary_muscles, ...exercise.secondary_muscles].join(', ')}
              </ThemedText>
              {exercise.equipment.length > 0 && (
                <ThemedText style={styles.equipment}>
                  Equipment: {exercise.equipment.join(', ')}
                </ThemedText>
              )}
            </View>

            {/* Add to List Button */}
            <TouchableOpacity
              style={[
                styles.addToListButton,
                addedExercises.has(exercise.id || '') && styles.addedToListButton
              ]}
              onPress={() => addToMyList(exercise)}
              disabled={addedExercises.has(exercise.id || '')}
            >
              <FontAwesome5 
                name={addedExercises.has(exercise.id || '') ? "check" : "plus"} 
                size={14} 
                color={addedExercises.has(exercise.id || '') ? "#4CAF50" : "#007AFF"} 
              />
              <ThemedText style={[
                styles.addToListText,
                addedExercises.has(exercise.id || '') && styles.addedToListText
              ]}>
                {addedExercises.has(exercise.id || '') ? 'Added' : 'Add to List'}
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.chevronContainer}>
              <FontAwesome5 name="chevron-right" size={16} color="#C7C7CC" />
            </View>
          </TouchableOpacity>
        ))}

        {filteredExercises.length === 0 && (
          <ThemedView style={styles.emptyState}>
            <FontAwesome5 name="search" size={48} color="#CCC" />
            <ThemedText style={styles.emptyText}>No exercises found</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Try adjusting your search or category filter
            </ThemedText>
          </ThemedView>
        )}

        <View />
      </ScrollView>

      {/* Exercise Detail Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              {selectedExercise?.name || 'Exercise Details'}
            </ThemedText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeModal}
            >
              <FontAwesome5 name="times" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Simple test content */}
          <View style={{ padding: 20 }}>
            <ThemedText style={{ fontSize: 18, marginBottom: 10 }}>
              Test Modal Content
            </ThemedText>
            <ThemedText style={{ fontSize: 16, marginBottom: 20 }}>
              Exercise: {selectedExercise?.name}
            </ThemedText>
            <ThemedText style={{ fontSize: 14, marginBottom: 20, color: '#666' }}>
              Modal is working! showModal = {showModal.toString()}
            </ThemedText>
            <TouchableOpacity
              style={{
                backgroundColor: '#007AFF',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={closeModal}
            >
              <ThemedText style={{ color: 'white', fontSize: 16 }}>
                Close Modal
              </ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </ThemedView>
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
  searchFilterSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#000',
  },
  categoryContainer: {
    marginBottom: 5,
  },
  categoryContent: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  selectedCategoryButton: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  exerciseList: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  resultCount: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 14,
    opacity: 0.7,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: '#000',
  },
  exerciseCategory: {
    fontSize: 14,
    opacity: 0.6,
    color: '#666',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exerciseDetails: {
    marginBottom: 8,
  },
  targetMuscles: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  equipment: {
    fontSize: 14,
    opacity: 0.7,
    color: '#666',
  },
  addToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addedToListButton: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  addToListText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  addedToListText: {
    color: '#4CAF50',
  },
  chevronContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  exerciseModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  exerciseModalIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  exerciseModalInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseModalCategory: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  exerciseModalDifficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exerciseModalDifficultyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  muscleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  muscleTagText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  equipmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  equipmentTagText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  instructionNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    fontStyle: 'italic',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
    gap: 10,
  },
  videoButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E65100',
  },
  modalBottomPadding: {
    height: 50,
  },

});
