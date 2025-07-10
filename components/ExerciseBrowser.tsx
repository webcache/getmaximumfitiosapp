import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import type { ExerciseSearchFilters, Exercise as ExerciseType } from '@/types/exercise';
import {
  exerciseLibrary,
  initializeExerciseLibrary,
} from '@/utils/exerciseLibrary';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ExerciseBrowserProps {
  onExerciseSelect?: (exercise: ExerciseType) => void;
  initialFilters?: ExerciseSearchFilters;
}

export default function ExerciseBrowser({ onExerciseSelect, initialFilters }: ExerciseBrowserProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExerciseType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [muscles, setMuscles] = useState<string[]>([]);

  useEffect(() => {
    initializeLibrary();
  }, []);

  useEffect(() => {
    if (initialFilters) {
      setSelectedCategory(initialFilters.category || '');
      setSelectedEquipment(initialFilters.equipment || []);
      setSelectedMuscle(initialFilters.primaryMuscle || '');
      setSearchTerm(initialFilters.searchTerm || '');
    }
  }, [initialFilters]);

  useEffect(() => {
    if (exerciseLibrary.isInitialized()) {
      searchExercises();
    }
  }, [searchTerm, selectedCategory, selectedEquipment, selectedMuscle]);

  const initializeLibrary = async () => {
    try {
      await initializeExerciseLibrary();
      const [categories, equipment, muscles] = await Promise.all([
        exerciseLibrary.getCategories(),
        exerciseLibrary.getEquipment(),
        exerciseLibrary.getMuscleGroups()
      ]);
      setCategories(categories);
      setEquipment(equipment);
      setMuscles(muscles);
      await searchExercises();
    } catch (error) {
      console.error('Failed to initialize exercise library:', error);
      // Even if there's an error, the library might have fallen back to local data
      // Try to get what data is available
      if (exerciseLibrary.isInitialized()) {
        try {
          const [categories, equipment, muscles] = await Promise.all([
            exerciseLibrary.getCategories(),
            exerciseLibrary.getEquipment(),
            exerciseLibrary.getMuscleGroups()
          ]);
          setCategories(categories);
          setEquipment(equipment);
          setMuscles(muscles);
          await searchExercises();
        } catch (fallbackError) {
          console.error('Failed to load fallback data:', fallbackError);
        }
      } else {
        Alert.alert(
          'Exercise Library', 
          'Failed to load exercise data. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const searchExercises = async () => {
    const filters: ExerciseSearchFilters = {
      searchTerm: searchTerm || undefined,
      category: selectedCategory || undefined,
      equipment: selectedEquipment.length > 0 ? selectedEquipment : undefined,
      primaryMuscle: selectedMuscle || undefined,
    };

    try {
      const results = await exerciseLibrary.searchExercises(filters);
      setExercises(results);
    } catch (error) {
      console.error('Error searching exercises:', error);
      setExercises([]);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedEquipment([]);
    setSelectedMuscle('');
  };

  const toggleEquipment = (equipmentItem: string) => {
    setSelectedEquipment(prev => 
      prev.includes(equipmentItem)
        ? prev.filter(item => item !== equipmentItem)
        : [...prev, equipmentItem]
    );
  };

  const handleExercisePress = (exercise: ExerciseType) => {
    if (onExerciseSelect) {
      onExerciseSelect(exercise);
    } else {
      setSelectedExercise(exercise);
      setShowExerciseDetail(true);
    }
  };

  const renderExerciseItem = ({ item }: { item: ExerciseType }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => handleExercisePress(item)}
    >
      <View style={styles.exerciseHeader}>
        <ThemedText style={styles.exerciseName}>{item.name}</ThemedText>
        <View style={styles.categoryBadge}>
          <ThemedText style={styles.categoryText}>{item.category}</ThemedText>
        </View>
      </View>
      
      <View style={styles.muscleGroup}>
        <ThemedText style={styles.muscleLabel}>Primary: </ThemedText>
        <ThemedText style={styles.muscleText}>
          {item.primary_muscles.join(', ')}
        </ThemedText>
      </View>
      
      {item.secondary_muscles.length > 0 && (
        <View style={styles.muscleGroup}>
          <ThemedText style={styles.muscleLabel}>Secondary: </ThemedText>
          <ThemedText style={styles.muscleText}>
            {item.secondary_muscles.join(', ')}
          </ThemedText>
        </View>
      )}
      
      <View style={styles.equipmentRow}>
        <FontAwesome5 name="dumbbell" size={14} color="#666" />
        <ThemedText style={styles.equipmentText}>
          {item.equipment.length > 0 ? item.equipment.join(', ') : 'No equipment needed'}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <ThemedText style={styles.modalTitle}>Filter Exercises</ThemedText>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowFilters(false)}
          >
            <FontAwesome5 name="times" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {/* Category Filter */}
          <View style={styles.filterSection}>
            <ThemedText style={styles.filterTitle}>Category</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, !selectedCategory && styles.selectedChip]}
                onPress={() => setSelectedCategory('')}
              >
                <ThemedText style={[styles.chipText, !selectedCategory && styles.selectedChipText]}>
                  All
                </ThemedText>
              </TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[styles.filterChip, selectedCategory === category && styles.selectedChip]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <ThemedText style={[styles.chipText, selectedCategory === category && styles.selectedChipText]}>
                    {category}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Muscle Group Filter */}
          <View style={styles.filterSection}>
            <ThemedText style={styles.filterTitle}>Muscle Group</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, !selectedMuscle && styles.selectedChip]}
                onPress={() => setSelectedMuscle('')}
              >
                <ThemedText style={[styles.chipText, !selectedMuscle && styles.selectedChipText]}>
                  All
                </ThemedText>
              </TouchableOpacity>
              {muscles.map(muscle => (
                <TouchableOpacity
                  key={muscle}
                  style={[styles.filterChip, selectedMuscle === muscle && styles.selectedChip]}
                  onPress={() => setSelectedMuscle(muscle)}
                >
                  <ThemedText style={[styles.chipText, selectedMuscle === muscle && styles.selectedChipText]}>
                    {muscle}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Equipment Filter */}
          <View style={styles.filterSection}>
            <ThemedText style={styles.filterTitle}>Equipment</ThemedText>
            <View style={styles.equipmentGrid}>
              {equipment.map(equipmentItem => (
                <TouchableOpacity
                  key={equipmentItem}
                  style={[
                    styles.equipmentChip,
                    selectedEquipment.includes(equipmentItem) && styles.selectedChip
                  ]}
                  onPress={() => toggleEquipment(equipmentItem)}
                >
                  <ThemedText style={[
                    styles.chipText,
                    selectedEquipment.includes(equipmentItem) && styles.selectedChipText
                  ]}>
                    {equipmentItem}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <ThemedText style={styles.clearButtonText}>Clear All</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.applyButton} 
            onPress={() => setShowFilters(false)}
          >
            <ThemedText style={styles.applyButtonText}>Apply Filters</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderExerciseDetailModal = () => (
    <Modal
      visible={showExerciseDetail}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowExerciseDetail(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <ThemedText style={styles.modalTitle}>{selectedExercise?.name}</ThemedText>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowExerciseDetail(false)}
          >
            <FontAwesome5 name="times" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {selectedExercise && (
            <>
              <View style={styles.exerciseDetailSection}>
                <ThemedText style={styles.detailSectionTitle}>Category</ThemedText>
                <ThemedText style={styles.detailText}>{selectedExercise.category}</ThemedText>
              </View>

              <View style={styles.exerciseDetailSection}>
                <ThemedText style={styles.detailSectionTitle}>Primary Muscles</ThemedText>
                <ThemedText style={styles.detailText}>
                  {selectedExercise.primary_muscles.join(', ')}
                </ThemedText>
              </View>

              {selectedExercise.secondary_muscles.length > 0 && (
                <View style={styles.exerciseDetailSection}>
                  <ThemedText style={styles.detailSectionTitle}>Secondary Muscles</ThemedText>
                  <ThemedText style={styles.detailText}>
                    {selectedExercise.secondary_muscles.join(', ')}
                  </ThemedText>
                </View>
              )}

              <View style={styles.exerciseDetailSection}>
                <ThemedText style={styles.detailSectionTitle}>Equipment</ThemedText>
                <ThemedText style={styles.detailText}>
                  {selectedExercise.equipment.length > 0 
                    ? selectedExercise.equipment.join(', ') 
                    : 'No equipment needed'
                  }
                </ThemedText>
              </View>

              {selectedExercise.description && (
                <View style={styles.exerciseDetailSection}>
                  <ThemedText style={styles.detailSectionTitle}>Description</ThemedText>
                  <ThemedText style={styles.detailText}>{selectedExercise.description}</ThemedText>
                </View>
              )}

              {selectedExercise.instructions.length > 0 && (
                <View style={styles.exerciseDetailSection}>
                  <ThemedText style={styles.detailSectionTitle}>Instructions</ThemedText>
                  {selectedExercise.instructions.map((instruction: string, index: number) => (
                    <View key={index} style={styles.instructionItem}>
                      <ThemedText style={styles.instructionNumber}>{index + 1}.</ThemedText>
                      <ThemedText style={styles.instructionText}>{instruction}</ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {selectedExercise.tips && selectedExercise.tips.length > 0 && (
                <View style={styles.exerciseDetailSection}>
                  <ThemedText style={styles.detailSectionTitle}>Tips</ThemedText>
                  {selectedExercise.tips.map((tip: string, index: number) => (
                    <ThemedText key={index} style={styles.tipText}>• {tip}</ThemedText>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading exercise library...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingBottom: insets.bottom + 80 }]}>
      {/* Search and Filter Header */}
      <View style={[styles.searchContainer, { paddingTop: Math.max(15, insets.top) }]}>
        <View style={styles.searchInputContainer}>
          <FontAwesome5 name="search" size={16} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search exercises..."
            placeholderTextColor="#999"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <FontAwesome5 name="times" size={16} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <FontAwesome5 name="filter" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {(selectedCategory || selectedMuscle || selectedEquipment.length > 0) && (
        <View style={styles.activeFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedCategory && (
              <View style={styles.activeFilterChip}>
                <ThemedText style={styles.activeFilterText}>
                  Category: {selectedCategory}
                </ThemedText>
                <TouchableOpacity onPress={() => setSelectedCategory('')}>
                  <FontAwesome5 name="times" size={12} color="#007AFF" />
                </TouchableOpacity>
              </View>
            )}
            {selectedMuscle && (
              <View style={styles.activeFilterChip}>
                <ThemedText style={styles.activeFilterText}>
                  Muscle: {selectedMuscle}
                </ThemedText>
                <TouchableOpacity onPress={() => setSelectedMuscle('')}>
                  <FontAwesome5 name="times" size={12} color="#007AFF" />
                </TouchableOpacity>
              </View>
            )}
            {selectedEquipment.map(item => (
              <View key={item} style={styles.activeFilterChip}>
                <ThemedText style={styles.activeFilterText}>
                  Equipment: {item}
                </ThemedText>
                <TouchableOpacity onPress={() => toggleEquipment(item)}>
                  <FontAwesome5 name="times" size={12} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <ThemedText style={styles.resultsCount}>
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} found
        </ThemedText>
      </View>

      {/* Exercise List */}
      <FlatList
        data={exercises}
        renderItem={renderExerciseItem}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        style={styles.exerciseList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.exerciseListContent,
          { paddingBottom: Math.max(20, insets.bottom) }
        ]}
      />

      {renderFilterModal()}
      {renderExerciseDetailModal()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilters: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF20',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  resultsHeader: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  exerciseList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  exerciseListContent: {
    flexGrow: 1,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
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
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  categoryBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  muscleGroup: {
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
  equipmentRow: {
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
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedChip: {
    backgroundColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
  },
  selectedChipText: {
    color: '#fff',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Exercise Detail Modal Styles
  exerciseDetailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textTransform: 'capitalize',
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
});
