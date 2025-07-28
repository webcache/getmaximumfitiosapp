/**
 * Utility functions for the GetMaximumFit app
 */

import Constants from 'expo-constants';

/**
 * Generates API URL for the given endpoint
 * @param relativePath - The API endpoint path (e.g., '/api/ai/chat')
 * @returns The full API URL
 */
export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  // Force production API URL if we have one defined, regardless of NODE_ENV
  // This ensures TestFlight builds use production endpoints
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    const fullUrl = process.env.EXPO_PUBLIC_API_BASE_URL.concat(path);
    console.log('Generated production API URL:', fullUrl);
    return fullUrl;
  }

  // Only use development URLs if explicitly in development AND no production URL is set
  if (process.env.NODE_ENV === 'development') {
    // In development, try to get the origin from Constants.experienceUrl
    if (Constants.experienceUrl && typeof Constants.experienceUrl === 'string') {
      let origin = Constants.experienceUrl;
      
      // Handle different Expo URL formats
      if (origin.startsWith('exp://')) {
        origin = origin.replace('exp://', 'http://');
      } else if (origin.startsWith('https://')) {
        // Keep HTTPS URLs as-is for tunnel mode
        const fullUrl = origin.concat(path);
        console.log('Generated API URL (HTTPS):', fullUrl);
        return fullUrl;
      }
      
      const fullUrl = origin.concat(path);
      console.log('Generated API URL (development):', fullUrl);
      return fullUrl;
    }
    
    // Fallback for development - use localhost with default Expo port
    const fallbackUrl = `http://localhost:8081${path}`;
    console.log('Using fallback API URL:', fallbackUrl);
    return fallbackUrl;
  }

  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL environment variable is not defined and not in development mode',
  );
};

/**
 * Format date as MM/DD/YY
 * @param date - Date object to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}

/**
 * Validates if a string is a valid email
 * @param email - Email string to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Capitalizes the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Exercise interfaces for type safety
 */
export interface ExerciseSet {
  id: string;
  reps: string;
  weight?: string;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
  notes?: string;
  isMaxLift?: boolean;
}

export interface FavoriteExercise {
  id: string;
  name: string;
  defaultSets: ExerciseSet[];
  notes?: string;
  createdAt: Date;
}

export interface MaxLift {
  id: string;
  exerciseName: string;
  weight: string;
  reps: string;
  date: Date;
  unit: string; // Weight unit - 'lbs' or 'kg' (can be made into a setting later)
  workoutId?: string; // Optional since new workouts don't have IDs yet
  notes?: string; // Optional
}

/**
 * Converts raw exercise data from Firestore to proper Exercise format
 * @param exercisesData - Raw exercise data from Firestore
 * @param workoutId - Workout ID for generating exercise IDs
 * @returns Array of properly formatted Exercise objects
 */
export function convertExercisesToFormat(exercisesData: any, workoutId: string): Exercise[] {
  if (!exercisesData || !Array.isArray(exercisesData)) {
    return [];
  }

  return exercisesData.map((ex: any, index: number) => {
    if (typeof ex === 'string') {
      // Convert string to Exercise object
      return {
        id: `${workoutId}-exercise-${index}`,
        name: ex,
        sets: [
          {
            id: `${workoutId}-exercise-${index}-set-1`,
            reps: '10-12',
            weight: '',
            notes: '',
          }
        ],
        notes: '',
        isMaxLift: false,
      };
    } else if (typeof ex === 'object' && ex.name) {
      // Handle both new and legacy formats
      let sets: any[];
      
      if (Array.isArray(ex.sets)) {
        // New format - sets is already an array
        sets = ex.sets.map((set: any, setIndex: number) => ({
          id: set.id || `${workoutId}-exercise-${index}-set-${setIndex + 1}`,
          reps: set.reps || '10-12',
          weight: set.weight || '',
          notes: set.notes || '',
        }));
      } else if (typeof ex.sets === 'number') {
        // Legacy format - convert number of sets to array
        const numberOfSets = ex.sets || 3;
        sets = Array.from({ length: numberOfSets }, (_, setIndex) => ({
          id: `${workoutId}-exercise-${index}-set-${setIndex + 1}`,
          reps: ex.reps || '10-12',
          weight: ex.weight || '',
          notes: '',
        }));
      } else {
        // Default to one set
        sets = [
          {
            id: `${workoutId}-exercise-${index}-set-1`,
            reps: ex.reps || '10-12',
            weight: ex.weight || '',
            notes: '',
          }
        ];
      }
      
      return {
        id: ex.id || `${workoutId}-exercise-${index}`,
        name: ex.name || '',
        sets: sets,
        notes: ex.notes || '',
        isMaxLift: ex.isMaxLift || false,
      };
    } else if (typeof ex === 'object' && ex.exercise) {
      // Handle legacy format where exercise name is in 'exercise' field
      const numberOfSets = typeof ex.sets === 'number' ? ex.sets : 3;
      const sets = Array.from({ length: numberOfSets }, (_, setIndex) => ({
        id: `${workoutId}-exercise-${index}-set-${setIndex + 1}`,
        reps: ex.reps || '10-12',
        weight: ex.weight || '',
        notes: '',
      }));
      
      return {
        id: ex.id || `${workoutId}-exercise-${index}`,
        name: ex.exercise || '',
        sets: sets,
        notes: ex.notes || '',
        isMaxLift: ex.isMaxLift || false,
      };
    } else {
      // Fallback for unexpected formats
      return {
        id: `${workoutId}-exercise-${index}`,
        name: JSON.stringify(ex),
        sets: [
          {
            id: `${workoutId}-exercise-${index}-set-1`,
            reps: '10-12',
            weight: '',
            notes: '',
          }
        ],
        notes: '',
        isMaxLift: false,
      };
    }
  });
}

/**
 * Converts a date to a local date string (YYYY-MM-DD) without timezone issues
 * @param date - Date object to convert
 * @returns Local date string in YYYY-MM-DD format
 */
export function dateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a local date string (YYYY-MM-DD) to a Date object at start of day
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object set to start of day in local timezone
 */
export function localStringToDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Converts Firestore date data to a proper local Date object
 * @param firestoreDate - Date data from Firestore (string, timestamp, or Date)
 * @returns Date object in local timezone
 */
export function convertFirestoreDate(firestoreDate: any): Date {
  if (!firestoreDate) {
    return new Date();
  }

  if (typeof firestoreDate === 'string') {
    // Handle ISO string dates from Firestore
    if (firestoreDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Handle local date strings (YYYY-MM-DD)
      return localStringToDate(firestoreDate);
    } else {
      // Handle ISO datetime strings - convert to local date
      const date = new Date(firestoreDate);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
  } else if (firestoreDate.toDate) {
    // Handle Firebase Timestamp
    const date = firestoreDate.toDate();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  } else if (firestoreDate instanceof Date) {
    // Handle Date objects
    return new Date(firestoreDate.getFullYear(), firestoreDate.getMonth(), firestoreDate.getDate());
  }

  return new Date();
}

/**
 * Converts a Date object to the format for saving to Firestore
 * @param date - Date object to convert
 * @returns String in YYYY-MM-DD format for consistent storage
 */
export function dateToFirestoreString(date: Date): string {
  return dateToLocalString(date);
}

/**
 * Gets today's date as a local date string for Firestore queries
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayLocalString(): string {
  return dateToLocalString(new Date());
}
