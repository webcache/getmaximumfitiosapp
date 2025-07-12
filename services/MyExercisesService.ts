import { db } from '@/firebase';
import { Exercise } from '@/types/exercise';
import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';

/**
 * Service for managing user's personal exercise list stored in Firestore
 * Exercises are stored in /profiles/{userId}/myExercises/{exerciseId}
 */
class MyExercisesService {
  private listeners: Map<string, (() => void)[]> = new Map();

  /**
   * Add an exercise to user's personal list
   */
  async addExercise(userId: string, exercise: Exercise): Promise<boolean> {
    try {
      // Use exercise.id or generate a new one if it doesn't exist
      const exerciseId = exercise.id || `exercise_${Date.now()}`;
      const exerciseRef = doc(db, 'profiles', userId, 'myExercises', exerciseId);
      
      // Debug the incoming exercise data
      console.log('🔍 Raw exercise data before cleaning:', {
        id: exercise.id,
        name: exercise.name,
        difficulty: exercise.difficulty,
        difficultyType: typeof exercise.difficulty
      });
      
      // Clean the exercise data to remove undefined values (Firestore doesn't accept undefined)
      const cleanExercise = this.cleanExerciseData({
        ...exercise,
        id: exerciseId, // Ensure ID is set
        addedAt: new Date(),
      });
      
      console.log('🔍 Cleaned exercise data:', {
        id: cleanExercise.id,
        name: cleanExercise.name,
        difficulty: cleanExercise.difficulty,
        hasUndefinedValues: Object.values(cleanExercise).includes(undefined)
      });
      
      await setDoc(exerciseRef, cleanExercise);
      console.log('✅ Exercise added to My Exercises:', exercise.name);
      return true;
    } catch (error) {
      console.error('❌ Error adding exercise to My Exercises:', error);
      return false;
    }
  }

  /**
   * Remove an exercise from user's personal list
   */
  async removeExercise(userId: string, exerciseId: string): Promise<boolean> {
    try {
      const exerciseRef = doc(db, 'profiles', userId, 'myExercises', exerciseId);
      await deleteDoc(exerciseRef);
      console.log('✅ Exercise removed from My Exercises:', exerciseId);
      return true;
    } catch (error) {
      console.error('❌ Error removing exercise from My Exercises:', error);
      return false;
    }
  }

  /**
   * Get all exercises in user's personal list
   */
  async getMyExercises(userId: string): Promise<Exercise[]> {
    try {
      const myExercisesRef = collection(db, 'profiles', userId, 'myExercises');
      const snapshot = await getDocs(myExercisesRef);
      
      const exercises: Exercise[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        exercises.push({
          id: doc.id,
          name: data.name,
          category: data.category,
          primary_muscles: data.primary_muscles || [],
          secondary_muscles: data.secondary_muscles || [],
          equipment: data.equipment || [],
          instructions: data.instructions || [],
          description: data.description || '',
          tips: data.tips || [],
          difficulty: data.difficulty,
          variation_on: data.variation_on || [],
          video: data.video,
        });
      });

      console.log('📋 Fetched My Exercises:', exercises.length, 'exercises');
      return exercises.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('❌ Error fetching My Exercises:', error);
      return [];
    }
  }

  /**
   * Check if an exercise is in user's personal list
   */
  async isExerciseAdded(userId: string, exerciseId: string): Promise<boolean> {
    try {
      const myExercisesRef = collection(db, 'profiles', userId, 'myExercises');
      const snapshot = await getDocs(myExercisesRef);
      return snapshot.docs.some(doc => doc.id === exerciseId);
    } catch (error) {
      console.error('❌ Error checking if exercise is added:', error);
      return false;
    }
  }

  /**
   * Clear all exercises from user's personal list
   */
  async clearAllExercises(userId: string): Promise<boolean> {
    try {
      const myExercisesRef = collection(db, 'profiles', userId, 'myExercises');
      const snapshot = await getDocs(myExercisesRef);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log('✅ Cleared all My Exercises');
      return true;
    } catch (error) {
      console.error('❌ Error clearing My Exercises:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time updates of user's exercise list
   */
  subscribeToMyExercises(userId: string, callback: (exercises: Exercise[]) => void): () => void {
    const myExercisesRef = collection(db, 'profiles', userId, 'myExercises');
    
    const unsubscribe = onSnapshot(myExercisesRef, (snapshot) => {
      const exercises: Exercise[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        exercises.push({
          id: doc.id,
          name: data.name,
          category: data.category,
          primary_muscles: data.primary_muscles || [],
          secondary_muscles: data.secondary_muscles || [],
          equipment: data.equipment || [],
          instructions: data.instructions || [],
          description: data.description || '',
          tips: data.tips || [],
          difficulty: data.difficulty,
          variation_on: data.variation_on || [],
          video: data.video,
        });
      });

      callback(exercises.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      console.error('❌ Error in My Exercises subscription:', error);
      callback([]);
    });

    return unsubscribe;
  }

  /**
   * Get exercise names only (for dropdown lists)
   */
  async getMyExerciseNames(userId: string): Promise<string[]> {
    const exercises = await this.getMyExercises(userId);
    return exercises.map(exercise => exercise.name);
  }

  /**
   * Clean exercise data by removing undefined values (Firestore doesn't accept undefined)
   */
  private cleanExerciseData(exercise: any): any {
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(exercise)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }
}

// Export singleton instance
export const myExercisesService = new MyExercisesService();
export default myExercisesService;
