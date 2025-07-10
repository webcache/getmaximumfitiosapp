import { firestoreExerciseService } from '../services/FirestoreExerciseService';
import { Exercise, ExerciseCategoryGroup, ExerciseSearchFilters, ExerciseStats } from '../types/exercise';
// import { MaxLift } from './index';
// TODO: Update the import path below to the correct location of MaxLift, or define MaxLift here if needed.
// Define MaxLift type locally since it's not exported from '../types/exercise'
export interface MaxLift {
  exerciseName: string;
  weight: number;
  date?: string;
}

// Interface for the loaded exercise data
export interface ExerciseLibraryData {
  categories: string[];
  equipment: string[];
  exercises: Exercise[];
}

// Re-export for backward compatibility
export interface WorkoutExercise {
  exercise: Exercise;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  rest?: number;
  notes?: string;
}

class ExerciseLibrary {
  private isFirestoreInitialized = false;

  /**
   * Initialize the exercise library
   * Uses Firestore as the primary data source
   */
  async initialize(): Promise<void> {
    try {
      const hasExercises = await firestoreExerciseService.hasExercises();
      if (hasExercises) {
        console.log('✅ Exercise library initialized with Firestore data');
        this.isFirestoreInitialized = true;
        return;
      }
      
      throw new Error('No exercises found in Firestore');
    } catch (error) {
      console.error('❌ Failed to initialize exercise library:', error);
      throw new Error('Exercise library initialization failed. Please ensure exercises are migrated to Firestore.');
    }
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    return await firestoreExerciseService.getCategories();
  }

  /**
   * Get all available equipment types
   */
  async getEquipment(): Promise<string[]> {
    return await firestoreExerciseService.getEquipment();
  }

  /**
   * Get all unique muscle groups (primary and secondary)
   */
  async getMuscleGroups(): Promise<string[]> {
    return await firestoreExerciseService.getMuscleGroups();
  }

  /**
   * Get all exercises (paginated)
   */
  async getAllExercises(pageSize = 50): Promise<Exercise[]> {
    const result = await firestoreExerciseService.searchExercises({ pageSize });
    return result.data;
  }

  /**
   * Search exercises with various filters
   */
  async searchExercises(filters: ExerciseSearchFilters): Promise<Exercise[]> {
    const result = await firestoreExerciseService.searchExercises(filters);
    return result.data;
  }

  /**
   * Get exercises by category
   */
  async getExercisesByCategory(category: string): Promise<Exercise[]> {
    const result = await firestoreExerciseService.getExercisesByCategory(category);
    return result.data;
  }

  /**
   * Get exercises by muscle group
   */
  async getExercisesByMuscle(muscle: string): Promise<Exercise[]> {
    const result = await firestoreExerciseService.getExercisesByMuscle(muscle);
    return result.data;
  }

  /**
   * Get exercises by equipment
   */
  async getExercisesByEquipment(equipment: string[]): Promise<Exercise[]> {
    const result = await firestoreExerciseService.getExercisesByEquipment(equipment);
    return result.data;
  }

