import { myExercisesService } from '@/services/MyExercisesService';
import { Exercise } from '@/types/exercise';

// Enhanced user exercise storage that persists to Firestore
// Maintains backward compatibility while adding Firestore persistence
class UserExerciseStorage {
  private exercises: Exercise[] = [];
  private listeners: (() => void)[] = [];
  private currentUserId: string | null = null;
  private unsubscribeFromFirestore: (() => void) | null = null;

  /**
   * Initialize the storage for a specific user
   */
  async initialize(userId: string): Promise<void> {
    if (this.currentUserId === userId) {
      return; // Already initialized for this user
    }

    // Cleanup previous subscription
    if (this.unsubscribeFromFirestore) {
      this.unsubscribeFromFirestore();
    }

    this.currentUserId = userId;
    
    // Subscribe to real-time updates from Firestore
    this.unsubscribeFromFirestore = myExercisesService.subscribeToMyExercises(
      userId,
      (exercises) => {
        this.exercises = exercises;
        this.notifyListeners();
      }
    );
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    if (this.unsubscribeFromFirestore) {
      this.unsubscribeFromFirestore();
      this.unsubscribeFromFirestore = null;
    }
    this.currentUserId = null;
    this.exercises = [];
  }

  async addExercise(exercise: Exercise): Promise<boolean> {
    if (!this.currentUserId) {
      console.warn('UserExerciseStorage not initialized with userId');
      return false;
    }

    // Check if already exists locally
    if (this.exercises.find(ex => ex.id === exercise.id)) {
      return false;
    }

    // Add to Firestore (this will trigger the real-time update)
    return await myExercisesService.addExercise(this.currentUserId, exercise);
  }

  async removeExercise(exerciseId: string): Promise<void> {
    if (!this.currentUserId) {
      console.warn('UserExerciseStorage not initialized with userId');
      return;
    }

    // Remove from Firestore (this will trigger the real-time update)
    await myExercisesService.removeExercise(this.currentUserId, exerciseId);
  }

  async clearAll(): Promise<void> {
    if (!this.currentUserId) {
      console.warn('UserExerciseStorage not initialized with userId');
      return;
    }

    // Clear from Firestore (this will trigger the real-time update)
    await myExercisesService.clearAllExercises(this.currentUserId);
  }

  getExercises(): Exercise[] {
    return [...this.exercises];
  }

  isAdded(exerciseId: string): boolean {
    return this.exercises.some(ex => ex.id === exerciseId);
  }

  getAddedIds(): Set<string> {
    return new Set(this.exercises.map(ex => ex.id || ''));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const userExerciseStorage = new UserExerciseStorage();
