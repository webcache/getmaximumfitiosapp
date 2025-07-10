import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import exercise data - using a sample for now
const sampleExercises: Exercise[] = [
  {
    id: '1',
    name: 'Push-ups',
    category: 'Chest',
    targetMuscles: ['Chest', 'Triceps', 'Shoulders'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    instructions: ['Start in plank position', 'Lower body to ground', 'Push back up'],
  },
  {
    id: '2',
    name: 'Pull-ups',
    category: 'Back',
    targetMuscles: ['Lats', 'Biceps', 'Rear Delts'],
    equipment: ['Pull-up Bar'],
    difficulty: 'Intermediate',
    instructions: ['Hang from bar', 'Pull body up', 'Lower with control'],
  },
  {
    id: '3',
    name: 'Squats',
    category: 'Legs',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    instructions: ['Stand with feet shoulder-width apart', 'Lower into squat', 'Return to standing'],
  },
  {
    id: '4',
    name: 'Deadlifts',
    category: 'Back',
    targetMuscles: ['Hamstrings', 'Glutes', 'Lower Back'],
    equipment: ['Barbell'],
    difficulty: 'Advanced',
    instructions: ['Stand with barbell', 'Hinge at hips', 'Lift weight to standing'],
  },
  {
    id: '5',
    name: 'Plank',
    category: 'Core',
    targetMuscles: ['Core', 'Shoulders'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    instructions: ['Start in push-up position', 'Hold position', 'Keep core tight'],
  },
];

interface Exercise {
  id: string;
  name: string;
  category: string;
  targetMuscles: string[];
  equipment: string[];
  difficulty: string;
  instructions: string[];
  tips?: string[];
}

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio'];

  useEffect(() => {
    // Load exercises from the sample exercise library
    setExercises(sampleExercises);
    setFilteredExercises(sampleExercises);
    setLoading(false);
  }, []);

  useEffect(() => {
    filterExercises();
  }, [searchQuery, selectedCategory, exercises]);

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
          exercise.targetMuscles.some((muscle) => muscle.toLowerCase().includes(query)) ||
          exercise.category.toLowerCase().includes(query)
      );
    }

    setFilteredExercises(filtered);
  };

  const handleExercisePress = (exercise: Exercise) => {
    // TODO: Navigate to exercise detail screen or show modal
    console.log('Selected exercise:', exercise.name);
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
                  { backgroundColor: getDifficultyColor(exercise.difficulty) },
                ]}
              >
                <ThemedText style={styles.difficultyText}>
                  {exercise.difficulty}
                </ThemedText>
              </View>
            </View>

            <View style={styles.exerciseDetails}>
              <ThemedText style={styles.targetMuscles}>
                Target: {exercise.targetMuscles.join(', ')}
              </ThemedText>
              {exercise.equipment.length > 0 && (
                <ThemedText style={styles.equipment}>
                  Equipment: {exercise.equipment.join(', ')}
                </ThemedText>
              )}
            </View>

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

        <View style={[styles.bottomPadding, { height: Math.max(100, insets.bottom + 80) }]} />
      </ScrollView>
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
  bottomPadding: {
    height: 100,
  },
});
