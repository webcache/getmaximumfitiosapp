import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { myExercisesService } from '@/services/MyExercisesService';
import { Exercise } from '@/types/exercise';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface MyExerciseSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  searchTerm?: string; // Optional search term to filter exercises
}

export default function MyExerciseSelector({
  visible,
  onClose,
  onSelectExercise,
  searchTerm = '',
}: MyExerciseSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  
  const [myExercises, setMyExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Load user's exercises when modal opens
  useEffect(() => {
    if (visible && user) {
      loadMyExercises();
    }
  }, [visible, user]);

  // Filter exercises based on search term
  useEffect(() => {
    if (!myExercises.length) {
      setFilteredExercises([]);
      return;
    }

    const term = localSearchTerm.toLowerCase().trim();
    if (!term) {
      setFilteredExercises(myExercises);
      return;
    }

    const filtered = myExercises.filter(exercise => 
      exercise.name.toLowerCase().includes(term) ||
      exercise.category.toLowerCase().includes(term) ||
      exercise.primary_muscles.some(muscle => muscle.toLowerCase().includes(term)) ||
      exercise.secondary_muscles.some(muscle => muscle.toLowerCase().includes(term))
    );
    
    setFilteredExercises(filtered);
  }, [myExercises, localSearchTerm]);

  // Update local search term when prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  const loadMyExercises = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const exercises = await myExercisesService.getMyExercises(user.uid);
      setMyExercises(exercises);
    } catch (error) {
      console.error('Error loading My Exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExercise = (exercise: Exercise) => {
    onSelectExercise(exercise);
    onClose();
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={[styles.exerciseItem, { borderBottomColor: colors.text + '20' }]}
      onPress={() => handleSelectExercise(item)}
    >
      <View style={styles.exerciseInfo}>
        <ThemedText style={styles.exerciseName}>{item.name}</ThemedText>
        <View style={styles.exerciseDetails}>
          <ThemedText style={[styles.exerciseCategory, { color: colors.text + '80' }]}>
            {item.category}
          </ThemedText>
          {item.primary_muscles.length > 0 && (
            <ThemedText style={[styles.exerciseMuscles, { color: colors.text + '60' }]}>
              • {item.primary_muscles.slice(0, 2).join(', ')}
              {item.primary_muscles.length > 2 && ` +${item.primary_muscles.length - 2}`}
            </ThemedText>
          )}
        </View>
      </View>
      <FontAwesome5 name="chevron-right" size={14} color={colors.text + '40'} />
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome5 name="dumbbell" size={48} color={colors.text + '30'} />
      <ThemedText style={[styles.emptyTitle, { color: colors.text + '60' }]}>
        {localSearchTerm ? 'No matching exercises found' : 'No saved exercises yet'}
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.text + '40' }]}>
        {localSearchTerm 
          ? 'Try adjusting your search terms'
          : 'Add exercises to your collection from the exercise browser'
        }
      </ThemedText>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.text + '20' }]}>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
          </TouchableOpacity>
          
          <ThemedText type="subtitle">My Exercises</ThemedText>
          
          <View style={styles.headerRight}>
            <ThemedText style={[styles.countText, { color: colors.text + '60' }]}>
              {filteredExercises.length} exercises
            </ThemedText>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.text + '05' }]}>
          <FontAwesome5 name="search" size={16} color={colors.text + '60'} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={localSearchTerm}
            onChangeText={setLocalSearchTerm}
            placeholder="Search your exercises..."
            placeholderTextColor={colors.text + '60'}
            autoCorrect={false}
          />
          {localSearchTerm.length > 0 && (
            <TouchableOpacity
              onPress={() => setLocalSearchTerm('')}
              style={styles.clearButton}
            >
              <FontAwesome5 name="times" size={14} color={colors.text + '60'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText style={[styles.loadingText, { color: colors.text + '60' }]}>
              Loading your exercises...
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id || item.name}
            style={styles.list}
            contentContainerStyle={filteredExercises.length === 0 ? styles.emptyContainer : undefined}
            ListEmptyComponent={EmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  countText: {
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  list: {
    flex: 1,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseCategory: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  exerciseMuscles: {
    fontSize: 12,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
