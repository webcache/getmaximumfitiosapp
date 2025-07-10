export interface Exercise {
  category: string;
  equipment: string[];
  instructions: string[];
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  variation_on?: string[];
  video?: string;
  description?: string;
  license?: {
    full_name: string;
    short_name: string;
    url: string;
  };
  license_author?: string;
  variation_id?: number | null;
}

export interface ExerciseFilter {
  category?: string;
  equipment?: string;
  primaryMuscle?: string;
  secondaryMuscle?: string;
  searchQuery?: string;
}

export interface ExerciseGroup {
  [key: string]: Exercise[];
}

export interface ExerciseStats {
  totalExercises: number;
  categoriesCount: number;
  equipmentTypesCount: number;
  muscleGroupsCount: number;
}

// Common exercise categories
export const EXERCISE_CATEGORIES = [
  'strength',
  'cardio',
  'plyometrics',
  'olympic weightlifting',
  'strongman',
  'stretching',
  'calisthenics'
] as const;

// Common equipment types
export const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'cable',
  'machine',
  'exercise ball',
  'medicine ball',
  'bands',
  'none',
  'other'
] as const;

// Common muscle groups
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'traps',
  'lats',
  'middle back',
  'lower back'
] as const;

export type ExerciseCategory = typeof EXERCISE_CATEGORIES[number];
export type EquipmentType = typeof EQUIPMENT_TYPES[number];
export type MuscleGroup = typeof MUSCLE_GROUPS[number];
