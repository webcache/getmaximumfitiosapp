import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../firebase';
import { MaxLift, convertFirestoreDate } from '../../utils';

export default function ProgressScreen() {
  const router = useRouter();
  const { isReady, user } = useAuthGuard();
  
  // Early return if auth not ready
  if (!isReady) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }
  const [loading, setLoading] = useState(true);
  const [maxLifts, setMaxLifts] = useState<MaxLift[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
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

  // Default/fallback max lifts data
  const defaultMaxLifts = [
    { exerciseName: 'Bench Press', weight: '225 lbs' },
    { exerciseName: 'Back Squat', weight: '315 lbs' },
    { exerciseName: 'Deadlift', weight: '405 lbs' },
    { exerciseName: 'Incline Bench', weight: '135 lbs' },
  ];

  // Fetch weight history from Firestore
  const fetchWeightHistory = useCallback(async () => {
    if (!user) return;

    try {
      const weightHistoryRef = collection(db, 'profiles', user.uid, 'weightHistory');
      const weightHistoryQuery = query(weightHistoryRef, orderBy('date', 'asc'));
      const snapshot = await getDocs(weightHistoryQuery);
      
      const weightData: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        weightData.push({
          id: doc.id,
          weight: parseFloat(data.weight),
          date: data.date.toDate ? data.date.toDate() : new Date(data.date),
          unit: data.unit || 'lbs',
        });
      });
      
      setWeightHistory(weightData);
    } catch (error) {
      console.error('Error fetching weight history:', error);
    }
  }, [user]);

  // Fetch goals from Firestore
  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      const goalsRef = collection(db, 'profiles', user.uid, 'goals');
      const goalsQuery = query(goalsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(goalsQuery);
      
      const goalsData: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        goalsData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      
      setGoals(goalsData);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  }, [user]);

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
    if (goal.type === 'lift') {
      const maxLift = getMaxLiftForExercise(goal.exercise);
      if (!maxLift) return 0;
      
      const currentWeight = parseFloat(maxLift.weight.replace(/[^\d.]/g, ''));
      const targetWeight = parseFloat(goal.targetValue.replace(/[^\d.]/g, ''));
      
      if (targetWeight <= 0) return 0;
      return Math.min(Math.round((currentWeight / targetWeight) * 100), 100);
    }
    
    // For other goal types, return 0 for now (can be expanded later)
    return 0;
  };

  // Get current value for goal
  const getCurrentValue = (goal: any) => {
    if (goal.type === 'lift') {
      const maxLift = getMaxLiftForExercise(goal.exercise);
      return maxLift ? maxLift.weight : 'No data';
    }
    return 'N/A';
  };
  const fetchWorkoutStats = useCallback(async () => {
    if (!user) return;

    try {
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      const workoutsQuery = query(workoutsRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(workoutsQuery);
      
      const workouts: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        workouts.push({
          id: doc.id,
          date: convertFirestoreDate(data.date),
          duration: data.duration,
          exercises: data.exercises || [],
        });
      });

      // Calculate statistics
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Workouts this month
      const workoutsThisMonth = workouts.filter(workout => {
        const workoutDate = workout.date;
        return workoutDate.getMonth() === currentMonth && 
               workoutDate.getFullYear() === currentYear;
      }).length;

      // Average sessions per week (last 4 weeks)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const recentWorkouts = workouts.filter(workout => workout.date >= fourWeeksAgo);
      const avgSessionsPerWeek = (recentWorkouts.length / 4);

      // Average workout duration
      const workoutsWithDuration = workouts.filter(workout => workout.duration && workout.duration > 0);
      const avgWorkoutDuration = workoutsWithDuration.length > 0 
        ? Math.round(workoutsWithDuration.reduce((sum, workout) => sum + workout.duration, 0) / workoutsWithDuration.length)
        : 0;

      // Current streak (consecutive weeks with at least 2 workouts)
      let currentStreak = 0;
      const today = new Date();
      let checkDate = new Date(today);
      
      while (true) {
        const weekStart = new Date(checkDate);
        weekStart.setDate(checkDate.getDate() - checkDate.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        
        const workoutsThisWeek = workouts.filter(workout => {
          return workout.date >= weekStart && workout.date <= weekEnd;
        }).length;
        
        if (workoutsThisWeek >= 2) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 7); // Go back one week
        } else {
          break;
        }
        
        // Safety check to avoid infinite loop
        if (currentStreak > 52) break;
      }

      setWorkoutStats({
        workoutsThisMonth,
        avgSessionsPerWeek: Math.round(avgSessionsPerWeek * 10) / 10, // Round to 1 decimal
        avgWorkoutDuration,
        currentStreak,
      });
    } catch (error) {
      console.error('Error fetching workout stats:', error);
    }
  }, [user]);
  const fetchMaxLifts = useCallback(async () => {
    if (!user) return;

    try {
      const maxLiftsRef = collection(db, 'profiles', user.uid, 'maxLifts');
      const maxLiftsQuery = query(maxLiftsRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(maxLiftsQuery);
      
      const maxLiftsData: MaxLift[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        maxLiftsData.push({
          id: doc.id,
          exerciseName: data.exerciseName,
          weight: data.weight,
          reps: data.reps,
          date: data.date.toDate ? data.date.toDate() : new Date(data.date),
          workoutId: data.workoutId,
          notes: data.notes,
        });
      });
      
      setMaxLifts(maxLiftsData);
    } catch (error) {
      console.error('Error fetching max lifts:', error);
    }
  }, [user]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        await Promise.all([fetchMaxLifts(), fetchWorkoutStats(), fetchGoals(), fetchWeightHistory()]);
      }
      setLoading(false);
    };
    
    loadData();
  }, [user, fetchMaxLifts, fetchWorkoutStats, fetchGoals, fetchWeightHistory]);

  // Get max lift for a specific exercise
  const getMaxLiftForExercise = (exerciseName: string) => {
    const exerciseMaxLifts = maxLifts.filter(
      lift => lift.exerciseName.toLowerCase() === exerciseName.toLowerCase()
    );
    
    if (exerciseMaxLifts.length === 0) {
      return null;
    }
    
    // Return the most recent max lift for this exercise
    return exerciseMaxLifts[0];
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
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Progress Tracking
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Monitor your fitness journey and achievements
        </ThemedText>
      </ThemedView>

      {/* Current Max Lifts Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Current Max Lifts
        </ThemedText>
        <View style={styles.statsGrid}>
          {defaultMaxLifts.map((exercise, index) => {
            const maxLift = getMaxLiftForExercise(exercise.exerciseName);
            const displayWeight = maxLift ? maxLift.weight : exercise.weight;
            const isFromFirestore = !!maxLift;
            
            return (
              <View key={index} style={[
                styles.statCard,
                isFromFirestore && styles.realDataCard
              ]}>
                <ThemedText style={[
                  styles.statValue,
                  isFromFirestore && styles.realDataValue
                ]}>
                  {displayWeight}
                </ThemedText>
                <ThemedText style={styles.statLabel}>
                  {exercise.exerciseName}
                </ThemedText>
                {isFromFirestore && (
                  <ThemedText style={styles.realDataIndicator}>
                    ✓ Personal Record
                  </ThemedText>
                )}
              </View>
            );
          })}
        </View>
      </ThemedView>

      {/* Workout Statistics Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Workout Statistics
        </ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{workoutStats.workoutsThisMonth}</ThemedText>
            <ThemedText style={styles.statDescription}>Workouts This Month</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{workoutStats.avgSessionsPerWeek}</ThemedText>
            <ThemedText style={styles.statDescription}>Avg Sessions/Week</ThemedText>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>
              {workoutStats.avgWorkoutDuration > 0 ? `${workoutStats.avgWorkoutDuration} min` : 'N/A'}
            </ThemedText>
            <ThemedText style={styles.statDescription}>Avg Workout Duration</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{workoutStats.currentStreak}</ThemedText>
            <ThemedText style={styles.statDescription}>Week Streak</ThemedText>
          </View>
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
            <FontAwesome5 name="plus" size={16} color="#007AFF" />
            <ThemedText style={styles.addGoalText}>Add Goal</ThemedText>
          </TouchableOpacity>
        </View>
        
        {goals.length === 0 ? (
          <View style={styles.noGoalsContainer}>
            <FontAwesome5 name="bullseye" size={48} color="#007AFF" style={styles.noGoalsIcon} />
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
                        <FontAwesome5 name="trash" size={12} color="#ff4444" />
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
              <FontAwesome5 name="times" size={20} color="#666" />
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
                  <FontAwesome5 name="dumbbell" size={16} color={newGoal.type === 'lift' ? '#fff' : '#007AFF'} />
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
                      const recentWeights = weightHistory.slice(-8);
                      const weights = recentWeights.map(entry => entry.weight);
                      const minWeight = Math.min(...weights);
                      const maxWeight = Math.max(...weights);
                      const range = maxWeight - minWeight || 10;
                      const padding = range * 0.1; // Add 10% padding
                      const adjustedMin = Math.max(0, minWeight - padding);
                      const adjustedMax = maxWeight + padding;
                      const adjustedRange = adjustedMax - adjustedMin;
                      
                      const labels = [];
                      for (let i = 0; i < 5; i++) {
                        const value = adjustedMax - (adjustedRange * i / 4);
                        labels.push(
                          <ThemedText key={i} style={styles.yAxisLabel}>
                            {Math.round(value)}
                          </ThemedText>
                        );
                      }
                      return labels;
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
                      {weightHistory.slice(-8).map((entry, index, array) => {
                        // Calculate positioning based on the same logic as Y-axis labels
                        const weights = array.map(e => e.weight);
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
                          <View key={entry.id} style={[styles.dataPointContainer, { left: leftPosition }]}>
                            {/* Connecting line to next point */}
                            {index < array.length - 1 && (
                              (() => {
                                const nextEntry = array[index + 1];
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
                      })}
                    </View>
                  </View>
                </View>
                
                {/* X-axis labels */}
                <View style={styles.xAxisLabels}>
                  {weightHistory.slice(-8).map((entry, index, array) => {
                    const date = new Date(entry.date);
                    const chartWidth = 160;
                    const leftPosition = array.length > 1 ? (index / (array.length - 1)) * chartWidth + 50 : chartWidth / 2;
                    
                    return (
                      <View key={index} style={[styles.xAxisLabelContainer, { position: 'absolute', left: leftPosition - 20 }]}>
                        <ThemedText style={styles.xAxisLabel}>
                          {`${date.getMonth() + 1}/${date.getDate()}`}
                        </ThemedText>
                        <ThemedText style={styles.xAxisWeight}>
                          {entry.weight} lbs
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </View>
              
              <View style={styles.chartStats}>
                <View style={styles.chartStat}>
                  <ThemedText style={styles.chartStatLabel}>Current</ThemedText>
                  <ThemedText style={styles.chartStatValue}>
                    {weightHistory[weightHistory.length - 1]?.weight} {weightHistory[weightHistory.length - 1]?.unit || 'lbs'}
                  </ThemedText>
                </View>
                <View style={styles.chartStat}>
                  <ThemedText style={styles.chartStatLabel}>Change</ThemedText>
                  <ThemedText style={[
                    styles.chartStatValue,
                    {
                      color: weightHistory.length > 1 
                        ? (weightHistory[weightHistory.length - 1]?.weight - weightHistory[0]?.weight) > 0 
                          ? '#ff4444' 
                          : '#28a745'
                        : '#666'
                    }
                  ]}>
                    {weightHistory.length > 1 
                      ? `${(weightHistory[weightHistory.length - 1]?.weight - weightHistory[0]?.weight) > 0 ? '+' : ''}${(weightHistory[weightHistory.length - 1]?.weight - weightHistory[0]?.weight).toFixed(1)} lbs`
                      : 'N/A'
                    }
                  </ThemedText>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.chartPlaceholder}>
              <FontAwesome5 name="chart-line" size={48} color="#007AFF" style={styles.chartPlaceholderIcon} />
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
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgb(255, 255, 255)',
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
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  realDataCard: {
    borderWidth: 2,
    borderColor: '#DC2626',
    backgroundColor: '#DC2626' + '08',
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
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
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  chartContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
});
