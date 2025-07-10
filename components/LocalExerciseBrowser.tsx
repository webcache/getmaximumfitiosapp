import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Local exercise data - same as in exerciseLibrary.tsx
const sampleExercises = [
  {
    id: '1',
    name: 'Push-ups',
    category: 'Chest',
    targetMuscles: ['Chest', 'Triceps', 'Shoulders'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    instructions: ['Start in plank position', 'Lower body to ground', 'Push back up'],
    tips: ['Keep your body straight', 'Don\'t let your hips sag'],
  },
  {
    id: '2',
    name: 'Pull-ups',
    category: 'Back',
    targetMuscles: ['Lats', 'Biceps', 'Rear Delts'],
    equipment: ['Pull-up Bar'],
    difficulty: 'Intermediate',
    instructions: ['Hang from bar', 'Pull body up', 'Lower with control'],
    tips: ['Full range of motion', 'Control the descent'],
  },
  {
    id: '3',
    name: 'Squats',
    category: 'Legs',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    instructions: ['Stand with feet shoulder-width apart', 'Lower into squat', 'Return to standing'],
    tips: ['Keep chest up', 'Knees track over toes'],
  },
  {
    id: '4',
    name: 'Deadlifts',
    category: 'Back',
    targetMuscles: ['Hamstrings', 'Glutes', 'Lower Back'],
    equipment: ['Barbell'],
    difficulty: 'Advanced',
    instructions: ['Stand with barbell', 'Hinge at hips', 'Lift weight to standing'],
    tips: ['Keep back straight', 'Drive through heels'],
  },
  {
    id: '5',
    name: 'Plank',
    category: 'Core',
    targetMuscles: ['Core', 'Shoulders'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    instructions: ['Start in push-up position', 'Hold position', 'Keep core tight'],
    tips: ['Straight line from head to heels', 'Breathe normally'],
  },
  {
    id: '6',
    name: 'Bench Press',
    category: 'Chest',
    targetMuscles: ['Chest', 'Triceps', 'Shoulders'],
    equipment: ['Barbell', 'Bench'],
    difficulty: 'Intermediate',
    instructions: ['Lie on bench', 'Lower bar to chest', 'Press up'],
    tips: ['Feet flat on floor', 'Control the weight'],
  },
  {
    id: '7',
    name: 'Shoulder Press',
    category: 'Shoulders',
    targetMuscles: ['Shoulders', 'Triceps'],
    equipment: ['Dumbbells'],
    difficulty: 'Intermediate',
    instructions: ['Hold dumbbells at shoulder height', 'Press overhead', 'Lower with control'],
    tips: ['Core engaged', 'Don\'t arch back excessively'],
  },
  {
    id: '8',
    name: 'Bicep Curls',
    category: 'Arms',
    targetMuscles: ['Biceps'],
    equipment: ['Dumbbells'],
    difficulty: 'Beginner',
    instructions: ['Hold dumbbells at sides', 'Curl up to shoulders', 'Lower slowly'],
    tips: ['Keep elbows stationary', 'Full range of motion'],
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

interface LocalExerciseBrowserProps {
  onExerciseSelect?: (exercise: Exercise) => void;
  initialCategory?: string;
}

export default function LocalExerciseBrowser({ onExerciseSelect, initialCategory }: LocalExerciseBrowserProps) {
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>(sampleExercises);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>(sampleExercises);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);

  // Extract unique values from exercises
  const categories = ['All', ...Array.from(new Set(sampleExercises.map(ex => ex.category)))];
  const equipment = Array.from(new Set(sampleExercises.flatMap(ex => ex.equipment)));
  const muscles = Array.from(new Set(sampleExercises.flatMap(ex => ex.targetMuscles)));

  useEffect(() => {
    filterExercises();
  }, [searchTerm, selectedCategory, selectedEquipment]);

  const filterExercises = () => {
    let filtered = exercises;

    // Filter by category
    if (selectedCategory && selectedCategory !== 'All') {
      filtered = filtered.filter(ex => ex.category === selectedCategory);
    }

    // Filter by equipment
    if (selectedEquipment.length > 0) {
      filtered = filtered.filter(ex => 
        selectedEquipment.some(eq => ex.equipment.includes(eq))
      );
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(query) ||
        ex.category.toLowerCase().includes(query) ||
        ex.targetMuscles.some(muscle => muscle.toLowerCase().includes(query)) ||
        ex.equipment.some(eq => eq.toLowerCase().includes(query))
      );
    }

    setFilteredExercises(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedEquipment([]);
  };

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowExerciseDetail(true);
    onExerciseSelect?.(exercise);
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
      default:
        return 'dumbbell';
    }
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => handleExercisePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseIconContainer}>
          <FontAwesome5
            name={getCategoryIcon(item.category)}
            size={20}
            color="#007AFF"
          />
        </View>
        <View style={styles.exerciseInfo}>
          <ThemedText style={styles.exerciseName}>{item.name}</ThemedText>
          <ThemedText style={styles.exerciseCategory}>{item.category}</ThemedText>
        </View>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(item.difficulty) },
          ]}
        >
          <ThemedText style={styles.difficultyText}>
            {item.difficulty}
          </ThemedText>
        </View>
      </View>

      <View style={styles.exerciseDetails}>
        <ThemedText style={styles.targetMuscles}>
          Target: {item.targetMuscles.join(', ')}
        </ThemedText>
        {item.equipment.length > 0 && (
          <ThemedText style={styles.equipment}>
            Equipment: {item.equipment.join(', ')}
          </ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );

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
      {/* Search and Filter Header */}
      <ThemedView style={styles.header}>
        <View style={styles.searchContainer}>
          <FontAwesome5 name="search" size={16} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <FontAwesome5 name="filter" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Category Filter */}
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

        <ThemedText style={styles.resultCount}>
          {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
        </ThemedText>
      </ThemedView>

      {/* Exercise List */}
      <FlatList
        data={filteredExercises}
        renderItem={renderExerciseItem}
        keyExtractor={(item) => item.id}
        style={styles.exerciseList}
        contentContainerStyle={styles.exerciseListContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <ThemedView style={styles.emptyState}>
            <FontAwesome5 name="search" size={48} color="#CCC" />
            <ThemedText style={styles.emptyText}>No exercises found</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Try adjusting your search or filters
            </ThemedText>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <ThemedText style={styles.clearButtonText}>Clear Filters</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      />

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Filters</ThemedText>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <FontAwesome5 name="times" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Equipment Filter */}
            <ThemedText style={styles.filterSectionTitle}>Equipment</ThemedText>
            <View style={styles.filterOptions}>
              {equipment.map((eq) => (
                <TouchableOpacity
                  key={eq}
                  style={[
                    styles.filterOption,
                    selectedEquipment.includes(eq) && styles.selectedFilterOption,
                  ]}
                  onPress={() => {
                    setSelectedEquipment(prev =>
                      prev.includes(eq)
                        ? prev.filter(e => e !== eq)
                        : [...prev, eq]
                    );
                  }}
                >
                  <ThemedText
                    style={[
                      styles.filterOptionText,
                      selectedEquipment.includes(eq) && styles.selectedFilterOptionText,
                    ]}
                  >
                    {eq}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <ThemedText style={styles.clearFiltersButtonText}>Clear All</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton} 
                onPress={() => setShowFilters(false)}
              >
                <ThemedText style={styles.applyButtonText}>Apply Filters</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Exercise Detail Modal */}
      <Modal
        visible={showExerciseDetail}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedExercise && (
          <ThemedView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{selectedExercise.name}</ThemedText>
              <TouchableOpacity onPress={() => setShowExerciseDetail(false)}>
                <FontAwesome5 name="times" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.exerciseDetailHeader}>
                <View style={styles.exerciseDetailIconContainer}>
                  <FontAwesome5
                    name={getCategoryIcon(selectedExercise.category)}
                    size={32}
                    color="#007AFF"
                  />
                </View>
                <View style={styles.exerciseDetailInfo}>
                  <ThemedText style={styles.exerciseDetailCategory}>
                    {selectedExercise.category}
                  </ThemedText>
                  <View
                    style={[
                      styles.exerciseDetailDifficultyBadge,
                      { backgroundColor: getDifficultyColor(selectedExercise.difficulty) },
                    ]}
                  >
                    <ThemedText style={styles.exerciseDetailDifficultyText}>
                      {selectedExercise.difficulty}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.exerciseDetailSection}>
                <ThemedText style={styles.sectionTitle}>Target Muscles</ThemedText>
                <ThemedText style={styles.sectionContent}>
                  {selectedExercise.targetMuscles.join(', ')}
                </ThemedText>
              </View>

              <View style={styles.exerciseDetailSection}>
                <ThemedText style={styles.sectionTitle}>Equipment</ThemedText>
                <ThemedText style={styles.sectionContent}>
                  {selectedExercise.equipment.join(', ')}
                </ThemedText>
              </View>

              <View style={styles.exerciseDetailSection}>
                <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>
                {selectedExercise.instructions.map((instruction, index) => (
                  <View key={index} style={styles.instructionItem}>
                    <ThemedText style={styles.instructionNumber}>{index + 1}.</ThemedText>
                    <ThemedText style={styles.instructionText}>{instruction}</ThemedText>
                  </View>
                ))}
              </View>

              {selectedExercise.tips && selectedExercise.tips.length > 0 && (
                <View style={styles.exerciseDetailSection}>
                  <ThemedText style={styles.sectionTitle}>Tips</ThemedText>
                  {selectedExercise.tips.map((tip, index) => (
                    <View key={index} style={styles.tipItem}>
                      <FontAwesome5 name="lightbulb" size={14} color="#FF9800" />
                      <ThemedText style={styles.tipText}>{tip}</ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </ThemedView>
        )}
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
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
  filterButton: {
    padding: 8,
  },
  categoryContainer: {
    marginBottom: 10,
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
  resultCount: {
    paddingHorizontal: 20,
    paddingBottom: 5,
    fontSize: 14,
    opacity: 0.7,
  },
  exerciseList: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  exerciseListContent: {
    padding: 20,
    paddingBottom: 100,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
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
    marginBottom: 20,
  },
  clearButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedFilterOption: {
    backgroundColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedFilterOptionText: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  clearFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exerciseDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  exerciseDetailIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseDetailInfo: {
    flex: 1,
  },
  exerciseDetailCategory: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 8,
  },
  exerciseDetailDifficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  exerciseDetailDifficultyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exerciseDetailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    color: '#007AFF',
    minWidth: 20,
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
    opacity: 0.8,
  },
});
