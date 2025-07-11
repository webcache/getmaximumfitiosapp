import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import type { ExerciseSearchFilters, Exercise as ExerciseType } from '@/types/exercise';
import {
  exerciseLibrary,
  initializeExerciseLibrary,
} from '@/utils/exerciseLibrary';
import { userExerciseStorage } from '@/utils/userExerciseStorage';
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [searchTerm, selectedCategory, selectedEquipment, selectedMuscle]); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeLibrary = async () => {
    console.log('🚀 Initializing exercise library...');
    try {
      // First, test Firestore connection
      await (await import('../services/FirestoreExerciseService')).firestoreExerciseService.debugFirestoreConnection();
      
      await initializeExerciseLibrary();
      console.log('✅ Exercise library initialized');
      
      const [categories, equipment, muscles] = await Promise.all([
        exerciseLibrary.getCategories(),
        exerciseLibrary.getEquipment(),
        exerciseLibrary.getMuscleGroups()
      ]);
      
      console.log('📊 Library data loaded:', {
        categories: categories.length,
        equipment: equipment.length,
        muscles: muscles.length
      });
      
      setCategories(categories);
      setEquipment(equipment);
      setMuscles(muscles);
      await searchExercises();
    } catch (error) {
      console.error('❌ Failed to initialize exercise library:', error);
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
          console.error('❌ Failed to load fallback data:', fallbackError);
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

    console.log('🔍 Searching exercises with filters:', filters);
    
    // Debug search if there's a search term
    if (searchTerm) {
      await (await import('../services/FirestoreExerciseService')).firestoreExerciseService.debugSearch(searchTerm);
    }
    
    try {
      const results = await exerciseLibrary.searchExercises(filters);
      console.log('✅ Search results:', results.length, 'exercises found');
      console.log('🔍 First few results:', results.slice(0, 3).map(e => e.name));
      setExercises(results);
    } catch (error) {
      console.error('❌ Error searching exercises:', error);
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
    console.log('🎯 Exercise pressed:', exercise.name);
    console.log('🎯 onExerciseSelect provided:', !!onExerciseSelect);
    
    if (onExerciseSelect) {
      console.log('🎯 Calling onExerciseSelect');
      onExerciseSelect(exercise);
    } else {
      console.log('🎯 Opening exercise detail modal');
      setSelectedExercise(exercise);
      setShowExerciseDetail(true);
    }
  };

  const handleAddToList = (exercise: ExerciseType) => {
    try {
      userExerciseStorage.addExercise(exercise);
      Alert.alert('Success', `${exercise.name} added to your list!`);
    } catch (error) {
      console.error('Error adding exercise to list:', error);
      Alert.alert('Error', 'Failed to add exercise to your list. Please try again.');
    }
  };

  const renderExerciseItem = ({ item }: { item: ExerciseType }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => {
        console.log('🎯 Card touched for:', item.name);
        handleExercisePress(item);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseNameContainer}>
          <ThemedText style={styles.exerciseName}>{item.name}</ThemedText>
          <View style={styles.categoryBadge}>
            <ThemedText style={styles.categoryText}>{item.category}</ThemedText>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addToListButtonSmall}
          onPress={(event) => {
            event.stopPropagation();
            handleAddToList(item);
          }}
        >
          <FontAwesome5 name="plus" size={12} color="#007AFF" />
        </TouchableOpacity>
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
        <FontAwesome5 name="dumbbell" size={10} color="#666" />
        <ThemedText style={styles.equipmentText}>
          {item.equipment.length > 0 ? item.equipment.join(', ') : 'No equipment needed'}
        </ThemedText>
        <View style={styles.videoLinkButton}>
          <FontAwesome5 name="video" size={12} color="#007AFF" />
        </View>
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
             
                  <View style={styles.videoLinkArea}>                
                  <TouchableOpacity 
                    style={styles.videoLinkButton}
                    onPress={() => {
                      if (selectedExercise.video) {
                        // You can use Linking.openURL or a WebView here
                        console.log('Opening video:', selectedExercise.video);
                        Alert.alert(
                          'Video Link',
                          'Open video in browser?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Open', 
                              onPress: async () => {
                                const { Linking } = await import('react-native');
                                Linking.openURL(selectedExercise.video!);
                              }
                            }
                          ]
                        );
                      }
                    }}
                  >
                    <FontAwesome5 name="play" size={20} color="#007AFF" />
                    <ThemedText style={styles.videoLinkText}>Watch Exercise Demo</ThemedText>
                    <FontAwesome5 name="external-link-alt" size={12} color="#007AFF" />
                  </TouchableOpacity>
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
        
        {/* Add to List Button */}
        {selectedExercise && (
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.addToListButton}
              onPress={() => handleAddToList(selectedExercise)}
            >
              <FontAwesome5 name="plus" size={16} color="#fff" />
              <ThemedText style={styles.addToListButtonText}>Add to My List</ThemedText>
            </TouchableOpacity>
          </View>
        )}
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
    <ThemedView style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      {/* Search and Filter Header */}
      <View style={[styles.searchContainer, { paddingTop: Math.max(10, insets.top) }]}>
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

      {/* Results Count - Only show if no exercises found */}
      {exercises.length === 0 && !loading && (
        <View style={styles.resultsHeader}>
          <ThemedText style={styles.resultsCount}>
            No exercises found
          </ThemedText>
        </View>
      )}

      {/* Exercise List */}
      <FlatList
        data={exercises}
        renderItem={renderExerciseItem}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        style={styles.exerciseList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.exerciseListContent,
          { paddingBottom: Math.max(10, insets.bottom) }
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
    padding: 12,
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
    paddingHorizontal: 12,
    paddingBottom: 8,
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
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  exerciseList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  exerciseListContent: {
    flexGrow: 1,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
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
  exerciseNameContainer: {
    flex: 1,
    marginRight: 10,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  muscleGroup: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  muscleLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  muscleText: {
    fontSize: 11,
    color: '#333',
    flex: 1,
    textTransform: 'capitalize',
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  equipmentText: {
    fontSize: 11,
    color: '#666',
    textTransform: 'capitalize',
  },
  exerciseCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
  },
  addToListButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
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
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 14,
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
  // Add to List Button Styles
  addToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    gap: 8,
  },
  addToListButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Video Link Button Styles

  videoLinkArea: {
    position: 'absolute',
    top: 30,
    right: 0,
    flexDirection: 'row',
  },

  videoLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 0,
    paddingVertical: 2,
    paddingHorizontal: 2,
    gap: 8,
    borderWidth: 0,
    borderColor: '#007AFF',
    position: 'absolute',
    bottom: 6,
    right: 4,
  },
  videoLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    flex: 1,
  },
});
