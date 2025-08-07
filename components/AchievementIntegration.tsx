import AchievementShareModal from '@/components/AchievementShareModal';
import { useAchievementShare } from '@/hooks/useAchievementShare';
import React from 'react';

/**
 * Integration examples for adding achievement sharing to existing workout flows
 */

// Example 1: Integration in ActiveWorkoutScreen
export const useWorkoutCompletion = () => {
  const {
    isVisible,
    achievementType,
    achievementData,
    triggerWorkoutComplete,
    hideAchievementShare,
  } = useAchievementShare();

  const completeWorkout = (workoutData: {
    name: string;
    duration: string;
    exercises: number;
    achievements?: string[];
  }) => {
    // Your existing workout completion logic here
    console.log('Workout completed:', workoutData);
    
    // Show achievement sharing option
    triggerWorkoutComplete(
      workoutData.name,
      workoutData.duration,
      workoutData.exercises
    );
  };

  return {
    completeWorkout,
    // Modal props
    achievementShareModal: (
      achievementType && achievementData && (
        <AchievementShareModal
          visible={isVisible}
          onClose={hideAchievementShare}
          achievementType={achievementType}
          achievementData={achievementData}
        />
      )
    ),
  };
};

// Example 2: Integration for Personal Records
export const usePersonalRecordTracking = () => {
  const {
    isVisible,
    achievementType,
    achievementData,
    triggerPersonalRecord,
    hideAchievementShare,
  } = useAchievementShare();

  const checkAndCelebratePersonalRecord = (
    exercise: string,
    weight: number,
    reps: number,
    previousBest?: number
  ) => {
    // Your existing PR logic here
    const isNewRecord = !previousBest || weight > previousBest;
    
    if (isNewRecord) {
      console.log('New personal record achieved!');
      
      // Trigger sharing modal
      triggerPersonalRecord(exercise, weight, reps, previousBest);
      
      return true;
    }
    
    return false;
  };

  return {
    checkAndCelebratePersonalRecord,
    // Modal props
    achievementShareModal: (
      achievementType && achievementData && (
        <AchievementShareModal
          visible={isVisible}
          onClose={hideAchievementShare}
          achievementType={achievementType}
          achievementData={achievementData}
        />
      )
    ),
  };
};

// Example 3: Integration for Milestones
export const useMilestoneTracking = () => {
  const {
    isVisible,
    achievementType,
    achievementData,
    triggerMilestone,
    showAchievement,
    hideAchievementShare,
  } = useAchievementShare();

  const checkMilestones = (userStats: {
    totalWorkouts: number;
    consecutiveDays: number;
    totalWeightLifted: number;
    // Add other stats as needed
  }) => {
    // Check for various milestones
    const milestones = [];

    if (userStats.totalWorkouts === 10) {
      milestones.push('First 10 Workouts!');
    }
    
    if (userStats.totalWorkouts === 50) {
      milestones.push('50 Workout Milestone!');
    }
    
    if (userStats.consecutiveDays === 7) {
      milestones.push('7-Day Streak!');
    }
    
    if (userStats.consecutiveDays === 30) {
      milestones.push('30-Day Consistency Champion!');
    }
    
    if (userStats.totalWeightLifted >= 10000) {
      milestones.push('10,000 lbs Total Lifted!');
    }

    // Trigger sharing for the first milestone found
    if (milestones.length > 0) {
      const milestone = milestones[0];
      triggerMilestone(milestone, `You've reached an amazing fitness milestone!`);
      return milestone;
    }

    return null;
  };

  const celebrateCustomAchievement = (title: string, description: string, imageUri?: string) => {
    showAchievement({
      title,
      description,
      imageUri,
    });
  };

  return {
    checkMilestones,
    celebrateCustomAchievement,
    // Modal props
    achievementShareModal: (
      achievementType && achievementData && (
        <AchievementShareModal
          visible={isVisible}
          onClose={hideAchievementShare}
          achievementType={achievementType}
          achievementData={achievementData}
        />
      )
    ),
  };
};

// Example 4: Complete integration hook for any screen
export const useAchievementSharing = () => {
  const achievementShare = useAchievementShare();

  return {
    ...achievementShare,
    // Complete modal component ready to use
    AchievementShareModal: () => (
      achievementShare.achievementType && achievementShare.achievementData && (
        <AchievementShareModal
          visible={achievementShare.isVisible}
          onClose={achievementShare.hideAchievementShare}
          achievementType={achievementShare.achievementType}
          achievementData={achievementShare.achievementData}
        />
      )
    ),
  };
};

// Example usage patterns:
// 
// In ActiveWorkoutScreen.tsx:
// const { completeWorkout, achievementShareModal } = useWorkoutCompletion();
// 
// In ExerciseDetail.tsx:
// const { checkAndCelebratePersonalRecord, achievementShareModal } = usePersonalRecordTracking();
//
// The achievementShareModal should be added to your JSX return statement
