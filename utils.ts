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
  try {
    // Validate that we have a valid date object
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('formatDate: Invalid date object:', date);
      return 'Invalid Date';
    }
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
  } catch (error) {
    console.warn('formatDate: Error formatting date:', error);
    return 'Invalid Date';
  }
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
 * Converts raw exercise data from Firestore to properly formatted Exercise objects
 * @param exercisesData - Raw exercise data from Firestore
 * @param workoutId - Workout ID for generating exercise IDs
 * @returns Array of properly formatted Exercise objects
 */
export function convertExercisesToFormat(exercisesData: any, workoutId: string): Exercise[] {
  // Input validation
  if (!exercisesData) {
    console.warn('convertExercisesToFormat: No exercises data provided');
    return [];
  }
  
  if (!Array.isArray(exercisesData)) {
    console.warn('convertExercisesToFormat: Exercises data is not an array:', typeof exercisesData);
    return [];
  }
  
  if (!workoutId || typeof workoutId !== 'string') {
    console.warn('convertExercisesToFormat: Invalid workoutId provided:', workoutId);
    workoutId = `fallback-${Date.now()}`;
  }

  return exercisesData.map((ex: any, index: number) => {
    try {
      // Handle string format (legacy)
      if (typeof ex === 'string') {
        if (!ex.trim()) {
          console.warn(`convertExercisesToFormat: Empty exercise name at index ${index}`);
          return null;
        }
        
        return {
          id: `${workoutId}-exercise-${index}`,
          name: ex.trim(),
          sets: [
            {
              id: `${workoutId}-exercise-${index}-set-1`,
              reps: '10-12',
              weight: '',
              notes: '',
            }
          ],
          notes: undefined,
          isMaxLift: false,
        };
      } 
      
      // Handle object format with name property (current format)
      else if (typeof ex === 'object' && ex && ex.name) {
        const exerciseName = String(ex.name || '').trim();
        if (!exerciseName) {
          console.warn(`convertExercisesToFormat: Empty exercise name at index ${index}`);
          return null;
        }
        
        let sets: ExerciseSet[];
        
        if (Array.isArray(ex.sets)) {
          // New format - sets is already an array
          sets = ex.sets.map((set: any, setIndex: number) => {
            return {
              id: set?.id || `${workoutId}-exercise-${index}-set-${setIndex + 1}`,
              reps: String(set?.reps || '10-12'),
              weight: String(set?.weight || ''),
              notes: String(set?.notes || ''),
            };
          }).filter(Boolean); // Remove any null/undefined sets
          
          // Ensure at least one set exists
          if (sets.length === 0) {
            sets = [{
              id: `${workoutId}-exercise-${index}-set-1`,
              reps: '10-12',
              weight: '',
              notes: '',
            }];
          }
        } 
        else if (typeof ex.sets === 'number' && ex.sets > 0) {
          // Legacy format - convert number of sets to array
          const numberOfSets = Math.min(ex.sets, 10); // Cap at 10 sets for safety
          sets = Array.from({ length: numberOfSets }, (_, setIndex) => ({
            id: `${workoutId}-exercise-${index}-set-${setIndex + 1}`,
            reps: String(ex.reps || '10-12'),
            weight: String(ex.weight || ''),
            notes: '',
          }));
        } 
        else {
          // Default to one set
          sets = [
            {
              id: `${workoutId}-exercise-${index}-set-1`,
              reps: String(ex.reps || '10-12'),
              weight: String(ex.weight || ''),
              notes: '',
            }
          ];
        }
        
        return {
          id: ex.id || `${workoutId}-exercise-${index}`,
          name: exerciseName,
          sets: sets,
          notes: ex.notes || undefined,
          isMaxLift: Boolean(ex.isMaxLift || false),
        };
      } 
      
      // Handle legacy format where exercise name is in 'exercise' field
      else if (typeof ex === 'object' && ex && ex.exercise) {
        const exerciseName = String(ex.exercise || '').trim();
        if (!exerciseName) {
          console.warn(`convertExercisesToFormat: Empty exercise name in legacy format at index ${index}`);
          return null;
        }
        
        const numberOfSets = typeof ex.sets === 'number' && ex.sets > 0 ? Math.min(ex.sets, 10) : 3;
        const sets = Array.from({ length: numberOfSets }, (_, setIndex) => ({
          id: `${workoutId}-exercise-${index}-set-${setIndex + 1}`,
          reps: String(ex.reps || '10-12'),
          weight: String(ex.weight || ''),
          notes: '',
        }));
        
        return {
          id: ex.id || `${workoutId}-exercise-${index}`,
          name: exerciseName,
          sets: sets,
          notes: ex.notes || undefined,
          isMaxLift: Boolean(ex.isMaxLift || false),
        };
      } 
      
      // Fallback for unexpected formats
      else {
        console.warn(`convertExercisesToFormat: Unexpected exercise format at index ${index}:`, ex);
        const fallbackName = typeof ex === 'object' && ex ? 'Unknown Exercise' : String(ex || 'Unknown Exercise');
        
        return {
          id: `${workoutId}-exercise-${index}`,
          name: fallbackName,
          sets: [
            {
              id: `${workoutId}-exercise-${index}-set-1`,
              reps: '10-12',
              weight: '',
              notes: '',
            }
          ],
          notes: undefined,
          isMaxLift: false,
        };
      }
    } catch (error) {
      console.error(`convertExercisesToFormat: Error processing exercise at index ${index}:`, error);
      return null;
    }
  }).filter(Boolean) as Exercise[]; // Filter out null values
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
  try {
    if (!firestoreDate) {
      console.warn('convertFirestoreDate: No date provided, using current date');
      return new Date();
    }

    if (typeof firestoreDate === 'string') {
      // Handle ISO string dates from Firestore
      if (firestoreDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Handle local date strings (YYYY-MM-DD)
        const date = localStringToDate(firestoreDate);
        if (isNaN(date.getTime())) {
          console.warn('convertFirestoreDate: Invalid date string:', firestoreDate);
          return new Date();
        }
        return date;
      } else {
        // Handle ISO datetime strings - convert to local date
        const date = new Date(firestoreDate);
        if (isNaN(date.getTime())) {
          console.warn('convertFirestoreDate: Invalid ISO date string:', firestoreDate);
          return new Date();
        }
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      }
    } else if (firestoreDate.toDate) {
      // Handle Firebase Timestamp
      try {
        const date = firestoreDate.toDate();
        if (isNaN(date.getTime())) {
          console.warn('convertFirestoreDate: Invalid Firebase timestamp:', firestoreDate);
          return new Date();
        }
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      } catch (error) {
        console.warn('convertFirestoreDate: Error converting Firebase timestamp:', error);
        return new Date();
      }
    } else if (firestoreDate instanceof Date) {
      // Handle Date objects
      if (isNaN(firestoreDate.getTime())) {
        console.warn('convertFirestoreDate: Invalid Date object:', firestoreDate);
        return new Date();
      }
      return new Date(firestoreDate.getFullYear(), firestoreDate.getMonth(), firestoreDate.getDate());
    }

    console.warn('convertFirestoreDate: Unknown date format:', typeof firestoreDate, firestoreDate);
    return new Date();
  } catch (error) {
    console.error('convertFirestoreDate: Unexpected error:', error);
    return new Date();
  }
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

/**
 * Validates if an object has the basic structure of a Workout
 * @param workout - Object to validate
 * @returns True if object has required workout properties
 */
export function isValidWorkout(workout: any): workout is { title: string; exercises: any[]; date: any } {
  return (
    workout &&
    typeof workout === 'object' &&
    typeof workout.title === 'string' &&
    workout.title.trim().length > 0 &&
    Array.isArray(workout.exercises) &&
    workout.date
  );
}

/**
 * Validates if an object has the basic structure of an Exercise
 * @param exercise - Object to validate
 * @returns True if object has required exercise properties
 */
export function isValidExercise(exercise: any): exercise is { name: string; sets: any[] } {
  return (
    exercise &&
    typeof exercise === 'object' &&
    typeof exercise.name === 'string' &&
    exercise.name.trim().length > 0 &&
    (Array.isArray(exercise.sets) || typeof exercise.sets === 'number')
  );
}

/**
 * Safely converts any value to a string, handling null/undefined
 * @param value - Value to convert
 * @param defaultValue - Default value if input is null/undefined
 * @returns String representation of the value
 */
export function safeStringify(value: any, defaultValue: string = ''): string {
  if (value == null) return defaultValue;
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return defaultValue;
  }
}

/**
 * Safely parses JSON with error handling
 * @param jsonString - JSON string to parse
 * @param defaultValue - Default value to return on parse error
 * @returns Parsed object or default value
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON parse error:', error);
    return defaultValue;
  }
}

/**
 * Generates a unique ID for exercises or sets
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 */
export function generateUniqueId(prefix: string = 'item'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