  /**
   * Get exercise by exact name
   */
  async getExerciseByName(name: string): Promise<Exercise | undefined> {
    const result = await firestoreExerciseService.searchExercises({ searchTerm: name, pageSize: 1 });
    return result.data.find(ex => ex.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Get exercise by ID
   */
  async getExerciseById(id: string): Promise<Exercise | undefined> {
    const exercise = await firestoreExerciseService.getExerciseById(id);
    return exercise || undefined;
  }

  /**
   * Get recommended exercises based on user's max lifts
   */
  async getRecommendedExercises(maxLifts: MaxLift[], targetMuscles?: string[]): Promise<Exercise[]> {
    // Get primary exercises from max lifts
    const maxLiftExercises = maxLifts.map(lift => lift.exerciseName.toLowerCase());
    
    // Build search filters
    const filters: ExerciseSearchFilters = {};

    // If target muscles specified, search by those
    if (targetMuscles && targetMuscles.length > 0) {
      // Search for exercises with the first target muscle as primary
      filters.primaryMuscle = targetMuscles[0];
    }

    const result = await firestoreExerciseService.searchExercises({ 
      ...filters, 
      pageSize: 50 
    });
    
    // Filter out exercises that are already in max lifts
    const newExercises = result.data.filter(ex =>
      !maxLiftExercises.includes(ex.name.toLowerCase())
    );

    // Sort by category preference (strength training first)
    return newExercises.sort((a, b) => {
      const categoryOrder = ['strength', 'olympic weightlifting', 'strongman', 'plyometrics'];
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    }).slice(0, 20); // Limit to 20 recommendations
  }

  /**
   * Get complementary exercises for a given exercise
   */
  async getComplementaryExercises(exercise: Exercise): Promise<Exercise[]> {
    // Use Firestore service to get similar exercises
    const similar = await firestoreExerciseService.getSimilarExercises(exercise.id!, 10);
    
    // Filter to get truly complementary exercises (same or opposing muscle groups)
    return similar.filter(ex => {
      if (ex.id === exercise.id) return false;
      
      // Same primary muscles
      const samePrimary = ex.primary_muscles.some(muscle =>
        exercise.primary_muscles.includes(muscle)
      );
      
      // Opposing muscle groups
      const opposingMuscles: { [key: string]: string[] } = {
        'pectorals': ['latissimus dorsi', 'rhomboids'],
        'latissimus dorsi': ['pectorals'],
        'biceps': ['triceps'],
        'triceps': ['biceps'],
        'quadriceps': ['hamstrings'],
        'hamstrings': ['quadriceps'],
        'abdominals': ['erector spinae'],
        'erector spinae': ['abdominals']
      };
      
      const opposing = exercise.primary_muscles.some(muscle =>
        opposingMuscles[muscle]?.some(oppMuscle =>
          ex.primary_muscles.includes(oppMuscle)
        )
      );

      return samePrimary || opposing;
    }).slice(0, 10);
  }

  /**
   * Create a workout template based on muscle groups and available equipment
   */
  async createWorkout(
    targetMuscles: string[],
    availableEquipment: string[] = [],
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    duration: number = 60 // minutes
  ): Promise<WorkoutExercise[]> {
    const filters: ExerciseSearchFilters = {
      equipment: availableEquipment.length > 0 ? availableEquipment : undefined,
      primaryMuscle: targetMuscles.length > 0 ? targetMuscles[0] : undefined
    };

    const result = await firestoreExerciseService.searchExercises(filters);
    const exercises = result.data;

    // Sort by category preference for difficulty level
    const sortedExercises = exercises.sort((a, b) => {
      const difficultyOrder: { [key: string]: string[] } = {
        beginner: ['strength', 'cardio', 'stretching'],
        intermediate: ['strength', 'plyometrics', 'strongman', 'cardio'],
        advanced: ['olympic weightlifting', 'strongman', 'plyometrics', 'strength']
      };
      
      const order = difficultyOrder[difficulty];
      const aIndex = order.indexOf(a.category);
      const bIndex = order.indexOf(b.category);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });

    // Select exercises based on duration
    const exerciseCount = Math.min(Math.floor(duration / 10), sortedExercises.length, 8);
    const selectedExercises = sortedExercises.slice(0, exerciseCount);

    // Create workout with suggested sets/reps based on difficulty
    return selectedExercises.map(exercise => {
      const baseSetsReps = {
        beginner: { sets: 2, reps: 10, rest: 90 },
        intermediate: { sets: 3, reps: 12, rest: 75 },
        advanced: { sets: 4, reps: 15, rest: 60 }
      };

      const { sets, reps, rest } = baseSetsReps[difficulty];

      return {
        exercise,
        sets,
        reps,
        rest,
        notes: `${difficulty} level workout`
      };
    });
  }

  /**
   * Get exercise variations
   */
  async getExerciseVariations(exerciseName: string): Promise<Exercise[]> {
    const baseExercise = await this.getExerciseByName(exerciseName);
    if (!baseExercise) return [];

    // Search for exercises with similar names or that mention the base exercise
    const result = await firestoreExerciseService.searchExercises({ 
      searchTerm: exerciseName.split(' ')[0] // Use first word of exercise name
    });

    // Filter to get actual variations
    return result.data.filter(ex =>
      ex.id !== baseExercise.id &&
      (ex.name.toLowerCase().includes(exerciseName.toLowerCase().split(' ')[0]) ||
       ex.variation_on?.includes(exerciseName.toLowerCase()) ||
       baseExercise.variation_on?.includes(ex.name.toLowerCase()))
    ).slice(0, 10);
  }

  /**
   * Get exercise statistics
   */
  async getLibraryStats(): Promise<{
    totalExercises: number;
    categoriesCount: number;
    equipmentCount: number;
    muscleGroupsCount: number;
    exercisesByCategory: { [key: string]: number };
    exercisesByEquipment: { [key: string]: number };
  }> {
    try {
      const metadata = await firestoreExerciseService.getMetadata();
      if (metadata) {
        return {
          totalExercises: metadata.totalExercises,
          categoriesCount: metadata.categories.length,
          equipmentCount: metadata.equipment.length,
          muscleGroupsCount: metadata.muscles.length,
          exercisesByCategory: {}, // Could be enhanced with detailed counts
          exercisesByEquipment: {}  // Could be enhanced with detailed counts
        };
      }
    } catch (error) {
      console.error('Error getting library stats:', error);
    }

    // Fallback to basic stats
    return {
      totalExercises: 0,
      categoriesCount: 0,
      equipmentCount: 0,
      muscleGroupsCount: 0,
      exercisesByCategory: {},
      exercisesByEquipment: {}
    };
  }

  /**
   * Check if the library is initialized
   */
  isInitialized(): boolean {
    return this.isFirestoreInitialized;
  }

  /**
   * Get exercises grouped by category
   */
  async getExercisesByCategories(): Promise<ExerciseCategoryGroup[]> {
    const categories = await this.getCategories();
    const categoryGroups: ExerciseCategoryGroup[] = [];

    for (const category of categories) {
      const result = await firestoreExerciseService.getExercisesByCategory(category);
      const exercises = result.data.sort((a, b) => a.name.localeCompare(b.name));

      categoryGroups.push({
        id: category.toLowerCase().replace(/\s+/g, '_'),
        name: category,
        description: this.getCategoryDescription(category),
        exercises,
        exerciseCount: exercises.length
      });
    }

    return categoryGroups.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Gets description for exercise category
   */
  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'strength': 'Build muscle and increase strength with resistance training exercises',
      'cardio': 'Improve cardiovascular health and endurance with aerobic exercises',
      'olympic weightlifting': 'Master advanced weightlifting techniques like snatch and clean & jerk',
      'plyometrics': 'Develop explosive power and speed with jump training',
      'strongman': 'Build functional strength with real-world movement patterns',
      'stretching': 'Improve flexibility and mobility with stretching exercises',
      'calisthenics': 'Master bodyweight movements and functional fitness'
    };

    return descriptions[category.toLowerCase()] || 'Various exercises for fitness and health';
  }

  /**
   * Get similar exercises based on muscle groups
   */
  async getSimilarExercises(exercise: Exercise, limit = 5): Promise<Exercise[]> {
    if (!exercise.id) return [];
    
    return await firestoreExerciseService.getSimilarExercises(exercise.id, limit);
  }

  /**
   * Gets popular exercises (those targeting major muscle groups)
   */
  async getPopularExercises(limit = 10): Promise<Exercise[]> {
    return await firestoreExerciseService.getPopularExercises(limit);
  }

  private getPopularityScore(exercise: Exercise): number {
    let score = 0;
    
    // Strength exercises get higher score
    if (exercise.category === 'strength') score += 3;
    
    // Common equipment gets higher score
    const commonEquipment = ['barbell', 'dumbbell', 'none'];
    if (exercise.equipment.some((eq: string) => commonEquipment.includes(eq))) score += 2;
    
    // Major muscle groups get higher score
    const majorMuscles = ['chest', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings'];
    if (exercise.primary_muscles.some((muscle: string) => majorMuscles.includes(muscle))) score += 1;
    
    return score;
  }

  /**
   * Get enhanced exercise statistics
   */
  async getEnhancedStats(): Promise<ExerciseStats> {
    try {
      const [categories, equipment, muscles, metadata] = await Promise.all([
        this.getCategories(),
        this.getEquipment(),
        this.getMuscleGroups(),
        firestoreExerciseService.getMetadata()
      ]);

      return {
        totalExercises: metadata?.totalExercises || 0,
        categoriesCount: categories.length,
        equipmentTypes: equipment,
        muscleGroups: muscles
      };
    } catch (error) {
      console.error('Error getting enhanced stats:', error);
      return {
        totalExercises: 0,
        categoriesCount: 0,
        equipmentTypes: [],
        muscleGroups: []
      };
    }
  }
}

// Create and export a singleton instance
export const exerciseLibrary = new ExerciseLibrary();

// Export utility functions
export const initializeExerciseLibrary = async (): Promise<void> => {
  if (!exerciseLibrary.isInitialized()) {
    await exerciseLibrary.initialize();
  }
};

export const searchExercises = async (filters: ExerciseSearchFilters): Promise<Exercise[]> => {
  return await exerciseLibrary.searchExercises(filters);
};

export const getExercisesByMuscle = async (muscle: string): Promise<Exercise[]> => {
  return await exerciseLibrary.getExercisesByMuscle(muscle);
};

export const getExercisesByCategory = async (category: string): Promise<Exercise[]> => {
  return await exerciseLibrary.getExercisesByCategory(category);
};

export const createWorkout = async (
  targetMuscles: string[],
  availableEquipment?: string[],
  difficulty?: 'beginner' | 'intermediate' | 'advanced',
  duration?: number
): Promise<WorkoutExercise[]> => {
  return await exerciseLibrary.createWorkout(targetMuscles, availableEquipment, difficulty, duration);
};

export default exerciseLibrary;
