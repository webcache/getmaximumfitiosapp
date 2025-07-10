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

      // Strategy 1: Single array filter with other constraints
      if (arrayFilters.length <= 1) {
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
          const searchKeyword = filters.searchTerm.toLowerCase();
          constraints.push(where('searchKeywords', 'array-contains', searchKeyword));
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
        const pageSize = filters.pageSize || 50; // Increased to allow for client-side filtering
        constraints.push(limit(pageSize));

        if (filters.lastDoc) {
          constraints.push(startAfter(filters.lastDoc));
        }

        // Apply all constraints
        const finalQuery = query(exercisesRef, ...constraints);
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
            difficulty: data.difficulty,
            variation_on: data.variation_on,
          };
        });

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
            difficulty: data.difficulty,
            variation_on: data.variation_on,
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
            
            if (!nameMatch && !categoryMatch && !muscleMatch && !equipmentMatch) return false;
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
        difficulty: data.difficulty,
        variation_on: data.variation_on,
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
          difficulty: data.difficulty,
          variation_on: data.variation_on,
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
          difficulty: data.difficulty,
          variation_on: data.variation_on,
        };
      });
    } catch (error) {
      console.error('Error fetching similar exercises:', error);
      return [];
    }
  }

  /**
   * Clear cache (useful when data is updated)
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Check if exercises exist in Firestore
   */
  async hasExercises(): Promise<boolean> {
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const q = query(exercisesRef, limit(1));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking if exercises exist:', error);
      return false;
    }
  }
}

// Export singleton instance
export const firestoreExerciseService = new FirestoreExerciseService();
export default firestoreExerciseService;
