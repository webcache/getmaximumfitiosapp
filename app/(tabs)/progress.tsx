import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { db } from '../../firebase';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { AchievementMilestone, checkForNewAchievements, getUserFitnessProfile, UserFitnessProfile } from '../../services/userProfileService';
import { convertFirestoreDate, MaxLift } from '../../utils';

export default function ProgressScreen() {
  // ALL HOOKS MUST BE CALLED FIRST
  const { isReady, user, userProfile } = useAuthGuard();
  const [loading, setLoading] = useState(true);
  const [maxLifts, setMaxLifts] = useState<MaxLift[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [fitnessProfile, setFitnessProfile] = useState<UserFitnessProfile | null>(null);
  const [journeyStats, setJourneyStats] = useState<any>(null);
  const [recentAchievements, setRecentAchievements] = useState<AchievementMilestone[]>([]);
  const [newGoal, setNewGoal] = useState({
    type: 'lift', // 'lift', 'weight', 'time'
    exercise: '',
    targetValue: '',
    unit: 'lbs',
    description: '',
  });
  const [workoutStats, setWorkoutStats] = useState({
    workoutsThisMonth: 0,
    avgSessionsPerWeek: 0,
    avgWorkoutDuration: 0,
    currentStreak: 0,
  });

  // ALL useCallback and useEffect hooks
  const fetchFitnessProfile = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Progress tab: Fetching fitness profile...');
      const profile = await getUserFitnessProfile(user.uid);
      setFitnessProfile(profile);
      
      if (profile) {
        // Only get achievements from profile, let workout stats handle the journey data
        const newAchievements = await checkForNewAchievements(user.uid);
        setRecentAchievements(newAchievements);
        
        console.log('✅ Progress tab: Fitness profile loaded:', {
          profileExists: !!profile,
          achievements: profile.achievements.length,
        });
      }
    } catch (error) {
      console.error('❌ Progress tab: Error fetching fitness profile:', error);
    }
  }, [user]);

  const fetchWeightHistory = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Progress tab: Fetching weight history...');
      const weightHistoryRef = collection(db, 'profiles', user.uid, 'weightHistory');
      const weightHistoryQuery = query(weightHistoryRef, orderBy('date', 'asc'));
      const snapshot = await getDocs(weightHistoryQuery);
      
      const weightData: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        weightData.push({
          id: doc.id,
          weight: parseFloat(data.weight),
          date: convertFirestoreDate(data.date),
          unit: data.unit || 'lbs',
        });
      });
      
      setWeightHistory(weightData);
      console.log('✅ Progress tab: Weight history loaded, count:', weightData.length);
    } catch (error) {
      console.error('❌ Progress tab: Error fetching weight history:', error);
    }
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Progress tab: Fetching goals...');
      const goalsRef = collection(db, 'profiles', user.uid, 'goals');
      const goalsQuery = query(goalsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(goalsQuery);
      
      const goalsData: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        goalsData.push({
          id: doc.id,
          ...data,
          createdAt: convertFirestoreDate(data.createdAt),
          targetDate: data.targetDate ? convertFirestoreDate(data.targetDate) : null,
        });
      });
      
      setGoals(goalsData);
      console.log('✅ Progress tab: Goals loaded, count:', goalsData.length);
    } catch (error) {
      console.error('❌ Progress tab: Error fetching goals:', error);
    }
  }, [user]);

  const fetchWorkoutStats = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Progress tab: Fetching workout stats...');
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      const workoutsSnapshot = await getDocs(workoutsRef);
      
      const workouts: any[] = [];
      workoutsSnapshot.forEach((doc) => {
        const data = doc.data();
        workouts.push({
          ...data,
          date: convertFirestoreDate(data.date),
        });
      });

      // Calculate stats
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const workoutsThisMonth = workouts.filter(w => {
        const workoutDate = new Date(w.date);
        return workoutDate.getMonth() === currentMonth && workoutDate.getFullYear() === currentYear;
      }).length;

      // Calculate average sessions per week (last 4 weeks)
      const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      const recentWorkouts = workouts.filter(w => new Date(w.date) >= fourWeeksAgo);
      const avgSessionsPerWeek = Math.round(recentWorkouts.length / 4);

      // Calculate average workout duration
      const workoutsWithDuration = workouts.filter(w => w.duration);
      const avgWorkoutDuration = workoutsWithDuration.length > 0 
        ? Math.round(workoutsWithDuration.reduce((sum, w) => sum + w.duration, 0) / workoutsWithDuration.length)
        : 0;

      // Calculate current streak
      const sortedWorkouts = workouts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      let currentStreak = 0;
      let checkDate = new Date();
      checkDate.setHours(23, 59, 59, 999); // End of today

      for (const workout of sortedWorkouts) {
        const workoutDate = new Date(workout.date);
        workoutDate.setHours(23, 59, 59, 999);
        
        const daysDiff = Math.floor((checkDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === currentStreak || (currentStreak === 0 && daysDiff <= 1)) {
          currentStreak++;
          checkDate = workoutDate;
        } else {
          break;
        }
      }

      // Calculate comprehensive journey stats from actual workout data
      const totalWorkouts = workouts.length;
      const totalWorkoutTimeMinutes = workoutsWithDuration.reduce((sum, w) => sum + (w.duration || 0), 0);
      const totalWorkoutTimeHours = Math.round(totalWorkoutTimeMinutes / 60);
      
      // Calculate journey start date from first workout, or use today if no workouts
      const earliestWorkout = workouts.length > 0 
        ? workouts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
        : null;
      
      const journeyStartDate = earliestWorkout ? new Date(earliestWorkout.date) : new Date();
      const totalDaysInJourney = Math.max(1, Math.floor((now.getTime() - journeyStartDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Calculate longest streak
      let longestStreak = 0;
      if (workouts.length > 0) {
        let tempStreak = 0;
        let lastWorkoutDate: Date | null = null;
        
        for (const workout of sortedWorkouts.reverse()) { // Sort chronologically for streak calculation
          const workoutDate = new Date(workout.date);
          workoutDate.setHours(0, 0, 0, 0);
          
          if (lastWorkoutDate) {
            const daysDiff = Math.floor((workoutDate.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 1) {
              tempStreak++;
            } else {
              longestStreak = Math.max(longestStreak, tempStreak);
              tempStreak = 1;
            }
          } else {
            tempStreak = 1;
          }
          lastWorkoutDate = workoutDate;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }
      
      // Calculate weekly average (only if we have workout data)
      const weeklyAverage = totalWorkouts > 0 && totalDaysInJourney > 7 
        ? Math.round((totalWorkouts / totalDaysInJourney) * 7) 
        : totalWorkouts;

      setWorkoutStats({
        workoutsThisMonth,
        avgSessionsPerWeek,
        avgWorkoutDuration,
        currentStreak,
      });

      // Update journey stats with calculated values
      // Don't include achievements count here - let updateJourneyStatsAchievements handle it
      
      setJourneyStats({
        totalWorkouts,
        totalWorkoutTimeHours,
        journeyStartDate,
        totalDaysInJourney,
        currentStreakDays: currentStreak,
        longestStreak,
        weeklyAverage,
        totalAchievements: 0, // Will be updated by updateJourneyStatsAchievements
      });

      console.log('✅ Progress tab: Workout stats calculated:', { 
        workoutsThisMonth, 
        avgSessionsPerWeek, 
        avgWorkoutDuration, 
        currentStreak,
        totalWorkouts,
        totalWorkoutTimeHours,
        weeklyAverage
      });
    } catch (error) {
      console.error('❌ Progress tab: Error fetching workout stats:', error);
    }
  }, [user]);

  const fetchMaxLifts = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Progress tab: Fetching max lifts for user:', user.uid);
      const maxLiftsRef = collection(db, 'profiles', user.uid, 'maxLifts');
      const snapshot = await getDocs(maxLiftsRef);
      
      console.log('🔍 Progress tab: Max lifts collection path:', `profiles/${user.uid}/maxLifts`);
      console.log('🔍 Progress tab: Max lifts snapshot size:', snapshot.size);
      
      const maxLiftsData: MaxLift[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('🔍 Progress tab: Max lift doc data:', { id: doc.id, data });
        maxLiftsData.push({
          id: doc.id,
          exerciseName: data.exerciseName, // Use exerciseName as stored in Firestore
          weight: data.weight,
          reps: data.reps || '1', // Default to 1 rep for max lifts
          unit: data.unit || 'lbs', // Default to lbs, can be made into a user setting later
          date: convertFirestoreDate(data.date),
          notes: data.notes,
        });
      });
      
      setMaxLifts(maxLiftsData);
      console.log('✅ Progress tab: Max lifts loaded successfully:', {
        count: maxLiftsData.length,
        lifts: maxLiftsData.map(lift => ({
          exercise: lift.exerciseName,
          weight: lift.weight,
          unit: lift.unit
        }))
      });
    } catch (error) {
      console.error('❌ Progress tab: Error fetching max lifts:', error);
    }
  }, [user]);

  // Update achievements count when fitness profile changes
  useEffect(() => {
    if (fitnessProfile && journeyStats) {
      setJourneyStats((prev: any) => prev ? {
        ...prev,
        totalAchievements: fitnessProfile.achievements?.length || 0,
      } : null);
    }
  }, [fitnessProfile]); // Only depend on fitnessProfile, not journeyStats

  useEffect(() => {
    const loadData = async () => {
      console.log('🔍 Progress tab: loadData effect triggered:', {
        user: user ? { uid: user.uid, email: user.email } : 'no user',
        isReady,
        hasUser: !!user
      });
      
      if (user) {
        console.log('🔍 Progress tab: Loading data for user:', user.uid);
        setLoading(true);
        try {
          // Load fitness profile first to get achievements data
          await fetchFitnessProfile();
          // Then load workout stats which will calculate journey stats
          await fetchWorkoutStats();
          // Load other data in parallel
          await Promise.all([fetchMaxLifts(), fetchGoals(), fetchWeightHistory()]);
          console.log('✅ Progress tab: All data loaded successfully');
        } catch (error) {
          console.error('❌ Progress tab: Error loading data:', error);
        }
        setLoading(false);
      } else {
        console.log('⚠️ Progress tab: No user available, cannot load data');
        setLoading(false);
      }
    };
    
    if (isReady && user) {
      loadData();
    } else {
      console.log('⚠️ Progress tab: App not ready yet or no user, waiting...', { isReady, hasUser: !!user });
    }
  }, [user, isReady]);

  // Note: Removed useFocusEffect to prevent infinite loops
  // Data will be refreshed when user navigates to tab via the main useEffect

  // Early return AFTER all hooks are called
  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText>Loading...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  // Default/fallback max lifts data
  const defaultMaxLifts = [
    { exerciseName: 'Bench Press', weight: '225 lbs' },
    { exerciseName: 'Back Squat', weight: '315 lbs' },
    { exerciseName: 'Deadlift', weight: '405 lbs' },
    { exerciseName: 'Incline Bench', weight: '135 lbs' },
  ];

  // Add new goal
  const addGoal = async () => {
    if (!user || !newGoal.description || !newGoal.targetValue) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const goalsRef = collection(db, 'profiles', user.uid, 'goals');
      await addDoc(goalsRef, {
        ...newGoal,
        targetValue: newGoal.type === 'lift' ? newGoal.targetValue : parseFloat(newGoal.targetValue),
        createdAt: new Date(),
      });
      
      setNewGoal({
        type: 'lift',
        exercise: '',
        targetValue: '',
        unit: 'lbs',
        description: '',
      });
      setShowGoalModal(false);
      await fetchGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
      Alert.alert('Error', 'Failed to add goal');
    }
  };

  // Delete goal
  const deleteGoal = async (goalId: string) => {
    if (!user) return;

    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'profiles', user.uid, 'goals', goalId));
              await fetchGoals();
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  // Calculate goal progress
  const calculateGoalProgress = (goal: any) => {
    try {
      console.log('🔍 Progress tab: Calculating progress for goal:', {
        id: goal.id,
        type: goal.type,
        exercise: goal.exercise,
        description: goal.description,
        targetValue: goal.targetValue
      });
      
      if (goal.type === 'lift') {
        // Try to get exercise name from either exercise field or description
        let exerciseName = goal.exercise;
        if (!exerciseName && goal.description) {
          // Parse exercise name from description (e.g., "Bench Press 350" -> "Bench Press")
          exerciseName = goal.description.replace(/\s+\d+.*$/g, '').trim();
          console.log('🔍 Progress tab: Parsed exercise name from description:', exerciseName);
        }
        
        if (!exerciseName) {
          console.log('⚠️ Progress tab: No exercise name found for goal');
          return 0;
        }
        
        const maxLift = getMaxLiftForExercise(exerciseName);
        console.log('🔍 Progress tab: Max lift found for goal:', maxLift);
        
        if (!maxLift) {
          console.log('⚠️ Progress tab: No max lift found for exercise:', exerciseName);
          return 0;
        }
        
        const currentWeight = parseFloat(maxLift.weight?.toString().replace(/[^\d.]/g, '') || '0');
        const targetWeight = parseFloat(goal.targetValue?.toString().replace(/[^\d.]/g, '') || '0');
        
        console.log('🔍 Progress tab: Weight comparison:', {
          currentWeight,
          targetWeight,
          currentWeightRaw: maxLift.weight,
          targetValueRaw: goal.targetValue
        });
        
        if (targetWeight <= 0) {
          console.log('⚠️ Progress tab: Invalid target weight:', targetWeight);
          return 0;
        }
        
        const progress = Math.min(Math.round((currentWeight / targetWeight) * 100), 100);
        console.log('✅ Progress tab: Calculated progress:', progress + '%');
        return progress;
      }
      
      if (goal.type === 'weight') {
        // For weight goals, compare against the latest weight entry
        if (weightHistory.length === 0) {
          console.log('⚠️ Progress tab: No weight history available for weight goal');
          return 0;
        }
        
        const latestWeight = weightHistory[weightHistory.length - 1]?.weight || 0;
        const targetWeight = parseFloat(goal.targetValue?.toString().replace(/[^\d.]/g, '') || '0');
        
        if (targetWeight <= 0) {
          console.log('⚠️ Progress tab: Invalid target weight for weight goal:', targetWeight);
          return 0;
        }
        
        // Calculate progress based on whether it's weight loss or weight gain
        let progress = 0;
        if (goal.goalType === 'lose') {
          const startWeight = weightHistory[0]?.weight || latestWeight;
          const weightLost = startWeight - latestWeight;
          const targetWeightLoss = startWeight - targetWeight;
          progress = targetWeightLoss > 0 ? Math.min(Math.round((weightLost / targetWeightLoss) * 100), 100) : 0;
        } else {
          // For weight gain goals
          progress = Math.min(Math.round((latestWeight / targetWeight) * 100), 100);
        }
        
        console.log('✅ Progress tab: Weight goal progress:', progress + '%');
        return progress;
      }
      
      // For other goal types, return 0 for now (can be expanded later)
      console.log('⚠️ Progress tab: Unsupported goal type:', goal.type);
      return 0;
    } catch (error) {
      console.error('❌ Progress tab: Error calculating goal progress:', error);
      return 0;
    }
  };

  // Get current value for goal
  const getCurrentValue = (goal: any) => {
    try {
      if (goal.type === 'lift') {
        // Try to get exercise name from either exercise field or description
        let exerciseName = goal.exercise;
        if (!exerciseName && goal.description) {
          // Parse exercise name from description (e.g., "Bench Press 350" -> "Bench Press")
          exerciseName = goal.description.replace(/\s+\d+\s*$/, '').trim();
        }
        
        if (!exerciseName) {
          return 'No exercise name';
        }
        
        const maxLift = getMaxLiftForExercise(exerciseName);
        return maxLift ? maxLift.weight : 'No data';
      }
      return 'N/A';
    } catch (error) {
      console.error('❌ Progress tab: Error getting current value:', error);
      return 'Error';
    }
  };

  // Get max lift for a specific exercise
  const getMaxLiftForExercise = (exerciseName: string) => {
    try {
      if (!maxLifts || !Array.isArray(maxLifts)) {
        console.log('⚠️ Progress tab: maxLifts not available or not an array');
        return null;
      }
      
      console.log('🔍 Progress tab: Looking for exercise:', exerciseName);
      console.log('🔍 Progress tab: Available max lifts:', maxLifts.map(lift => ({
        id: lift.id,
        exerciseName: lift.exerciseName,
        weight: lift.weight
      })));
      
      // Normalize exercise names for better matching
      const normalizeExerciseName = (name: string) => {
        return name?.toLowerCase()
          .trim()
          .replace(/[^\w\s]/g, '') // Remove special characters
          .replace(/\s+/g, ' '); // Normalize whitespace
      };
      
      const normalizedTargetName = normalizeExerciseName(exerciseName);
      
      const exerciseMaxLifts = maxLifts.filter(
        (lift: MaxLift) => {
          const normalizedLiftName = normalizeExerciseName(lift.exerciseName || '');
          const exactMatch = normalizedLiftName === normalizedTargetName;
          const partialMatch = normalizedLiftName.includes(normalizedTargetName) || 
                              normalizedTargetName.includes(normalizedLiftName);
          
          console.log('🔍 Progress tab: Comparing:', {
            original: lift.exerciseName,
            normalized: normalizedLiftName,
            target: normalizedTargetName,
            exactMatch,
            partialMatch
          });
          
          return exactMatch || partialMatch;
        }
      );
      
      console.log('🔍 Progress tab: Matching lifts for', exerciseName, ':', exerciseMaxLifts);
      
      if (exerciseMaxLifts.length === 0) {
        console.log('⚠️ Progress tab: No matching lifts found for:', exerciseName);
        return null;
      }
      
      // Return the most recent max lift for this exercise (highest weight)
      const selectedLift = exerciseMaxLifts.reduce((prev, current) => {
        const prevWeight = parseFloat(prev.weight?.toString().replace(/[^\d.]/g, '') || '0');
        const currentWeight = parseFloat(current.weight?.toString().replace(/[^\d.]/g, '') || '0');
        return currentWeight > prevWeight ? current : prev;
      });
      
      console.log('✅ Progress tab: Selected lift for', exerciseName, ':', selectedLift);
      return selectedLift;
    } catch (error) {
      console.error('❌ Progress tab: Error getting max lift for exercise:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading progress data...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Track Your Progress</ThemedText>
          <ThemedText style={styles.subtitle}>
            Monitor your fitness journey and achievements
          </ThemedText>
        </ThemedView>

        {/* Comprehensive Fitness Journey & Statistics Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Your Fitness Journey
          </ThemedText>
          
          {journeyStats ? (
            <>
              {/* Hero Journey Cards */}
              <View style={styles.journeyHeroCards}>
                <View style={styles.journeyHeroCard}>
                  <FontAwesome6 name="calendar-check" size={28} color="#007AFF" style={styles.journeyHeroIcon} />
                  <ThemedText style={styles.journeyHeroTitle}>Journey Started</ThemedText>
                  <ThemedText style={styles.journeyHeroValue}>
                    {journeyStats.journeyStartDate.toLocaleDateString()}
                  </ThemedText>
                  <ThemedText style={styles.journeyHeroSubtext}>
                    {journeyStats.totalDaysInJourney} days committed
                  </ThemedText>
                </View>
                
                <View style={[styles.journeyHeroCard, styles.streakCard]}>
                  <FontAwesome6 name="fire" size={28} color="#FF6B6B" style={styles.journeyHeroIcon} />
                  <ThemedText style={styles.journeyHeroTitle}>Current Streak</ThemedText>
                  <ThemedText style={[styles.journeyHeroValue, styles.streakValue]}>
                    {journeyStats.currentStreakDays}
                  </ThemedText>
                  <ThemedText style={styles.journeyHeroSubtext}>
                    days • Best: {journeyStats.longestStreak}
                  </ThemedText>
                </View>
              </View>

              {/* Comprehensive Statistics Grid */}
              <View style={styles.comprehensiveStatsGrid}>
                {/* Row 1: Primary Metrics */}
                <View style={styles.statsRow}>
                  <View style={styles.journeyStatCard}>
                    <FontAwesome6 name="dumbbell" size={18} color="#4CAF50" style={styles.statIcon} />
                    <ThemedText style={styles.statNumber}>{journeyStats.totalWorkouts}</ThemedText>
                    <ThemedText style={styles.statLabel}>Total Workouts</ThemedText>
                  </View>
                  
                  <View style={styles.journeyStatCard}>
                    <FontAwesome6 name="clock" size={18} color="#FF9800" style={styles.statIcon} />
                    <ThemedText style={styles.statNumber}>{journeyStats.totalWorkoutTimeHours}h</ThemedText>
                    <ThemedText style={styles.statLabel}>Total Time</ThemedText>
                  </View>
                </View>

                {/* Row 2: Activity Metrics */}
                <View style={styles.statsRow}>
                  <View style={styles.journeyStatCard}>
                    <FontAwesome6 name="calendar-week" size={18} color="#2196F3" style={styles.statIcon} />
                    <ThemedText style={styles.statNumber}>{workoutStats.workoutsThisMonth}</ThemedText>
                    <ThemedText style={styles.statLabel}>This Month</ThemedText>
                  </View>
                  
                  <View style={styles.journeyStatCard}>
                    <FontAwesome6 name="chart-line" size={18} color="#9C27B0" style={styles.statIcon} />
                    <ThemedText style={styles.statNumber}>{journeyStats.weeklyAverage}</ThemedText>
                    <ThemedText style={styles.statLabel}>Weekly Avg</ThemedText>
                  </View>
                </View>

                {/* Row 3: Performance Metrics */}
                <View style={styles.statsRow}>
                  <View style={styles.journeyStatCard}>
                    <FontAwesome6 name="stopwatch" size={18} color="#FF5722" style={styles.statIcon} />
                    <ThemedText style={styles.statNumber}>
                      {workoutStats.avgWorkoutDuration > 0 ? `${workoutStats.avgWorkoutDuration}` : 'N/A'}
                    </ThemedText>
                    <ThemedText style={styles.statLabel}>Avg Duration (min)</ThemedText>
                  </View>
                  
                  <View style={styles.journeyStatCard}>
                    <FontAwesome6 name="trophy" size={18} color="#FFD700" style={styles.statIcon} />
                    <ThemedText style={styles.statNumber}>{journeyStats.totalAchievements}</ThemedText>
                    <ThemedText style={styles.statLabel}>Achievements</ThemedText>
                  </View>
                </View>
              </View>

              {/* Progress Insights */}
              {journeyStats.totalWorkouts > 0 && (
                <View style={styles.progressInsights}>
                  <ThemedText style={styles.insightsTitle}>Your Progress Insights</ThemedText>
                  <View style={styles.insightItem}>
                    <FontAwesome6 name="arrow-trend-up" size={14} color="#4CAF50" />
                    <ThemedText style={styles.insightText}>
                      You&apos;ve been consistent for {journeyStats.totalDaysInJourney} days!
                    </ThemedText>
                  </View>
                  <View style={styles.insightItem}>
                    <FontAwesome6 name="bullseye" size={14} color="#007AFF" />
                    <ThemedText style={styles.insightText}>
                      {workoutStats.avgSessionsPerWeek} sessions per week keeps you on track
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Show encouraging message for new users */}
              {journeyStats.totalWorkouts === 0 && (
                <View style={styles.progressInsights}>
                  <ThemedText style={styles.insightsTitle}>Start Your Journey!</ThemedText>
                  <View style={styles.insightItem}>
                    <FontAwesome6 name="star" size={14} color="#FFD700" />
                    <ThemedText style={styles.insightText}>
                      Complete your first workout to start tracking your progress
                    </ThemedText>
                  </View>
                  <View style={styles.insightItem}>
                    <FontAwesome6 name="chart-line" size={14} color="#007AFF" />
                    <ThemedText style={styles.insightText}>
                      Your stats will appear here as you build your fitness routine
                    </ThemedText>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noGoalsContainer}>
              <FontAwesome6 name="dumbbell" size={48} color="#007AFF" style={styles.noGoalsIcon} />
              <ThemedText style={styles.noGoalsText}>
                Loading your fitness journey...
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* Recent Achievements Section */}
        {recentAchievements.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Recent Achievements
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
              {recentAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementCard}>
                  <FontAwesome6 name="trophy" size={20} color="#FFD700" style={styles.achievementIcon} />
                  <ThemedText style={styles.achievementTitle}>{achievement.title}</ThemedText>
                  <ThemedText style={styles.achievementDescription}>{achievement.description}</ThemedText>
                </View>
              ))}
            </ScrollView>
          </ThemedView>
        )}

      {/* Current Max Lifts Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Current Max Lifts
        </ThemedText>
        <View style={styles.statsGrid}>
          {/* Show actual max lifts from Firestore first */}
          {maxLifts.map((lift, index) => (
            <View key={`firestore-${index}`} style={[
              styles.statCard,
              styles.realDataCard
            ]}>
              <ThemedText style={[
                styles.statValue,
                styles.realDataValue
              ]}>
                {lift.weight} {lift.unit || 'lbs'}
              </ThemedText>
              <ThemedText style={styles.statLabel}>
                {lift.exerciseName}
              </ThemedText>
              <ThemedText style={styles.realDataIndicator}>
                ✓ Personal Record
              </ThemedText>
            </View>
          ))}
          
          {/* Show default exercises only if no real data exists */}
          {maxLifts.length === 0 && defaultMaxLifts.map((exercise, index) => (
            <View key={`default-${index}`} style={styles.statCard}>
              <ThemedText style={styles.statValue}>
                {exercise.weight}
              </ThemedText>
              <ThemedText style={styles.statLabel}>
                {exercise.exerciseName}
              </ThemedText>
              <ThemedText style={styles.placeholderIndicator}>
                No data yet
              </ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>

      {/* Goals Progress Section */}
      <ThemedView style={styles.section}>
        <View style={styles.goalsSectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Goals Progress
          </ThemedText>
          <TouchableOpacity 
            style={styles.addGoalButton}
            onPress={() => setShowGoalModal(true)}
          >
            <FontAwesome6 name="plus" size={16} color="#007AFF" />
            <ThemedText style={styles.addGoalText}>Add Goal</ThemedText>
          </TouchableOpacity>
        </View>
        
        {goals.length === 0 ? (
          <View style={styles.noGoalsContainer}>
            <FontAwesome6 name="bullseye" size={48} color="#007AFF" style={styles.noGoalsIcon} />
            <ThemedText style={styles.noGoalsText}>
              No goals set yet. Tap &quot;Add Goal&quot; to create your first fitness goal!
            </ThemedText>
          </View>
        ) : (
          goals
            .map((goal) => ({
              ...goal,
              progress: calculateGoalProgress(goal)
            }))
            .sort((a, b) => b.progress - a.progress) // Sort by progress descending
            .map((goal) => {
              const progress = goal.progress;
              const currentValue = getCurrentValue(goal);
              const isCompleted = progress >= 100;
              
              return (
                <View key={goal.id} style={styles.goalItem}>
                  <View style={styles.goalHeader}>
                    <ThemedText style={[styles.goalName, isCompleted && styles.completedGoalName]}>
                      {goal.description}
                    </ThemedText>
                    <View style={styles.goalActions}>
                      <ThemedText style={[styles.goalProgress, isCompleted && styles.completedGoalProgress]}>
                        {progress}%
                      </ThemedText>
                      <TouchableOpacity
                        style={styles.deleteGoalButton}
                        onPress={() => deleteGoal(goal.id)}
                      >
                        <FontAwesome6 name="trash" size={12} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill, 
                      { width: `${progress}%` },
                      isCompleted && styles.completedProgressFill
                    ]} />
                  </View>
                  <View style={styles.goalDetails}>
                    <ThemedText style={styles.goalDescription}>
                      Current: {currentValue} | Target: {goal.targetValue} {goal.unit}
                    </ThemedText>
                    {isCompleted && (
                      <ThemedText style={styles.goalCompletedText}>
                        🎉 Goal Completed!
                      </ThemedText>
                    )}
                  </View>
                </View>
              );
            })
        )}
      </ThemedView>

      {/* Goal Creation Modal */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Create New Goal
            </ThemedText>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowGoalModal(false)}
            >
              <FontAwesome6 name="xmark" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Goal Type</ThemedText>
              <View style={styles.goalTypeSelector}>
                <TouchableOpacity
                  style={[styles.goalTypeButton, newGoal.type === 'lift' && styles.selectedGoalType]}
                  onPress={() => setNewGoal({ ...newGoal, type: 'lift' })}
                >
                  <FontAwesome6 name="dumbbell" size={16} color={newGoal.type === 'lift' ? '#fff' : '#007AFF'} />
                  <ThemedText style={[styles.goalTypeText, newGoal.type === 'lift' && styles.selectedGoalTypeText]}>
                    Max Lift
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {newGoal.type === 'lift' && (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Exercise Name</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={newGoal.exercise}
                  onChangeText={(text) => setNewGoal({ ...newGoal, exercise: text })}
                  placeholder="e.g., Bench Press"
                  placeholderTextColor="#999"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Target Value</ThemedText>
              <View style={styles.targetValueContainer}>
                <TextInput
                  style={[styles.textInput, styles.targetValueInput]}
                  value={newGoal.targetValue}
                  onChangeText={(text) => setNewGoal({ ...newGoal, targetValue: text })}
                  placeholder="350"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                {newGoal.type === 'lift' && (
                  <View style={styles.unitSelector}>
                    <TouchableOpacity
                      style={[styles.unitButton, newGoal.unit === 'lbs' && styles.selectedUnit]}
                      onPress={() => setNewGoal({ ...newGoal, unit: 'lbs' })}
                    >
                      <ThemedText style={[styles.unitText, newGoal.unit === 'lbs' && styles.selectedUnitText]}>
                        lbs
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unitButton, newGoal.unit === 'kg' && styles.selectedUnit]}
                      onPress={() => setNewGoal({ ...newGoal, unit: 'kg' })}
                    >
                      <ThemedText style={[styles.unitText, newGoal.unit === 'kg' && styles.selectedUnitText]}>
                        kg
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Goal Description</ThemedText>
              <TextInput
                style={styles.textInput}
                value={newGoal.description}
                onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
                placeholder="e.g., Bench Press 350 lbs"
                placeholderTextColor="#999"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowGoalModal(false)}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addGoal}
            >
              <ThemedText style={styles.saveButtonText}>Save Goal</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Chart Placeholder Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Progress Charts
        </ThemedText>
        
        {/* Weight Progress Chart */}
        <View style={styles.chartContainer}>
          <ThemedText style={styles.chartTitle}>
            Weight Progress
          </ThemedText>
          {weightHistory.length > 0 ? (
            <View style={styles.chartWrapper}>
              {/* Simple Bar Chart using React Native Views */}
              <View style={styles.simpleChart}>
                <View style={styles.chartBackground}>
                  {/* Y-axis labels */}
                  <View style={styles.yAxisLabels}>
                    {(() => {
                      try {
                        const recentWeights = weightHistory.slice(-8);
                        if (recentWeights.length === 0) return [];
                        
                        const weights = recentWeights.map(entry => entry.weight).filter(w => !isNaN(w));
                        if (weights.length === 0) return [];
                        
                        const minWeight = Math.min(...weights);
                        const maxWeight = Math.max(...weights);
                        const range = maxWeight - minWeight || 10;
                        const padding = range * 0.1; // Add 10% padding
                        const adjustedMin = Math.max(0, minWeight - padding);
                        const adjustedMax = maxWeight + padding;
                        const adjustedRange = adjustedMax - adjustedMin;
                        
                        const labels: React.ReactElement[] = [];
                        for (let i = 0; i < 5; i++) {
                          const value = adjustedMax - (adjustedRange * i / 4);
                          labels.push(
                            <ThemedText key={i} style={styles.yAxisLabel}>
                              {Math.round(value)}
                            </ThemedText>
                          );
                        }
                        return labels;
                      } catch (error) {
                        console.error('❌ Progress tab: Error rendering Y-axis labels:', error);
                        return [];
                      }
                    })()}
                  </View>
                  
                  {/* Chart Area */}
                  <View style={styles.chartArea}>
                    {/* Grid lines */}
                    <View style={styles.gridLines}>
                      {[0, 1, 2, 3, 4].map(i => (
                        <View key={i} style={styles.gridLine} />
                      ))}
                    </View>
                    
                    {/* Weight points and connecting lines */}
                    <View style={styles.dataPoints}>
                      {(() => {
                        try {
                          return weightHistory.slice(-8).map((entry, index, array) => {
                            if (!entry || isNaN(entry.weight)) return null;
                            
                            // Calculate positioning based on the same logic as Y-axis labels
                            const weights = array.map(e => e.weight).filter(w => !isNaN(w));
                            if (weights.length === 0) return null;
                            
                            const minWeight = Math.min(...weights);
                            const maxWeight = Math.max(...weights);
                            const range = maxWeight - minWeight || 10;
                            const padding = range * 0.1;
                            const adjustedMin = Math.max(0, minWeight - padding);
                            const adjustedMax = maxWeight + padding;
                            const adjustedRange = adjustedMax - adjustedMin;
                            
                            // Calculate position from top (0 = top, 160 = bottom)
                            const normalizedPosition = (adjustedMax - entry.weight) / adjustedRange;
                            const topPosition = normalizedPosition * 160;
                            
                            // Calculate horizontal position
                            const chartWidth = 160; // Reduced width for closer spacing
                            const leftPosition = array.length > 1 ? (index / (array.length - 1)) * chartWidth + 50 : chartWidth / 2;
                            
                            return (
                              <View key={entry.id || index} style={[styles.dataPointContainer, { left: leftPosition }]}>
                                {/* Connecting line to next point */}
                                {index < array.length - 1 && (
                                  (() => {
                                    try {
                                      const nextEntry = array[index + 1];
                                      if (!nextEntry || isNaN(nextEntry.weight)) return null;
                                      
                                      const nextNormalizedPosition = (adjustedMax - nextEntry.weight) / adjustedRange;
                                      const nextTopPosition = nextNormalizedPosition * 160;
                                      const deltaY = nextTopPosition - topPosition;
                                      const deltaX = array.length > 1 ? chartWidth / (array.length - 1) : 50;
                                      const lineLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                                      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
                                      
                                      return (
                                        <View style={[
                                          styles.connectingLine,
                                          {
                                            position: 'absolute',
                                            top: Math.max(0, topPosition - 1), // Center on dot
                                            left: 5, // Start from center of current dot
                                            width: lineLength,
                                            height: 2,
                                            backgroundColor: '#007AFF',
                                            transformOrigin: 'left center',
                                            transform: [{ rotate: `${angle}deg` }]
                                          }
                                        ]} />
                                      );
                                    } catch (error) {
                                      console.error('❌ Progress tab: Error rendering connecting line:', error);
                                      return null;
                                    }
                                  })()
                                )}
                                
                                {/* Data point */}
                                <View style={[
                                  styles.dataPoint,
                                  { 
                                    position: 'absolute',
                                    top: Math.max(0, topPosition - 5), // Ensure it doesn't go above chart
                                    left: 0, // Center the dot on the position
                                    alignItems: 'center'
                                  }
                                ]}>
                                  <View style={styles.dataPointDot} />
                                </View>
                              </View>
                            );
                          }).filter(Boolean);
                        } catch (error) {
                          console.error('❌ Progress tab: Error rendering data points:', error);
                          return [];
                        }
                      })()}
                    </View>
                  </View>
                </View>
                
                {/* X-axis labels */}
                <View style={styles.xAxisLabels}>
                  {(() => {
                    try {
                      return weightHistory.slice(-8).map((entry, index, array) => {
                        if (!entry || !entry.date) return null;
                        
                        const date = new Date(entry.date);
                        if (isNaN(date.getTime())) return null;
                        
                        const chartWidth = 160;
                        const leftPosition = array.length > 1 ? (index / (array.length - 1)) * chartWidth + 50 : chartWidth / 2;
                        
                        return (
                          <View key={index} style={[styles.xAxisLabelContainer, { position: 'absolute', left: leftPosition - 20 }]}>
                            <ThemedText style={styles.xAxisLabel}>
                              {`${date.getMonth() + 1}/${date.getDate()}`}
                            </ThemedText>
                            <ThemedText style={styles.xAxisWeight}>
                              {entry.weight} {entry.unit || 'lbs'}
                            </ThemedText>
                          </View>
                        );
                      }).filter(Boolean);
                    } catch (error) {
                      console.error('❌ Progress tab: Error rendering X-axis labels:', error);
                      return [];
                    }
                  })()}
                </View>
              </View>
              
              <View style={styles.chartStats}>
                <View style={styles.chartStat}>
                  <ThemedText style={styles.chartStatLabel}>Current</ThemedText>
                  <ThemedText style={styles.chartStatValue}>
                    {weightHistory.length > 0 && weightHistory[weightHistory.length - 1] 
                      ? `${weightHistory[weightHistory.length - 1].weight} ${weightHistory[weightHistory.length - 1].unit || 'lbs'}`
                      : 'N/A'
                    }
                  </ThemedText>
                </View>
                <View style={styles.chartStat}>
                  <ThemedText style={styles.chartStatLabel}>Change</ThemedText>
                  <ThemedText style={[
                    styles.chartStatValue,
                    {
                      color: weightHistory.length > 1 && weightHistory[0] && weightHistory[weightHistory.length - 1]
                        ? (weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight) > 0 
                          ? '#ff4444' 
                          : '#28a745'
                        : '#666'
                    }
                  ]}>
                    {weightHistory.length > 1 && weightHistory[0] && weightHistory[weightHistory.length - 1]
                      ? `${(weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight) > 0 ? '+' : ''}${(weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight).toFixed(1)} ${weightHistory[weightHistory.length - 1].unit || 'lbs'}`
                      : 'N/A'
                    }
                  </ThemedText>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.chartPlaceholder}>
              <FontAwesome6 name="chart-line" size={48} color="#007AFF" style={styles.chartPlaceholderIcon} />
              <ThemedText style={styles.chartText}>
                No Weight Data Available
              </ThemedText>
              <ThemedText style={styles.chartSubtext}>
                Weight progress will appear here when you update your profile weight
              </ThemedText>
            </View>
          )}
        </View>

        {/* Strength Progress Chart Placeholder */}
        <View style={styles.chartPlaceholder}>
          <ThemedText style={styles.chartText}>
            Strength Progress Chart
          </ThemedText>
          <ThemedText style={styles.chartSubtext}>
            Track your lifting progress over time
          </ThemedText>
        </View>
      </ThemedView>

      <View style={styles.bottomPadding} />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 5,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  section: {
    margin: 15,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  journeyStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  realDataCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FEFEFE',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  realDataValue: {
    color: '#DC2626',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 5,
  },
  realDataIndicator: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
  },
  placeholderIndicator: {
    fontSize: 10,
    color: '#999',
    fontWeight: '400',
    marginTop: 4,
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  statDescription: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 5,
  },
  goalItem: {
    marginBottom: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '500',
  },
  goalProgress: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  goalDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
  chartPlaceholder: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  // Simple Chart Styles
  simpleChart: {
    width: '100%',
    marginBottom: 20,
  },
  chartBackground: {
    flexDirection: 'row',
    height: 180,
    marginBottom: 10,
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 10,
    width: 40,
    height: 160,
    marginTop: 10,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#666',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    height: 160,
    marginTop: 10,
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#e3e3e3',
    width: '100%',
  },
  dataPoints: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 10,
  },
  dataPointContainer: {
    position: 'absolute',
    width: 10,
    height: '100%',
  },
  connectingLine: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 2,
    backgroundColor: '#007AFF',
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    left: 15,
    alignItems: 'center',
  },
  dataPointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
  },
  dataPointLabel: {
    fontSize: 8,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  xAxisLabels: {
    position: 'relative',
    height: 20,
    marginLeft: 40,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    width: 40,
  },
  xAxisLabelContainer: {
    alignItems: 'center',
    width: 40,
  },
  xAxisWeight: {
    fontSize: 9,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  chartStat: {
    alignItems: 'center',
  },
  chartStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  chartStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chartPlaceholderIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  chartText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  chartSubtext: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 50,
  },
  // Goal Management Styles
  goalsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  addGoalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  noGoalsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noGoalsIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  noGoalsText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteGoalButton: {
    padding: 6,
  },
  completedGoalName: {
    color: '#28a745',
  },
  completedGoalProgress: {
    color: '#28a745',
  },
  completedProgressFill: {
    backgroundColor: '#28a745',
  },
  goalDetails: {
    marginTop: 8,
  },
  goalCompletedText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
    marginTop: 4,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  goalTypeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  goalTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  selectedGoalType: {
    backgroundColor: '#007AFF',
  },
  goalTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  selectedGoalTypeText: {
    color: '#fff',
  },
  targetValueContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  targetValueInput: {
    flex: 1,
  },
  unitSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  selectedUnit: {
    backgroundColor: '#007AFF',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  selectedUnitText: {
    color: '#fff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Journey overview styles
  journeyOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  // Enhanced journey hero cards
  journeyHeroCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  journeyHeroCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  streakCard: {
    backgroundColor: '#FFF8F8',
  },
  journeyHeroIcon: {
    marginBottom: 12,
  },
  journeyHeroTitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  journeyHeroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  streakValue: {
    fontSize: 24,
    color: '#FF6B6B',
  },
  journeyHeroSubtext: {
    fontSize: 11,
    opacity: 0.6,
    textAlign: 'center',
  },
  // Comprehensive stats grid
  comprehensiveStatsGrid: {
    marginBottom: 20,
  },
  statIcon: {
    marginBottom: 8,
  },
  // Progress insights
  progressInsights: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#007AFF',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  insightText: {
    fontSize: 13,
    opacity: 0.8,
    flex: 1,
  },
  journeyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  journeyIcon: {
    marginBottom: 8,
  },
  journeyTitle: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
    marginBottom: 4,
    textAlign: 'center',
  },
  journeyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  journeySubtext: {
    fontSize: 10,
    opacity: 0.6,
    textAlign: 'center',
  },
  journeyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  journeyStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  journeyStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  journeyStatLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
    textAlign: 'center',
  },
  // Achievement styles
  achievementsScroll: {
    flexDirection: 'row',
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  achievementIcon: {
    marginBottom: 6,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
  },
});
