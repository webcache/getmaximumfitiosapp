import { useCallback, useState } from 'react';

export interface AchievementData {
  title: string;
  description: string;
  // For workout completion
  workoutName?: string;
  duration?: string;
  exercises?: number;
  // For personal records
  exercise?: string;
  weight?: number;
  reps?: number;
  previousRecord?: number;
  // For general achievements
  milestone?: string;
  // Optional custom message and image
  customMessage?: string;
  imageUri?: string;
}

export type AchievementType = 'workout_complete' | 'personal_record' | 'achievement' | 'progress';

interface AchievementShareState {
  isVisible: boolean;
  achievementType: AchievementType | null;
  achievementData: AchievementData | null;
}

/**
 * Hook to manage achievement sharing modal state
 */
export const useAchievementShare = () => {
  const [shareState, setShareState] = useState<AchievementShareState>({
    isVisible: false,
    achievementType: null,
    achievementData: null,
  });

  const showWorkoutComplete = useCallback((data: {
    workoutName: string;
    duration?: string;
    exercises?: number;
    customMessage?: string;
  }) => {
    setShareState({
      isVisible: true,
      achievementType: 'workout_complete',
      achievementData: {
        title: '🏋️‍♂️ Workout Complete!',
        description: `Finished "${data.workoutName}"${data.duration ? ` in ${data.duration}` : ''}`,
        workoutName: data.workoutName,
        duration: data.duration,
        exercises: data.exercises,
        customMessage: data.customMessage,
      },
    });
  }, []);

  const showPersonalRecord = useCallback((data: {
    exercise: string;
    weight?: number;
    reps?: number;
    previousRecord?: number;
    customMessage?: string;
  }) => {
    const improvement = data.previousRecord && data.weight 
      ? ` (+${data.weight - data.previousRecord} lbs improvement!)`
      : '';
    
    setShareState({
      isVisible: true,
      achievementType: 'personal_record',
      achievementData: {
        title: '🏆 New Personal Record!',
        description: `${data.exercise}: ${data.weight ? `${data.weight} lbs` : ''}${data.reps ? ` × ${data.reps} reps` : ''}${improvement}`,
        exercise: data.exercise,
        weight: data.weight,
        reps: data.reps,
        previousRecord: data.previousRecord,
        customMessage: data.customMessage,
      },
    });
  }, []);

  const showAchievement = useCallback((data: {
    title: string;
    description: string;
    milestone?: string;
    customMessage?: string;
    imageUri?: string;
  }) => {
    setShareState({
      isVisible: true,
      achievementType: 'achievement',
      achievementData: {
        title: data.title,
        description: data.description,
        milestone: data.milestone,
        customMessage: data.customMessage,
        imageUri: data.imageUri,
      },
    });
  }, []);

  const showProgress = useCallback((data: {
    title: string;
    description: string;
    milestone: string;
    customMessage?: string;
  }) => {
    setShareState({
      isVisible: true,
      achievementType: 'progress',
      achievementData: {
        title: data.title,
        description: data.description,
        milestone: data.milestone,
        customMessage: data.customMessage,
      },
    });
  }, []);

  const hideAchievementShare = useCallback(() => {
    setShareState({
      isVisible: false,
      achievementType: null,
      achievementData: null,
    });
  }, []);

  // Convenience methods for common scenarios
  const triggerWorkoutComplete = useCallback((workoutName: string, duration?: string, exercises?: number) => {
    showWorkoutComplete({ workoutName, duration, exercises });
  }, [showWorkoutComplete]);

  const triggerPersonalRecord = useCallback((exercise: string, weight: number, reps?: number, previousRecord?: number) => {
    showPersonalRecord({ exercise, weight, reps, previousRecord });
  }, [showPersonalRecord]);

  const triggerMilestone = useCallback((milestone: string, description?: string) => {
    showAchievement({
      title: '🎯 Milestone Achieved!',
      description: description || milestone,
      milestone,
    });
  }, [showAchievement]);

  return {
    // State
    isVisible: shareState.isVisible,
    achievementType: shareState.achievementType,
    achievementData: shareState.achievementData,
    
    // General methods
    showWorkoutComplete,
    showPersonalRecord,
    showAchievement,
    showProgress,
    hideAchievementShare,
    
    // Convenience methods
    triggerWorkoutComplete,
    triggerPersonalRecord,
    triggerMilestone,
  };
};
