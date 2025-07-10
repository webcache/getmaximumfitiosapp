import { Exercise } from '@/types/exercise';

// Simple in-memory storage for user exercises
// In a real app, this would use AsyncStorage or a database
class UserExerciseStorage {
  private exercises: Exercise[] = [];
  private listeners: (() => void)[] = [];

  addExercise(exercise: Exercise): boolean {
    if (!this.exercises.find(ex => ex.id === exercise.id)) {
      this.exercises.push(exercise);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  removeExercise(exerciseId: string): void {
    this.exercises = this.exercises.filter(ex => ex.id !== exerciseId);
    this.notifyListeners();
  }

  clearAll(): void {
    this.exercises = [];
    this.notifyListeners();
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
