import { Timestamp, collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

export interface UserFitnessProfile {
  userId: string;
  fitnessJourneyStartDate: Timestamp;
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: Timestamp;
  totalExercisesCompleted: number;
  totalWorkoutTime: number; // in minutes
  favoriteWorkoutType?: string;
  achievements: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutName: string;
  duration: number; // in minutes
  exercisesCompleted: number;
  completedAt: Timestamp;
  workoutType?: string;
}

export interface AchievementMilestone {
  id: string;
  type: 'workout_count' | 'streak' | 'time_milestone' | 'journey_anniversary';
  title: string;
  description: string;
  threshold: number;
  unlockedAt?: Timestamp;
}

// Predefined achievement milestones
export const ACHIEVEMENT_MILESTONES: AchievementMilestone[] = [
  // Workout count milestones
  { id: 'first_workout', type: 'workout_count', title: 'First Step', description: 'Completed your first workout!', threshold: 1 },
  { id: 'workout_5', type: 'workout_count', title: 'Getting Started', description: 'Completed 5 workouts', threshold: 5 },
  { id: 'workout_10', type: 'workout_count', title: 'Building Momentum', description: 'Completed 10 workouts', threshold: 10 },
  { id: 'workout_25', type: 'workout_count', title: 'Quarter Century', description: 'Completed 25 workouts', threshold: 25 },
  { id: 'workout_50', type: 'workout_count', title: 'Half Century', description: 'Completed 50 workouts', threshold: 50 },
  { id: 'workout_100', type: 'workout_count', title: 'Century Club', description: 'Completed 100 workouts in GetMaximumFit!', threshold: 100 },
  { id: 'workout_250', type: 'workout_count', title: 'Fitness Warrior', description: 'Completed 250 workouts', threshold: 250 },
  { id: 'workout_500', type: 'workout_count', title: 'Fitness Legend', description: 'Completed 500 workouts', threshold: 500 },
  
  // Streak milestones
  { id: 'streak_3', type: 'streak', title: 'Consistency Builder', description: '3-day workout streak', threshold: 3 },
  { id: 'streak_7', type: 'streak', title: 'Weekly Warrior', description: '7-day workout streak', threshold: 7 },
  { id: 'streak_14', type: 'streak', title: 'Two Week Champion', description: '14-day workout streak', threshold: 14 },
  { id: 'streak_30', type: 'streak', title: 'Monthly Master', description: '30-day workout streak', threshold: 30 },
  { id: 'streak_60', type: 'streak', title: 'Streak Superstar', description: '60-day workout streak', threshold: 60 },
  { id: 'streak_100', type: 'streak', title: 'Unstoppable', description: '100-day workout streak', threshold: 100 },
  
  // Time milestones (in hours)
  { id: 'time_10', type: 'time_milestone', title: 'Getting Active', description: '10 hours of total workout time', threshold: 10 },
  { id: 'time_25', type: 'time_milestone', title: 'Time Warrior', description: '25 hours of total workout time', threshold: 25 },
  { id: 'time_50', type: 'time_milestone', title: 'Dedicated Athlete', description: '50 hours of total workout time', threshold: 50 },
  { id: 'time_100', type: 'time_milestone', title: 'Fitness Devotee', description: '100 hours of total workout time', threshold: 100 },
  
  // Journey anniversary milestones (in days)
  { id: 'journey_30', type: 'journey_anniversary', title: '1 Month Strong', description: '1 month since starting your GetMaximumFit journey', threshold: 30 },
  { id: 'journey_90', type: 'journey_anniversary', title: '3 Months Committed', description: '3 months since starting your GetMaximumFit journey', threshold: 90 },
  { id: 'journey_180', type: 'journey_anniversary', title: '6 Months Dedicated', description: '6 months since starting your GetMaximumFit journey', threshold: 180 },
  { id: 'journey_365', type: 'journey_anniversary', title: '1 Year Champion', description: '1 year since starting your GetMaximumFit journey!', threshold: 365 },
  { id: 'journey_730', type: 'journey_anniversary', title: '2 Year Legend', description: '2 years since starting your GetMaximumFit journey!', threshold: 730 },
];

/**
 * Create or update user fitness profile when they first sign up
 */
export const createUserFitnessProfile = async (userId: string): Promise<UserFitnessProfile> => {
  try {
    const userProfileRef = doc(db, 'userFitnessProfiles', userId);
    const existingProfile = await getDoc(userProfileRef);
    
    if (existingProfile.exists()) {
      console.log('✅ User fitness profile already exists');
      return existingProfile.data() as UserFitnessProfile;
    }
    
    const now = Timestamp.now();
    const newProfile: UserFitnessProfile = {
      userId,
      fitnessJourneyStartDate: now,
      totalWorkouts: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalExercisesCompleted: 0,
      totalWorkoutTime: 0,
      achievements: [],
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(userProfileRef, newProfile);
    console.log('✅ Created new user fitness profile');
    return newProfile;
  } catch (error) {
    console.error('❌ Error creating user fitness profile:', error);
    throw error;
  }
};

/**
 * Get user fitness profile
 */
export const getUserFitnessProfile = async (userId: string): Promise<UserFitnessProfile | null> => {
  try {
    const userProfileRef = doc(db, 'userFitnessProfiles', userId);
    const profileSnap = await getDoc(userProfileRef);
    
    if (profileSnap.exists()) {
      return profileSnap.data() as UserFitnessProfile;
    }
    
    // If profile doesn't exist, create it
    return await createUserFitnessProfile(userId);
  } catch (error) {
    console.error('❌ Error getting user fitness profile:', error);
    return null;
  }
};

/**
 * Record a completed workout and update fitness profile
 */
export const recordWorkoutSession = async (
  userId: string, 
  workoutData: Omit<WorkoutSession, 'id' | 'userId' | 'completedAt'>
): Promise<void> => {
  try {
    // Create workout session record
    const workoutSessionRef = doc(collection(db, 'workoutSessions'));
    const workoutSession: WorkoutSession = {
      id: workoutSessionRef.id,
      userId,
      ...workoutData,
      completedAt: Timestamp.now(),
    };
    
    await setDoc(workoutSessionRef, workoutSession);
    
    // Update user fitness profile
    await updateUserFitnessStats(userId, workoutSession);
    
    console.log('✅ Recorded workout session and updated stats');
  } catch (error) {
    console.error('❌ Error recording workout session:', error);
    throw error;
  }
};

/**
 * Update user fitness statistics after a workout
 */
const updateUserFitnessStats = async (userId: string, workout: WorkoutSession): Promise<void> => {
  try {
    const userProfileRef = doc(db, 'userFitnessProfiles', userId);
    const profile = await getUserFitnessProfile(userId);
    
    if (!profile) {
      throw new Error('User fitness profile not found');
    }
    
    // Calculate streak
    const { currentStreak, longestStreak } = calculateWorkoutStreak(profile, workout.completedAt);
    
    // Update profile
    const updatedProfile: Partial<UserFitnessProfile> = {
      totalWorkouts: profile.totalWorkouts + 1,
      currentStreak,
      longestStreak: Math.max(longestStreak, profile.longestStreak),
      lastWorkoutDate: workout.completedAt,
      totalExercisesCompleted: profile.totalExercisesCompleted + workout.exercisesCompleted,
      totalWorkoutTime: profile.totalWorkoutTime + workout.duration,
      updatedAt: Timestamp.now(),
    };
    
    await updateDoc(userProfileRef, updatedProfile);
    
    // Check for new achievements
    await checkAndUnlockAchievements(userId, { ...profile, ...updatedProfile } as UserFitnessProfile);
    
  } catch (error) {
    console.error('❌ Error updating user fitness stats:', error);
    throw error;
  }
};

/**
 * Calculate workout streak based on consecutive days
 */
const calculateWorkoutStreak = (profile: UserFitnessProfile, newWorkoutDate: Timestamp): { currentStreak: number; longestStreak: number } => {
  const today = new Date();
  const newWorkoutDay = newWorkoutDate.toDate();
  const lastWorkoutDay = profile.lastWorkoutDate?.toDate();
  
  // If this is the first workout or no previous workout
  if (!lastWorkoutDay) {
    return { currentStreak: 1, longestStreak: 1 };
  }
  
  // Calculate days difference
  const diffTime = newWorkoutDay.getTime() - lastWorkoutDay.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Same day, maintain current streak
    return { currentStreak: profile.currentStreak, longestStreak: profile.longestStreak };
  } else if (diffDays === 1) {
    // Consecutive day, increment streak
    const newStreak = profile.currentStreak + 1;
    return { currentStreak: newStreak, longestStreak: Math.max(newStreak, profile.longestStreak) };
  } else {
    // Gap in workouts, reset streak
    return { currentStreak: 1, longestStreak: profile.longestStreak };
  }
};

/**
 * Check and unlock achievements based on current stats
 */
const checkAndUnlockAchievements = async (userId: string, profile: UserFitnessProfile): Promise<void> => {
  try {
    const newAchievements: string[] = [];
    const journeyDays = Math.floor((Timestamp.now().toMillis() - profile.fitnessJourneyStartDate.toMillis()) / (1000 * 60 * 60 * 24));
    const totalHours = Math.floor(profile.totalWorkoutTime / 60);
    
    for (const milestone of ACHIEVEMENT_MILESTONES) {
      // Skip if already achieved
      if (profile.achievements.includes(milestone.id)) continue;
      
      let achieved = false;
      
      switch (milestone.type) {
        case 'workout_count':
          achieved = profile.totalWorkouts >= milestone.threshold;
          break;
        case 'streak':
          achieved = profile.currentStreak >= milestone.threshold || profile.longestStreak >= milestone.threshold;
          break;
        case 'time_milestone':
          achieved = totalHours >= milestone.threshold;
          break;
        case 'journey_anniversary':
          achieved = journeyDays >= milestone.threshold;
          break;
      }
      
      if (achieved) {
        newAchievements.push(milestone.id);
      }
    }
    
    if (newAchievements.length > 0) {
      const userProfileRef = doc(db, 'userFitnessProfiles', userId);
      await updateDoc(userProfileRef, {
        achievements: [...profile.achievements, ...newAchievements],
        updatedAt: Timestamp.now(),
      });
      
      console.log(`🏆 Unlocked ${newAchievements.length} new achievements:`, newAchievements);
    }
  } catch (error) {
    console.error('❌ Error checking achievements:', error);
  }
};

/**
 * Get user's recent workout sessions
 */
export const getUserWorkoutSessions = async (userId: string, limit: number = 10): Promise<WorkoutSession[]> => {
  try {
    const workoutSessionsRef = collection(db, 'workoutSessions');
    const q = query(
      workoutSessionsRef,
      where('userId', '==', userId),
      orderBy('completedAt', 'desc'),
      // Note: Firestore limit would be added here, but we'll handle it in the component
    );
    
    const querySnapshot = await getDocs(q);
    const sessions: WorkoutSession[] = [];
    
    querySnapshot.forEach((doc) => {
      sessions.push(doc.data() as WorkoutSession);
    });
    
    return sessions.slice(0, limit);
  } catch (error) {
    console.error('❌ Error getting user workout sessions:', error);
    return [];
  }
};

/**
 * Get achievement details by ID
 */
export const getAchievementDetails = (achievementId: string): AchievementMilestone | null => {
  return ACHIEVEMENT_MILESTONES.find(milestone => milestone.id === achievementId) || null;
};

/**
 * Calculate fitness journey statistics
 */
export const calculateJourneyStats = (profile: UserFitnessProfile) => {
  const now = new Date();
  const startDate = profile.fitnessJourneyStartDate.toDate();
  const journeyDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const journeyWeeks = Math.floor(journeyDays / 7);
  const journeyMonths = Math.floor(journeyDays / 30);
  
  const totalHours = Math.floor(profile.totalWorkoutTime / 60);
  const avgWorkoutsPerWeek = journeyWeeks > 0 ? (profile.totalWorkouts / journeyWeeks).toFixed(1) : '0';
  const avgMinutesPerWorkout = profile.totalWorkouts > 0 ? Math.floor(profile.totalWorkoutTime / profile.totalWorkouts) : 0;
  
  return {
    journeyDays,
    journeyWeeks,
    journeyMonths,
    totalHours,
    avgWorkoutsPerWeek: parseFloat(avgWorkoutsPerWeek),
    avgMinutesPerWorkout,
    startDate,
  };
};

/**
 * Get comprehensive journey statistics for a user
 */
export const getUserJourneyStats = async (userId: string) => {
  try {
    const fitnessProfile = await getUserFitnessProfile(userId);
    if (!fitnessProfile) {
      return null;
    }

    const now = new Date();
    const journeyStartDate = fitnessProfile.fitnessJourneyStartDate.toDate();
    
    // Calculate total days in journey
    const totalDaysInJourney = Math.floor((now.getTime() - journeyStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate total workout time in hours
    const totalWorkoutTimeHours = Math.round(fitnessProfile.totalWorkoutTime / 60);
    
    // Get current streak details
    const currentStreakDays = fitnessProfile.currentStreak;
    
    // Get recent achievements (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentAchievements = fitnessProfile.achievements.filter((achievementId: string) => {
      // For now, we'll return all achievements since we don't have unlock dates stored
      return true;
    });

    return {
      journeyStartDate,
      totalDaysInJourney,
      totalWorkouts: fitnessProfile.totalWorkouts,
      totalWorkoutTimeHours,
      longestStreak: fitnessProfile.longestStreak,
      currentStreakDays,
      totalAchievements: fitnessProfile.achievements.length,
      recentAchievements,
      weeklyAverage: totalDaysInJourney > 0 ? Math.round((fitnessProfile.totalWorkouts / totalDaysInJourney) * 7 * 10) / 10 : 0,
    };
  } catch (error) {
    console.error('Error getting user journey stats:', error);
    return null;
  }
};

/**
 * Check for newly unlocked achievements based on current progress
 */
export const checkForNewAchievements = async (userId: string): Promise<AchievementMilestone[]> => {
  try {
    const fitnessProfile = await getUserFitnessProfile(userId);
    if (!fitnessProfile) {
      return [];
    }

    const now = new Date();
    const journeyStartDate = fitnessProfile.fitnessJourneyStartDate.toDate();
    const totalDaysInJourney = Math.floor((now.getTime() - journeyStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalWorkoutTimeHours = Math.round(fitnessProfile.totalWorkoutTime / 60);
    const currentStreak = fitnessProfile.currentStreak;

    // Get list of already unlocked achievement IDs
    const unlockedIds = new Set(fitnessProfile.achievements);

    // Check all milestone achievements
    const newlyUnlocked: AchievementMilestone[] = [];

    for (const milestone of ACHIEVEMENT_MILESTONES) {
      if (unlockedIds.has(milestone.id)) {
        continue; // Already unlocked
      }

      let isUnlocked = false;

      switch (milestone.type) {
        case 'workout_count':
          isUnlocked = fitnessProfile.totalWorkouts >= milestone.threshold;
          break;
        case 'streak':
          isUnlocked = currentStreak >= milestone.threshold || fitnessProfile.longestStreak >= milestone.threshold;
          break;
        case 'time_milestone':
          isUnlocked = totalWorkoutTimeHours >= milestone.threshold;
          break;
        case 'journey_anniversary':
          isUnlocked = totalDaysInJourney >= milestone.threshold;
          break;
      }

      if (isUnlocked) {
        newlyUnlocked.push(milestone);
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking for new achievements:', error);
    return [];
  }
};
