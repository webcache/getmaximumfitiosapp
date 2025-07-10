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
   */
  async searchExercises(filters: FirestoreSearchFilters = {}): Promise<PaginatedResult<Exercise>> {
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      let baseQuery = query(exercisesRef);

      // Build query constraints
      const constraints = [];

      // Category filter
      if (filters.category) {
        constraints.push(where('category', '==', filters.category));
      }

      // Equipment filter (array-contains-any for multiple equipment)
      if (filters.equipment && filters.equipment.length > 0) {
        if (filters.equipment.length === 1) {
          constraints.push(where('equipment', 'array-contains', filters.equipment[0]));
        } else {
          constraints.push(where('equipment', 'array-contains-any', filters.equipment.slice(0, 10))); // Firestore limit
        }
      }

      // Primary muscle filter
      if (filters.primaryMuscle) {
        constraints.push(where('primary_muscles', 'array-contains', filters.primaryMuscle));
      }

      // Secondary muscle filter
      if (filters.secondaryMuscle) {
        constraints.push(where('secondary_muscles', 'array-contains', filters.secondaryMuscle));
      }

      // Difficulty filter
      if (filters.difficulty) {
        constraints.push(where('difficulty', '==', filters.difficulty));
      }

      // Search term filter (using searchKeywords array)
      if (filters.searchTerm) {
        const searchKeyword = filters.searchTerm.toLowerCase();
        constraints.push(where('searchKeywords', 'array-contains', searchKeyword));
      }

      // Sorting
      const sortBy = filters.sortBy || 'name';
      const sortDirection = filters.sortDirection || 'asc';
      constraints.push(orderBy(sortBy, sortDirection));

      // Pagination
      const pageSize = filters.pageSize || 20;
      constraints.push(limit(pageSize));

      if (filters.lastDoc) {
        constraints.push(startAfter(filters.lastDoc));
      }

      // Apply all constraints
      const finalQuery = query(exercisesRef, ...constraints);
      const snapshot = await getDocs(finalQuery);

      const exercises: Exercise[] = snapshot.docs.map(doc => {
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
