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
  private data: ExerciseLibraryData | null = null;
  private dataUrl = 'https://raw.githubusercontent.com/exercemus/exercises/minified/minified-exercises.json';

  /**
   * Initialize the exercise library by fetching data
   */
  async initialize(): Promise<void> {
    try {
      const response = await fetch(this.dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch exercise data: ${response.statusText}`);
      }
      const rawData = await response.json();
      
      // Transform and enhance the data
      const exercises: Exercise[] = rawData.map((exercise: any, index: number) => ({
        id: `exercise_${index}`,
        ...exercise,
        // Ensure arrays are always arrays
        equipment: Array.isArray(exercise.equipment) ? exercise.equipment : [],
        instructions: Array.isArray(exercise.instructions) ? exercise.instructions : [],
        primary_muscles: Array.isArray(exercise.primary_muscles) ? exercise.primary_muscles : [],
        secondary_muscles: Array.isArray(exercise.secondary_muscles) ? exercise.secondary_muscles : [],
        variation_on: Array.isArray(exercise.variation_on) ? exercise.variation_on : undefined,
        // Add difficulty rating
        difficulty: this.determineDifficulty(exercise),
      }));

      // Extract unique categories and equipment
      const categories = [...new Set(exercises.map(ex => ex.category))];
      const equipment = [...new Set(exercises.flatMap(ex => ex.equipment))];

      this.data = {
        exercises,
        categories: categories.sort(),
        equipment: equipment.sort()
      };
      
      console.log(`Loaded ${this.data.exercises.length} exercises`);
    } catch (error) {
      console.error('Error initializing exercise library:', error);
      throw error;
    }
  }

  /**
   * Determines exercise difficulty based on category and equipment
   */
  private determineDifficulty(exercise: any): 'Beginner' | 'Intermediate' | 'Advanced' {
    const category = exercise.category?.toLowerCase() || '';
    const equipment = exercise.equipment || [];
    const name = exercise.name?.toLowerCase() || '';

    // Advanced exercises
    if (
      category === 'olympic weightlifting' ||
      category === 'strongman' ||
      name.includes('olympic') ||
      name.includes('snatch') ||
      name.includes('clean and jerk') ||
      name.includes('atlas stone')
    ) {
      return 'Advanced';
    }

    // Intermediate exercises
    if (
      category === 'plyometrics' ||
      equipment.includes('barbell') ||
      equipment.includes('kettlebell') ||
      name.includes('deadlift') ||
      name.includes('squat') ||
      name.includes('bench press')
    ) {
      return 'Intermediate';
    }

    // Beginner exercises (bodyweight, stretching, basic movements)
    return 'Beginner';
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return this.data?.categories || [];
  }

  /**
   * Get all available equipment types
   */
  getEquipment(): string[] {
    return this.data?.equipment || [];
  }

  /**
   * Get all unique muscle groups (primary and secondary)
   */
  getMuscleGroups(): string[] {
    if (!this.data) return [];
    
    const muscles = new Set<string>();
    this.data.exercises.forEach(exercise => {
      exercise.primary_muscles.forEach(muscle => muscles.add(muscle));
      exercise.secondary_muscles.forEach(muscle => muscles.add(muscle));
    });
    
    return Array.from(muscles).sort();
  }

  /**
   * Get all exercises
   */
  getAllExercises(): Exercise[] {
    return this.data?.exercises || [];
  }

  /**
   * Search exercises with various filters
   */
  searchExercises(filters: ExerciseSearchFilters): Exercise[] {
    if (!this.data) return [];

    let exercises = this.data.exercises;

    // Filter by category
    if (filters.category) {
      exercises = exercises.filter(ex => 
        ex.category.toLowerCase() === filters.category?.toLowerCase()
      );
    }

    // Filter by equipment (must have at least one matching equipment)
    if (filters.equipment && filters.equipment.length > 0) {
      exercises = exercises.filter(ex =>
        filters.equipment!.some(equipment =>
          ex.equipment.some(exEquip => 
            exEquip.toLowerCase() === equipment.toLowerCase()
          )
        )
      );
    }

    // Filter by primary muscle
    if (filters.primaryMuscle) {
      exercises = exercises.filter(ex =>
        ex.primary_muscles.some(muscle =>
          muscle.toLowerCase() === filters.primaryMuscle?.toLowerCase()
        )
      );
    }

    // Filter by secondary muscle
    if (filters.secondaryMuscle) {
      exercises = exercises.filter(ex =>
        ex.secondary_muscles.some(muscle =>
          muscle.toLowerCase() === filters.secondaryMuscle?.toLowerCase()
        )
      );
    }

    // Filter by search term (name, description, instructions)
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      exercises = exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm) ||
        ex.description?.toLowerCase().includes(searchTerm) ||
        ex.instructions.some(instruction => 
          instruction.toLowerCase().includes(searchTerm)
        ) ||
        ex.primary_muscles.some(muscle => 
          muscle.toLowerCase().includes(searchTerm)
        ) ||
        ex.secondary_muscles.some(muscle => 
          muscle.toLowerCase().includes(searchTerm)
        )
      );
    }

    return exercises;
  }

  /**
   * Get exercises by category
   */
  getExercisesByCategory(category: string): Exercise[] {
    return this.searchExercises({ category });
  }

  /**
   * Get exercises by muscle group
   */
  getExercisesByMuscle(muscle: string): Exercise[] {
    return this.searchExercises({ primaryMuscle: muscle });
  }

  /**
   * Get exercises by equipment
   */
  getExercisesByEquipment(equipment: string[]): Exercise[] {
    return this.searchExercises({ equipment });
  }

  /**
   * Get exercise by exact name
   */
  getExerciseByName(name: string): Exercise | undefined {
    if (!this.data) return undefined;
    return this.data.exercises.find(ex => 
      ex.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Get recommended exercises based on user's max lifts
   */
  getRecommendedExercises(maxLifts: MaxLift[], targetMuscles?: string[]): Exercise[] {
    if (!this.data) return [];

    // Get primary exercises from max lifts
    const maxLiftExercises = maxLifts.map(lift => lift.exerciseName.toLowerCase());
    
    let exercises = this.data.exercises;

    // If target muscles specified, filter by those
    if (targetMuscles && targetMuscles.length > 0) {
      exercises = exercises.filter(ex =>
        targetMuscles.some(muscle =>
          ex.primary_muscles.includes(muscle) || ex.secondary_muscles.includes(muscle)
        )
      );
    }

    // Prioritize exercises that aren't already in max lifts
    const newExercises = exercises.filter(ex =>
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
  getComplementaryExercises(exercise: Exercise): Exercise[] {
    if (!this.data) return [];

    // Find exercises that work the same muscle groups or opposing muscle groups
    const complementary = this.data.exercises.filter(ex => {
      if (ex.name === exercise.name) return false;
      
      // Same primary muscles
      const samePrimary = ex.primary_muscles.some(muscle =>
        exercise.primary_muscles.includes(muscle)
      );
      
      // Opposing muscle groups
      const opposingMuscles: { [key: string]: string[] } = {
        'chest': ['middle back', 'lats'],
        'middle back': ['chest'],
        'lats': ['chest', 'shoulders'],
        'biceps': ['triceps'],
        'triceps': ['biceps'],
        'quads': ['hamstrings'],
        'hamstrings': ['quads'],
        'abs': ['lower back'],
        'lower back': ['abs']
      };
      
      const opposing = exercise.primary_muscles.some(muscle =>
        opposingMuscles[muscle]?.some(oppMuscle =>
          ex.primary_muscles.includes(oppMuscle)
        )
      );

      return samePrimary || opposing;
    });

    // Sort by relevance and limit results
    return complementary
      .sort((a, b) => {
        // Prefer same category
        if (a.category === exercise.category && b.category !== exercise.category) return -1;
        if (b.category === exercise.category && a.category !== exercise.category) return 1;
        return 0;
      })
      .slice(0, 10);
  }

  /**
   * Create a workout template based on muscle groups and available equipment
   */
  createWorkout(
    targetMuscles: string[],
    availableEquipment: string[] = [],
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    duration: number = 60 // minutes
  ): WorkoutExercise[] {
    const exercises = this.searchExercises({
      equipment: availableEquipment.length > 0 ? availableEquipment : undefined
    }).filter(ex =>
      targetMuscles.some(muscle =>
        ex.primary_muscles.includes(muscle)
      )
    );

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
  getExerciseVariations(exerciseName: string): Exercise[] {
    if (!this.data) return [];

    const baseExercise = this.getExerciseByName(exerciseName);
    if (!baseExercise) return [];

    // Find exercises that are variations of this exercise
    const variations = this.data.exercises.filter(ex =>
      ex.variation_on?.includes(exerciseName.toLowerCase()) ||
      baseExercise.variation_on?.includes(ex.name.toLowerCase()) ||
      (ex.variation_id && baseExercise.variation_id && ex.variation_id === baseExercise.variation_id)
    );

    return variations;
  }

  /**
   * Get exercise statistics
   */
  getLibraryStats(): {
    totalExercises: number;
    categoriesCount: number;
    equipmentCount: number;
    muscleGroupsCount: number;
    exercisesByCategory: { [key: string]: number };
    exercisesByEquipment: { [key: string]: number };
  } {
    if (!this.data) {
      return {
        totalExercises: 0,
        categoriesCount: 0,
        equipmentCount: 0,
        muscleGroupsCount: 0,
        exercisesByCategory: {},
        exercisesByEquipment: {}
      };
    }

    const exercisesByCategory: { [key: string]: number } = {};
    const exercisesByEquipment: { [key: string]: number } = {};

    this.data.exercises.forEach(exercise => {
      // Count by category
      exercisesByCategory[exercise.category] = (exercisesByCategory[exercise.category] || 0) + 1;
      
      // Count by equipment
      exercise.equipment.forEach(equipment => {
        exercisesByEquipment[equipment] = (exercisesByEquipment[equipment] || 0) + 1;
      });
    });

    return {
      totalExercises: this.data.exercises.length,
      categoriesCount: this.data.categories.length,
      equipmentCount: this.data.equipment.length,
      muscleGroupsCount: this.getMuscleGroups().length,
      exercisesByCategory,
      exercisesByEquipment
    };
  }

  /**
   * Check if the library is initialized
   */
  isInitialized(): boolean {
    return this.data !== null;
  }

  /**
   * Get exercises grouped by category
   */
  getExercisesByCategories(): ExerciseCategoryGroup[] {
    if (!this.data) return [];

    const categories = new Map<string, Exercise[]>();
    
    this.data.exercises.forEach((exercise: Exercise) => {
      const category = exercise.category;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(exercise);
    });

    return Array.from(categories.entries()).map(([categoryName, exercises]) => ({
      id: categoryName.toLowerCase().replace(/\s+/g, '_'),
      name: categoryName,
      description: this.getCategoryDescription(categoryName),
      exercises: exercises.sort((a, b) => a.name.localeCompare(b.name)),
      exerciseCount: exercises.length
    })).sort((a, b) => a.name.localeCompare(b.name));
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
   * Gets a specific exercise by ID
   */
  getExerciseById(id: string): Exercise | undefined {
    if (!this.data) return undefined;
    return this.data.exercises.find((exercise: Exercise) => exercise.id === id);
  }

  /**
   * Gets similar exercises based on muscle groups
   */
  getSimilarExercises(exercise: Exercise, limit = 5): Exercise[] {
    if (!this.data) return [];

    const similar = this.data.exercises.filter((ex: Exercise) => {
      if (ex.id === exercise.id) return false;
      
      // Check if exercises share primary muscles
      const sharedPrimaryMuscles = ex.primary_muscles.some((muscle: string) =>
        exercise.primary_muscles.includes(muscle)
      );

      // Check if exercises are in the same category
      const sameCategory = ex.category === exercise.category;

      return sharedPrimaryMuscles || sameCategory;
    });

    // Sort by relevance (more shared muscles = higher relevance)
    similar.sort((a: Exercise, b: Exercise) => {
      const aSharedMuscles = a.primary_muscles.filter((muscle: string) =>
        exercise.primary_muscles.includes(muscle)
      ).length;
      const bSharedMuscles = b.primary_muscles.filter((muscle: string) =>
        exercise.primary_muscles.includes(muscle)
      ).length;

      return bSharedMuscles - aSharedMuscles;
    });

    return similar.slice(0, limit);
  }

  /**
   * Gets popular exercises (those targeting major muscle groups)
   */
  getPopularExercises(limit = 10): Exercise[] {
    if (!this.data) return [];

    const popularMuscles = ['chest', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'lats'];
    
    const popular = this.data.exercises.filter((exercise: Exercise) =>
      exercise.primary_muscles.some((muscle: string) => 
        popularMuscles.includes(muscle.toLowerCase())
      )
    );

    // Prefer strength exercises and those with common equipment
    popular.sort((a: Exercise, b: Exercise) => {
      const aScore = this.getPopularityScore(a);
      const bScore = this.getPopularityScore(b);
      return bScore - aScore;
    });

    return popular.slice(0, limit);
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
  getEnhancedStats(): ExerciseStats {
    if (!this.data) {
      return {
        totalExercises: 0,
        categoriesCount: 0,
        equipmentTypes: [],
        muscleGroups: []
      };
    }

    const categories = new Set(this.data.exercises.map((ex: Exercise) => ex.category));
    const equipment = new Set(this.data.exercises.flatMap((ex: Exercise) => ex.equipment));
    const muscles = new Set([
      ...this.data.exercises.flatMap((ex: Exercise) => ex.primary_muscles),
      ...this.data.exercises.flatMap((ex: Exercise) => ex.secondary_muscles)
    ]);

    return {
      totalExercises: this.data.exercises.length,
      categoriesCount: categories.size,
      equipmentTypes: Array.from(equipment).sort(),
      muscleGroups: Array.from(muscles).sort()
    };
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

export const searchExercises = (filters: ExerciseSearchFilters): Exercise[] => {
  return exerciseLibrary.searchExercises(filters);
};

export const getExercisesByMuscle = (muscle: string): Exercise[] => {
  return exerciseLibrary.getExercisesByMuscle(muscle);
};

export const getExercisesByCategory = (category: string): Exercise[] => {
  return exerciseLibrary.getExercisesByCategory(category);
};

export const createWorkout = (
  targetMuscles: string[],
  availableEquipment?: string[],
  difficulty?: 'beginner' | 'intermediate' | 'advanced',
  duration?: number
): WorkoutExercise[] => {
  return exerciseLibrary.createWorkout(targetMuscles, availableEquipment, difficulty, duration);
};

export default exerciseLibrary;
