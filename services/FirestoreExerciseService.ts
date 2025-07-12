import { db } from '@/firebase';
import { Exercise, ExerciseSearchFilters } from '@/types/exercise';
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  limit,
  orderBy,
  OrderByDirection,
  query,
  QueryDocumentSnapshot,
  startAfter,
  where
} from 'firebase/firestore';

interface FirestoreExercise extends Exercise {
  searchKeywords: string[];
  all_muscles: string[];
  level: string;
  createdAt: Date;
  updatedAt: Date;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | undefined;
}

interface ExerciseMetadata {
  totalExercises: number;
  categories: string[];
  equipment: string[];
  muscles: string[];
  levels: string[];
  difficulties: string[];
  lastUpdated: Date;
  version: string;
  dataSource: string;
}

interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  total?: number;
}

interface FirestoreSearchFilters extends ExerciseSearchFilters {
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null;
  sortBy?: 'name' | 'category' | 'difficulty' | 'createdAt';
  sortDirection?: OrderByDirection;
}

class FirestoreExerciseService {
  private exercisesCollection = 'exercises';
  private metadataDoc = 'exercise_metadata/current';
  private cache: {
    metadata?: ExerciseMetadata;
    categories?: string[];
    equipment?: string[];
    muscles?: string[];
  } = {};

  /**
   * Get exercise metadata (categories, equipment, etc.)
   */
  async getMetadata(): Promise<ExerciseMetadata | null> {
    if (this.cache.metadata) {
      return this.cache.metadata;
    }

    try {
      const metadataRef = doc(db, 'exercise_metadata', 'current');
      const metadataSnap = await getDoc(metadataRef);
      
      if (!metadataSnap.exists()) {
        console.warn('Exercise metadata not found');
        return null;
      }

      const metadata = metadataSnap.data() as ExerciseMetadata;
      this.cache.metadata = metadata;
      return metadata;
    } catch (error) {
      console.error('Error fetching exercise metadata:', error);
      return null;
    }
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    if (this.cache.categories) {
      return this.cache.categories;
    }

    const metadata = await this.getMetadata();
    if (metadata) {
      this.cache.categories = metadata.categories;
      return metadata.categories;
    }

    // Fallback: query exercises directly
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const snapshot = await getDocs(exercisesRef);
      const categories = [...new Set(snapshot.docs.map(doc => doc.data().category))].sort();
      this.cache.categories = categories;
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get all available equipment
   */
  async getEquipment(): Promise<string[]> {
    if (this.cache.equipment) {
      return this.cache.equipment;
    }

    const metadata = await this.getMetadata();
    if (metadata) {
      this.cache.equipment = metadata.equipment;
      return metadata.equipment;
    }

    // Fallback: query exercises directly
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const snapshot = await getDocs(exercisesRef);
      const equipment = [...new Set(
        snapshot.docs.flatMap(doc => doc.data().equipment || [])
      )].sort();
      this.cache.equipment = equipment;
      return equipment;
    } catch (error) {
      console.error('Error fetching equipment:', error);
      return [];
    }
  }

