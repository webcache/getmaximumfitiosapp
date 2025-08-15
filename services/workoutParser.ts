// workoutParser.ts
// Enhanced workout parser with Zod validation for AI-generated workouts

import { addDoc, collection, DocumentReference, serverTimestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebase';
import { generateUniqueId } from '../utils';

// ---------- Enhanced Schema & Parser ----------

// Set schema for workout exercises
const ExerciseSetSchema = z.object({
  id: z.string().optional(),
  reps: z.union([z.string(), z.number()]).transform(val => String(val)),
  weight: z.union([z.string(), z.number()]).optional().transform(val => val ? String(val) : ''),
  notes: z.string().optional().default(''),
});

// Exercise schema that matches the app's current structure
const ExerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Exercise name is required'),
  sets: z.array(ExerciseSetSchema).min(1, 'At least one set is required'),
  notes: z.string().optional().default(''),
  isMaxLift: z.boolean().optional().default(false),
});

// Workout plan schema
const WorkoutPlanSchema = z.object({
  title: z.string().min(1, 'Workout title is required'),
  exercises: z.array(ExerciseSchema).min(1, 'At least one exercise is required'),
  notes: z.string().optional().default(''),
  duration: z.number().optional().default(45),
});

// Alternative schema for simpler AI responses (like your original format)
const SimpleExerciseSchema = z.object({
  exercise: z.string().min(1),
  reps: z.union([z.string(), z.number()]).transform(val => String(val)),
  sets: z.union([z.string(), z.number()]).transform(val => Number(val)),
  weight: z.union([z.string(), z.number()]).optional().transform(val => val ? String(val) : ''),
});

const SimpleWorkoutSchema = z.union([
  z.array(SimpleExerciseSchema),
  z.object({
    exercises: z.array(SimpleExerciseSchema),
    title: z.string().optional(),
  })
]);

// Export types
export type ExerciseSet = z.infer<typeof ExerciseSetSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;
export type SimpleExercise = z.infer<typeof SimpleExerciseSchema>;

/**
 * Enhanced parser that handles multiple AI response formats
 */
