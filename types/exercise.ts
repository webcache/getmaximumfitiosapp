export interface Exercise {
  id?: string;
  category: string;
  description?: string;
  equipment: string[];
  instructions: string[];
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  variation_on?: string[];
  video?: string;
  tips?: string[];
  variation_id?: number | null;
  license?: {
    full_name: string;
    short_name: string;
    url: string;
  };
  license_author?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  imageUrl?: string;
}

// Exercise categories enum
export enum ExerciseCategory {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  OLYMPIC_WEIGHTLIFTING = 'olympic weightlifting',
  PLYOMETRICS = 'plyometrics',
  STRONGMAN = 'strongman',
  STRETCHING = 'stretching',
  CALISTHENICS = 'calisthenics',
}

// Equipment types enum for better type safety
export enum EquipmentType {
  NONE = 'none',
  BARBELL = 'barbell',
  DUMBBELL = 'dumbbell',
  KETTLEBELL = 'kettlebell',
  CABLE = 'cable',
  MACHINE = 'machine',
  BANDS = 'bands',
  MEDICINE_BALL = 'medicine ball',
  EXERCISE_BALL = 'exercise ball',
  FOAM_ROLL = 'foam roll',
  OTHER = 'other',
  BENCH = 'bench',
  PULL_UP_BAR = 'pull-up bar',
  INCLINE_BENCH = 'incline bench',
}

// Muscle groups enum
export enum MuscleGroup {
  CHEST = 'chest',
  SHOULDERS = 'shoulders',
  TRICEPS = 'triceps',
  BICEPS = 'biceps',
  FOREARMS = 'forearms',
  ABS = 'abs',
  OBLIQUES = 'obliques',
  LOWER_BACK = 'lower back',
  MIDDLE_BACK = 'middle back',
  LATS = 'lats',
  TRAPS = 'traps',
  QUADS = 'quads',
  HAMSTRINGS = 'hamstrings',
  GLUTES = 'glutes',
  CALVES = 'calves',
  ADDUCTORS = 'adductors',
  ABDUCTORS = 'abductors',
  NECK = 'neck',
  SOLEUS = 'soleus',
  BRACHIALIS = 'brachialis',
  SERRATUS_ANTERIOR = 'serratus anterior',
}

export interface ExerciseSearchFilters {
  category?: string;
  equipment?: string[];
  primaryMuscle?: string;
  secondaryMuscle?: string;
  searchTerm?: string;
  difficulty?: string;
}

export interface ExerciseStats {
  totalExercises: number;
  categoriesCount: number;
  equipmentTypes: string[];
  muscleGroups: string[];
}

export interface ExerciseCategoryGroup {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  exerciseCount: number;
}

export interface WorkoutExercise {
  exercise: Exercise;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  rest?: number;
  notes?: string;
}

export interface ExerciseLibraryData {
  categories: string[];
  equipment: string[];
  exercises: Exercise[];
  muscle_groups?: Record<string, string[]>;
  muscles?: string[];
}