  /**
   * Get all available muscle groups
   */
  async getMuscleGroups(): Promise<string[]> {
    if (this.cache.muscles) {
      return this.cache.muscles;
    }

    const metadata = await this.getMetadata();
    if (metadata) {
      this.cache.muscles = metadata.muscles;
      return metadata.muscles;
    }

    // Fallback: query exercises directly
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const snapshot = await getDocs(exercisesRef);
      const muscles = [...new Set(
        snapshot.docs.flatMap(doc => [
          ...(doc.data().primary_muscles || []),
          ...(doc.data().secondary_muscles || [])
        ])
      )].sort();
      this.cache.muscles = muscles;
      return muscles;
    } catch (error) {
      console.error('Error fetching muscle groups:', error);
      return [];
    }
  }

  /**
   * Search exercises with advanced filtering and pagination
   * Uses a priority-based approach to handle Firestore's composite index limitations
   */
  async searchExercises(filters: FirestoreSearchFilters = {}): Promise<PaginatedResult<Exercise>> {
    console.log('🔍 FirestoreExerciseService.searchExercises called with filters:', filters);
    
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      
      // Build query constraints with priority-based filtering
      const constraints = [];
      
      // Count array-contains filters to determine strategy
      const arrayFilters = [];
      if (filters.equipment && filters.equipment.length > 0) arrayFilters.push('equipment');
      if (filters.primaryMuscle) arrayFilters.push('primaryMuscle');
      if (filters.secondaryMuscle) arrayFilters.push('secondaryMuscle');
      if (filters.searchTerm) arrayFilters.push('searchTerm');

      console.log('🔍 Array filters detected:', arrayFilters);

      // Strategy 1: Single array filter with other constraints
      if (arrayFilters.length <= 1) {
        console.log('📊 Using Strategy 1: Single array filter');
        
        // Category filter
        if (filters.category) {
          constraints.push(where('category', '==', filters.category));
        }

        // Equipment filter (highest priority for array filters)
        if (filters.equipment && filters.equipment.length > 0) {
          if (filters.equipment.length === 1) {
            constraints.push(where('equipment', 'array-contains', filters.equipment[0]));
          } else {
            constraints.push(where('equipment', 'array-contains-any', filters.equipment.slice(0, 10)));
          }
        }
        // Primary muscle filter
        else if (filters.primaryMuscle) {
          constraints.push(where('primary_muscles', 'array-contains', filters.primaryMuscle));
        }
        // Secondary muscle filter
        else if (filters.secondaryMuscle) {
          constraints.push(where('secondary_muscles', 'array-contains', filters.secondaryMuscle));
        }
        // Search term filter
        else if (filters.searchTerm) {
          const searchTerm = filters.searchTerm.toLowerCase();
          console.log('🔍 Search term detected:', searchTerm, '- will fetch more documents for client-side filtering');
          
          // Don't add Firestore constraints for search terms - rely on client-side filtering
          // This ensures we get comprehensive results regardless of case sensitivity
        }

        // Difficulty filter
        if (filters.difficulty) {
          constraints.push(where('difficulty', '==', filters.difficulty));
        }

        // Sorting
        const sortBy = filters.sortBy || 'name';
        const sortDirection = filters.sortDirection || 'asc';
        constraints.push(orderBy(sortBy, sortDirection));

        // Pagination
        let pageSize = filters.pageSize || 50;
        
        // If we have a search term, increase page size to get more results for client-side filtering
        if (filters.searchTerm) {
          pageSize = Math.max(pageSize, 200); // Get more exercises to filter from
          console.log('📊 Increased page size for search to:', pageSize);
        }
        
        constraints.push(limit(pageSize));

        if (filters.lastDoc) {
          constraints.push(startAfter(filters.lastDoc));
        }

        console.log('📊 Query constraints:', constraints.length);

        // Apply all constraints
        const finalQuery = query(exercisesRef, ...constraints);
        const snapshot = await getDocs(finalQuery);

        console.log('✅ Firestore query returned:', snapshot.docs.length, 'documents');

        let exercises: Exercise[] = snapshot.docs.map(doc => {
          const data = doc.data() as FirestoreExercise;
          
          // Debug first exercise
          if (doc.id === 'Ab_Roller') {
            console.log('🔍 Raw Firestore data for Ab_Roller:', JSON.stringify(data, null, 2));
            console.log('🔍 Video field value:', data.video);
            console.log('🔍 Video field type:', typeof data.video);
            console.log('🔍 All fields in document:', Object.keys(data));
          }
          
          return {
            id: doc.id,
            name: data.name,
            category: data.category,
            primary_muscles: data.primary_muscles,
            secondary_muscles: data.secondary_muscles,
            equipment: data.equipment,
            instructions: data.instructions,
            description: data.description,
            tips: data.tips,
            difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
            variation_on: data.variation_on,
            video: data.video,
          };
        });

        // If we have a search term, always apply client-side filtering
        if (filters.searchTerm) {
          console.log('🔍 Applying client-side search filtering for term:', filters.searchTerm);
          const searchTerm = filters.searchTerm.toLowerCase();
          const originalCount = exercises.length;
          
          exercises = exercises.filter(exercise => {
            const nameMatch = exercise.name.toLowerCase().includes(searchTerm);
            const categoryMatch = exercise.category.toLowerCase().includes(searchTerm);
            const muscleMatch = [...exercise.primary_muscles, ...exercise.secondary_muscles]
              .some(muscle => muscle.toLowerCase().includes(searchTerm));
            const equipmentMatch = exercise.equipment.some(eq => eq.toLowerCase().includes(searchTerm));
            const instructionsMatch = exercise.instructions?.some(instruction => 
              instruction.toLowerCase().includes(searchTerm)) || false;
            const descriptionMatch = exercise.description?.toLowerCase().includes(searchTerm) || false;
            
            return nameMatch || categoryMatch || muscleMatch || equipmentMatch || instructionsMatch || descriptionMatch;
          });
          
          console.log('🔍 Client-side filtering reduced results from', originalCount, 'to', exercises.length);
        }

        console.log('📊 Converted exercises:', exercises.length);
        if (exercises.length > 0) {
          console.log('🔍 First exercise:', exercises[0].name);
        }

        return {
          data: exercises,
          lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
          hasMore: snapshot.docs.length === pageSize,
        };
      }

      // Strategy 2: Multiple array filters - use most restrictive filter in query, then client-side filtering
      else {
        // Determine the most restrictive filter (prioritize in order: category, equipment, primaryMuscle, searchTerm)
        const baseConstraints: any[] = [];
        const usedFilters: Set<string> = new Set();
        
        if (filters.category) {
          baseConstraints.push(where('category', '==', filters.category));
        }

        // Choose the most restrictive array filter for the query
        if (filters.equipment && filters.equipment.length > 0) {
          if (filters.equipment.length === 1) {
            baseConstraints.push(where('equipment', 'array-contains', filters.equipment[0]));
          } else {
            baseConstraints.push(where('equipment', 'array-contains-any', filters.equipment.slice(0, 10)));
          }
          usedFilters.add('equipment');
        } else if (filters.primaryMuscle) {
          baseConstraints.push(where('primary_muscles', 'array-contains', filters.primaryMuscle));
          usedFilters.add('primaryMuscle');
        } else if (filters.searchTerm) {
          const searchKeyword = filters.searchTerm.toLowerCase();
          baseConstraints.push(where('searchKeywords', 'array-contains', searchKeyword));
          usedFilters.add('searchTerm');
        }

        // Sorting
        const sortBy = filters.sortBy || 'name';
        const sortDirection = filters.sortDirection || 'asc';
        baseConstraints.push(orderBy(sortBy, sortDirection));

        // Larger page size for client-side filtering
        const pageSize = Math.max(filters.pageSize || 50, 50);
        baseConstraints.push(limit(pageSize));

        if (filters.lastDoc) {
          baseConstraints.push(startAfter(filters.lastDoc));
        }

        // Execute the base query
        const finalQuery = query(exercisesRef, ...baseConstraints);
        const snapshot = await getDocs(finalQuery);

        let exercises: Exercise[] = snapshot.docs.map(doc => {
          const data = doc.data() as FirestoreExercise;
          return {
            id: doc.id,
            name: data.name,
            category: data.category,
            primary_muscles: data.primary_muscles,
            secondary_muscles: data.secondary_muscles,
            equipment: data.equipment,
            instructions: data.instructions,
            description: data.description,
            tips: data.tips,
            difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
            variation_on: data.variation_on,
            video: data.video,
          };
        });

        // Apply client-side filtering for remaining criteria
        exercises = exercises.filter(exercise => {
          // Apply filters that weren't used in the Firestore query
          
          // Equipment filter (if not used in query)
          if (filters.equipment && filters.equipment.length > 0 && !usedFilters.has('equipment')) {
            const hasEquipment = filters.equipment.some(eq => exercise.equipment.includes(eq));
            if (!hasEquipment) return false;
          }

          // Primary muscle filter (if not used in query)
          if (filters.primaryMuscle && !usedFilters.has('primaryMuscle')) {
            if (!exercise.primary_muscles.includes(filters.primaryMuscle)) return false;
          }

          // Secondary muscle filter
          if (filters.secondaryMuscle) {
            if (!exercise.secondary_muscles.includes(filters.secondaryMuscle)) return false;
          }

          // Search term filter (if not used in query)
          if (filters.searchTerm && !usedFilters.has('searchTerm')) {
            const searchTerm = filters.searchTerm.toLowerCase();
            const nameMatch = exercise.name.toLowerCase().includes(searchTerm);
            const categoryMatch = exercise.category.toLowerCase().includes(searchTerm);
            const muscleMatch = [...exercise.primary_muscles, ...exercise.secondary_muscles]
              .some(muscle => muscle.toLowerCase().includes(searchTerm));
            const equipmentMatch = exercise.equipment.some(eq => eq.toLowerCase().includes(searchTerm));
            const instructionsMatch = exercise.instructions?.some(instruction => 
              instruction.toLowerCase().includes(searchTerm)) || false;
            const descriptionMatch = exercise.description?.toLowerCase().includes(searchTerm) || false;
            
            if (!nameMatch && !categoryMatch && !muscleMatch && !equipmentMatch && !instructionsMatch && !descriptionMatch) {
              return false;
            }
          }

          // Difficulty filter
          if (filters.difficulty) {
            if (exercise.difficulty !== filters.difficulty) return false;
          }

          return true;
        });

        return {
          data: exercises,
          lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
          hasMore: snapshot.docs.length === pageSize,
        };
      }
    } catch (error) {
      console.error('Error searching exercises:', error);
      return {
        data: [],
        lastDoc: null,
        hasMore: false,
      };
    }
  }

  /**
   * Get exercise by ID
   */
  async getExerciseById(id: string): Promise<Exercise | null> {
    try {
      const exerciseRef = doc(db, this.exercisesCollection, id);
      const exerciseSnap = await getDoc(exerciseRef);

      if (!exerciseSnap.exists()) {
        return null;
      }

      const data = exerciseSnap.data() as FirestoreExercise;
      return {
        id: exerciseSnap.id,
        name: data.name,
        category: data.category,
        primary_muscles: data.primary_muscles,
        secondary_muscles: data.secondary_muscles,
        equipment: data.equipment,
        instructions: data.instructions,
        description: data.description,
        tips: data.tips,
        difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
        variation_on: data.variation_on,
        video: data.video,
      };
    } catch (error) {
      console.error('Error fetching exercise by ID:', error);
      return null;
    }
  }

  /**
   * Get exercises by category
   */
  async getExercisesByCategory(category: string, pageSize = 20): Promise<PaginatedResult<Exercise>> {
    return this.searchExercises({ category, pageSize });
  }

  /**
   * Get exercises by muscle group
   */
  async getExercisesByMuscle(muscle: string, pageSize = 20): Promise<PaginatedResult<Exercise>> {
    return this.searchExercises({ primaryMuscle: muscle, pageSize });
  }

  /**
   * Get exercises by equipment
   */
  async getExercisesByEquipment(equipment: string[], pageSize = 20): Promise<PaginatedResult<Exercise>> {
    return this.searchExercises({ equipment, pageSize });
  }

  /**
   * Get popular/featured exercises
   */
  async getPopularExercises(pageSize = 10): Promise<Exercise[]> {
    try {
      // Get exercises from popular categories
      const popularCategories = ['strength', 'cardio', 'plyometrics'];
      const exercisesRef = collection(db, this.exercisesCollection);
      
      const q = query(
        exercisesRef,
        where('category', 'in', popularCategories),
        orderBy('name'),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data() as FirestoreExercise;
        return {
          id: doc.id,
          name: data.name,
          category: data.category,
          primary_muscles: data.primary_muscles,
          secondary_muscles: data.secondary_muscles,
          equipment: data.equipment,
          instructions: data.instructions,
          description: data.description,
          tips: data.tips,
          difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
          variation_on: data.variation_on,
          video: data.video,
        };
      });
    } catch (error) {
      console.error('Error fetching popular exercises:', error);
      return [];
    }
  }

  /**
   * Get similar exercises based on muscle groups
   */
  async getSimilarExercises(exerciseId: string, maxResults = 5): Promise<Exercise[]> {
    try {
      const exercise = await this.getExerciseById(exerciseId);
      if (!exercise) return [];

      const exercisesRef = collection(db, this.exercisesCollection);
      
      // Find exercises with similar primary muscles
      const q = query(
        exercisesRef,
        where('primary_muscles', 'array-contains-any', exercise.primary_muscles),
        where('id', '!=', exerciseId),
        orderBy('name'),
        limit(maxResults)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data() as FirestoreExercise;
        return {
          id: doc.id,
          name: data.name,
          category: data.category,
          primary_muscles: data.primary_muscles,
          secondary_muscles: data.secondary_muscles,
          equipment: data.equipment,
          instructions: data.instructions,
          description: data.description,
          tips: data.tips,
          difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
          variation_on: data.variation_on,
          video: data.video,
        };
      });
    } catch (error) {
      console.error('Error fetching similar exercises:', error);
      return [];
    }
  }

  /**
   * Get all exercises without filters (for testing)
   */
  async getAllExercisesSimple(pageSize = 20): Promise<Exercise[]> {
    try {
      console.log('🔍 Getting all exercises (simple query)...');
      const exercisesRef = collection(db, this.exercisesCollection);
      const q = query(exercisesRef, limit(pageSize));
      const snapshot = await getDocs(q);
      
      console.log('📊 Simple query returned:', snapshot.docs.length, 'exercises');
      
      const exercises: Exercise[] = snapshot.docs.map(doc => {
        const data = doc.data() as FirestoreExercise;
        return {
          id: doc.id,
          name: data.name,
          category: data.category,
          primary_muscles: data.primary_muscles || [],
          secondary_muscles: data.secondary_muscles || [],
          equipment: data.equipment || [],
          instructions: data.instructions || [],
          description: data.description || '',
          tips: data.tips || [],
          difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
          variation_on: data.variation_on || [],
          video: data.video,
        };
      });
      
      if (exercises.length > 0) {
        console.log('📋 First exercise:', exercises[0]);
      }
      
      return exercises;
    } catch (error) {
      console.error('❌ Error getting all exercises:', error);
      return [];
    }
  }

  /**
   * Check if exercises exist in Firestore and get count
   */
  async hasExercises(): Promise<boolean> {
    try {
      console.log('🔍 Checking if exercises exist in Firestore...');
      const exercisesRef = collection(db, this.exercisesCollection);
      const q = query(exercisesRef, limit(10));
      const snapshot = await getDocs(q);
      const hasExercises = !snapshot.empty;
      console.log('📊 Firestore exercises check:', hasExercises ? `Found ${snapshot.docs.length} exercises` : 'No exercises found');
      
      if (hasExercises) {
        // Log some sample exercise names to verify data structure
        const sampleExercises = snapshot.docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, name: data.name, category: data.category };
        });
        console.log('📋 Sample exercises:', sampleExercises);
      }
      
      return hasExercises;
    } catch (error) {
      console.error('❌ Error checking if exercises exist:', error);
      return false;
    }
  }

  /**
   * Debug function to test basic Firestore connectivity
   */
  async debugFirestoreConnection(): Promise<void> {
    console.log('🔍 Testing Firestore connection...');
    
    try {
      // Test 1: Check exercises collection
      const exercisesRef = collection(db, this.exercisesCollection);
      const exercisesSnapshot = await getDocs(query(exercisesRef, limit(5)));
      console.log('📊 Exercises collection:', exercisesSnapshot.size, 'documents found');
      
      if (exercisesSnapshot.size > 0) {
        const firstDoc = exercisesSnapshot.docs[0];
        console.log('🔍 First exercise document:', {
          id: firstDoc.id,
          name: firstDoc.data().name,
          category: firstDoc.data().category,
          hasSearchKeywords: !!firstDoc.data().searchKeywords
        });
      }

      // Test 2: Check metadata collection
      const metadataRef = doc(db, 'exercise_metadata', 'current');
      const metadataSnap = await getDoc(metadataRef);
      console.log('📊 Metadata document exists:', metadataSnap.exists());
      
      if (metadataSnap.exists()) {
        const metadata = metadataSnap.data();
        console.log('🔍 Metadata:', {
          totalExercises: metadata.totalExercises,
          categoriesCount: metadata.categories?.length || 0,
          equipmentCount: metadata.equipment?.length || 0,
          musclesCount: metadata.muscles?.length || 0
        });
      }

    } catch (error) {
      console.error('❌ Firestore connection test failed:', error);
    }
  }

  /**
   * Debug function to test search functionality
   */
  async debugSearch(searchTerm: string): Promise<void> {
    console.log('🔍 Testing search for:', searchTerm);
    
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      
      // Test 1: Simple name search
      const nameQuery = query(
        exercisesRef,
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(5)
      );
      const nameSnapshot = await getDocs(nameQuery);
      console.log('📊 Name search results:', nameSnapshot.size);

      // Test 2: Search keywords search
      const keywordQuery = query(
        exercisesRef,
        where('searchKeywords', 'array-contains', searchTerm.toLowerCase()),
        limit(5)
      );
      const keywordSnapshot = await getDocs(keywordQuery);
      console.log('📊 Keyword search results:', keywordSnapshot.size);

      // Test 3: Get all exercises and filter client-side
      const allQuery = query(exercisesRef, limit(20));
      const allSnapshot = await getDocs(allQuery);
      const clientFilteredResults = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               data.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               data.primary_muscles?.some((muscle: string) => muscle.toLowerCase().includes(searchTerm.toLowerCase()));
      });
      console.log('📊 Client-side filtered results:', clientFilteredResults.length);

    } catch (error) {
      console.error('❌ Search test failed:', error);
    }
  }

  /**
   * Map difficulty/level string to the correct enum values
   */
  private mapDifficultyLevel(level?: string): "Beginner" | "Intermediate" | "Advanced" | undefined {
    if (!level) return undefined;
    
    const lowerLevel = level.toLowerCase();
    switch (lowerLevel) {
      case 'beginner':
      case 'easy':
      case 'novice':
        return 'Beginner';
      case 'intermediate':
      case 'medium':
      case 'moderate':
        return 'Intermediate';
      case 'advanced':
      case 'hard':
      case 'expert':
        return 'Advanced';
      default:
        console.warn('Unknown difficulty level:', level);
        return undefined;
    }
  }
}

// Export singleton instance
export const firestoreExerciseService = new FirestoreExerciseService();
export default firestoreExerciseService;