export function parseWorkoutPlan(raw: unknown): WorkoutPlan {
  try {
    // Safe logging that handles both string and object types
    const logMessage = typeof raw === 'string' 
      ? raw.substring(0, 100) + '...'
      : `[object ${typeof raw}]`;
    console.log('🔧 Parsing workout plan:', logMessage);
    
    // Parse JSON if it's a string
    let obj: any;
    if (typeof raw === 'string') {
      try {
        obj = JSON.parse(raw);
        console.log('✅ JSON parsed successfully');
      } catch (parseError) {
        console.warn('❌ JSON parse error, attempting repair...', parseError);
        
        // Try to repair the JSON
        try {
          const repairedJSON = repairJSON(raw);
          console.log('🔧 Attempting to parse repaired JSON:', repairedJSON.substring(0, 100) + '...');
          obj = JSON.parse(repairedJSON);
          console.log('✅ Repaired JSON parsed successfully');
        } catch (repairError) {
          console.error('❌ JSON repair failed:', repairError);
          throw new Error(`JSON Parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}. Repair failed: ${repairError instanceof Error ? repairError.message : 'Unknown repair error'}`);
        }
      }
    } else {
      obj = raw;
    }
    
    console.log('🔍 Parsed object type:', typeof obj, Array.isArray(obj) ? '(array)' : '(object)');
    
    // Try the full workout plan schema first
    try {
      const result = WorkoutPlanSchema.parse(obj);
      console.log('✅ Full schema validation successful');
      return result;
    } catch (fullSchemaError) {
      console.log('❌ Full schema failed, trying simple format...', fullSchemaError instanceof Error ? fullSchemaError.message : 'Unknown error');
      
      // Try the simple format and convert it
      try {
        const simpleWorkout = SimpleWorkoutSchema.parse(obj);
        console.log('✅ Simple schema validation successful');
        
        // Convert simple format to full format
        const exercises = Array.isArray(simpleWorkout) ? simpleWorkout : simpleWorkout.exercises;
        const title = (!Array.isArray(simpleWorkout) && simpleWorkout.title) || 'AI Generated Workout';
        
        const convertedExercises: Exercise[] = exercises.map((ex, index) => ({
          id: generateUniqueId('exercise'),
          name: ex.exercise,
          sets: Array.from({ length: Number(ex.sets) }, (_, setIndex) => ({
            id: generateUniqueId('set'),
            reps: ex.reps,
            weight: ex.weight || '',
            notes: '',
          })),
          notes: '',
          isMaxLift: false,
        }));
        
        const result = {
          title,
          exercises: convertedExercises,
          notes: '',
          duration: 45,
        };
        
        console.log('✅ Simple format converted to full format');
        return result;
      } catch (simpleSchemaError) {
        console.error('❌ Both schemas failed');
        console.error('Full schema error:', fullSchemaError instanceof Error ? fullSchemaError.message : 'Unknown error');
        console.error('Simple schema error:', simpleSchemaError instanceof Error ? simpleSchemaError.message : 'Unknown error');
        throw new Error(`Invalid workout format. Full schema: ${fullSchemaError instanceof Error ? fullSchemaError.message : 'Unknown error'}. Simple schema: ${simpleSchemaError instanceof Error ? simpleSchemaError.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to parse workout plan:', error);
    throw new Error(`Invalid workout format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates and processes AI response for workout creation
 */
export function validateAIWorkoutResponse(response: string): {
  isValid: boolean;
  workout?: WorkoutPlan;
  error?: string;
} {
  try {
    // Ensure response is a string
    if (typeof response !== 'string') {
      console.error('❌ Response is not a string:', typeof response, response);
      return {
        isValid: false,
        error: `Expected string response but received ${typeof response}`
      };
    }

    console.log('🔍 Validating AI workout response:', response.substring(0, 200) + '...');
    
    // Extract JSON from the response using improved logic
    const extractedJson = extractWorkoutFromChatMessage(response);
    
    if (!extractedJson) {
      console.warn('No JSON found in response');
      return { 
        isValid: false, 
        error: 'No valid JSON found in AI response'
      };
    }
    
    console.log('📋 Extracted JSON:', extractedJson.substring(0, 200) + '...');
    
    const workout = parseWorkoutPlan(extractedJson);
    console.log('✅ Workout parsed successfully:', workout.title);
    
    return { isValid: true, workout };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    console.error('❌ Workout validation failed:', errorMessage);
    return { 
      isValid: false, 
      error: errorMessage
    };
  }
}

/**
 * Creates a workout document in Firestore with validated data
 */
export async function createWorkoutFromAI(
  uid: string,
  rawResponse: string,
  selectedDate?: Date,
  incrementUsage?: (feature: string) => Promise<void>
): Promise<DocumentReference> {
  // Ensure rawResponse is a string
  if (typeof rawResponse !== 'string') {
    console.error('❌ createWorkoutFromAI: Expected string response but received:', typeof rawResponse, rawResponse);
    throw new Error(`Expected string response but received ${typeof rawResponse}`);
  }

  // Validate and parse the AI response
  const validation = validateAIWorkoutResponse(rawResponse);
  
  if (!validation.isValid || !validation.workout) {
    throw new Error(`Workout validation failed: ${validation.error}`);
  }

  // Increment the AI workout usage counter
  if (incrementUsage) {
    await incrementUsage('maxCustomWorkouts');
    console.log('📊 Incremented AI workout usage counter');
  }

  return createWorkoutFromParsedData(uid, validation.workout, selectedDate);
}

/**
 * Creates a workout document in Firestore from a parsed workout object
 */
export async function createWorkoutFromParsedData(
  uid: string,
  workout: WorkoutPlan,
  selectedDate?: Date
): Promise<DocumentReference> {
  
  // Ensure all exercises have proper IDs
  const exercisesWithIds = workout.exercises.map(exercise => ({
    ...exercise,
    id: exercise.id || generateUniqueId('exercise'),
    sets: exercise.sets.map(set => ({
      ...set,
      id: set.id || generateUniqueId('set'),
    })),
  }));
  
  // Create the workout document
  const workoutDoc = {
    title: workout.title,
    date: selectedDate || new Date(),
    exercises: exercisesWithIds,
    notes: workout.notes,
    isCompleted: false,
    duration: workout.duration || 0,
    createdAt: serverTimestamp(),
  };
  
  // Save to Firestore
  const workoutsRef = collection(db, 'profiles', uid, 'workouts');
  const docRef = await addDoc(workoutsRef, workoutDoc);
  
  console.log('✅ Workout created successfully:', docRef.id);
  return docRef;
}

/**
 * Utility to extract workout data from AI chat messages
 */
export function extractWorkoutFromChatMessage(message: string): string | null {
  // Ensure message is a string
  if (typeof message !== 'string') {
    console.error('❌ extractWorkoutFromChatMessage: Expected string but received:', typeof message);
    return null;
  }

  // Quick pre-filter: only attempt extraction if message likely contains workout data
  const workoutIndicators = [
    'json', 'workout', 'exercise', 'title', 'sets', 'reps', 'weight',
    '{', '[', 'Bench Press', 'Squat', 'Deadlift', 'workout plan',
    'exercises', '"name":', '"title":'
  ];
  
  const lowercaseMessage = message.toLowerCase();
  const hasWorkoutIndicators = workoutIndicators.some(indicator => 
    lowercaseMessage.includes(indicator.toLowerCase())
  );
  
  // If no workout indicators found, skip extraction to avoid unnecessary warnings
  if (!hasWorkoutIndicators) {
    return null;
  }
  
  console.log('🔍 Extracting JSON from message:', message.substring(0, 200) + '...');
  
  try {
    // First, try to find JSON in code blocks
    const codeBlockPatterns = [
      /```json\s*([\s\S]*?)\s*```/,
      /```\s*([\s\S]*?)\s*```/,
      /`([^`]+)`/
    ];
    
      for (const pattern of codeBlockPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          const candidate = match[1].trim();
          if (isValidJSONStructure(candidate)) {
            console.log('✅ Found JSON in code block');
            return candidate;
          } else {
            // Try to repair the JSON from code block
            const repaired = repairJSON(candidate);
            if (isValidJSONStructure(repaired)) {
              console.log('✅ Found and repaired JSON in code block');
              return repaired;
            }
          }
        }
      }    // Try to find JSON objects or arrays in the text
    const jsonPatterns = [
      // Look for complete JSON objects
      /(\{[^{}]*"exercises"[^{}]*\})/s,
      /(\{[\s\S]*?\})/,
      // Look for arrays
      /(\[[\s\S]*?\])/
    ];
    
      for (const pattern of jsonPatterns) {
        const matches = message.match(pattern);
        if (matches) {
          for (const match of matches) {
            if (isValidJSONStructure(match)) {
              console.log('✅ Found JSON pattern');
              return match;
            } else {
              // Try to repair the JSON
              const repaired = repairJSON(match);
              if (isValidJSONStructure(repaired)) {
                console.log('✅ Found and repaired JSON pattern');
                return repaired;
              }
            }
          }
        }
      }    // Last resort: try to extract from start/end positions
    const jsonStart = message.indexOf('{');
    const jsonEnd = message.lastIndexOf('}');
    const arrayStart = message.indexOf('[');
    const arrayEnd = message.lastIndexOf(']');
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const candidate = message.substring(jsonStart, jsonEnd + 1);
      if (isValidJSONStructure(candidate)) {
        console.log('✅ Found JSON by position (object)');
        return candidate;
      } else {
        // Try to repair the JSON
        const repaired = repairJSON(candidate);
        if (isValidJSONStructure(repaired)) {
          console.log('✅ Found and repaired JSON by position (object)');
          return repaired;
        }
      }
    }
    
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      const candidate = message.substring(arrayStart, arrayEnd + 1);
      if (isValidJSONStructure(candidate)) {
        console.log('✅ Found JSON by position (array)');
        return candidate;
      } else {
        // Try to repair the JSON
        const repaired = repairJSON(candidate);
        if (isValidJSONStructure(repaired)) {
          console.log('✅ Found and repaired JSON by position (array)');
          return repaired;
        }
      }
    }
    
    // Silently return null if no JSON found - no need to warn users about internal processing
    return null;
  } catch (error) {
    console.error('Error extracting JSON:', error);
    return null;
  }
}

/**
 * Helper function to validate JSON structure before parsing
 */
function isValidJSONStructure(str: string): boolean {
  try {
    const trimmed = str.trim();
    if (!trimmed) return false;
    
    // Must start with { or [
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false;
    }
    
    // Try to parse it
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempts to repair common JSON formatting issues
 */
function repairJSON(jsonStr: string): string {
  let repaired = jsonStr.trim();
  
  // Remove trailing commas
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unquoted property names
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // Fix single quotes to double quotes
  repaired = repaired.replace(/'/g, '"');
  
  // Remove any trailing incomplete parts
  if (repaired.startsWith('{') && !repaired.endsWith('}')) {
    // Try to close unclosed braces
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;
    const missingBraces = openBraces - closeBraces;
    
    for (let i = 0; i < missingBraces; i++) {
      repaired += '}';
    }
  }
  
  if (repaired.startsWith('[') && !repaired.endsWith(']')) {
    // Try to close unclosed brackets
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    const missingBrackets = openBrackets - closeBrackets;
    
    for (let i = 0; i < missingBrackets; i++) {
      repaired += ']';
    }
  }
  
  return repaired;
}
