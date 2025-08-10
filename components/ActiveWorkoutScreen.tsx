import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useAchievementShare } from '../hooks/useAchievementShare';
import { useColorScheme } from '../hooks/useColorScheme';
import { useFeatureGating } from '../hooks/useFeatureGating';
import { usePreferences } from '../hooks/usePreferences';
import AchievementShareModal from './AchievementShareModal';
import { ThemedText } from './ThemedText';
import { ExerciseSet, Workout, WorkoutExercise } from './WorkoutModal';

interface ActiveWorkoutScreenProps {
  workout: Workout;
  onComplete: (completedWorkout: Workout) => void;
  onExit: () => void;
}

interface WorkoutStep {
  id: string;
  exerciseIndex: number;
  setIndex: number;
  exercise: WorkoutExercise;
  set: ExerciseSet;
  type: 'exercise' | 'rest';
  isCompleted: boolean;
}

export default function ActiveWorkoutScreen({ 
  workout, 
  onComplete, 
  onExit 
}: ActiveWorkoutScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { units } = usePreferences();
  
  // Feature gating hook
  const { canUseFeature, incrementUsage } = useFeatureGating();
  
  // Achievement sharing hook
  const achievementShare = useAchievementShare();
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Workout progress state
  const [workoutSteps, setWorkoutSteps] = useState<WorkoutStep[]>([]);
  const [/* currentStepIndex */, /* setCurrentStepIndex */] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  
  // Rest timer state
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Initialize workout steps
  useEffect(() => {
    const steps: WorkoutStep[] = [];
    
    workout.exercises.forEach((exercise, exerciseIndex) => {
      exercise.sets.forEach((set, setIndex) => {
        steps.push({
          id: `${exercise.id}-${set.id}`,
          exerciseIndex,
          setIndex,
          exercise,
          set,
          type: 'exercise',
          isCompleted: false,
        });
      });
    });
    
    setWorkoutSteps(steps);
  }, [workout]);

  // Main timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  // Rest timer effect
  useEffect(() => {
    if (isResting && restTime > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTime(prev => {
          if (prev <= 1) {
            setIsResting(false);
            Vibration.vibrate([100, 50, 100]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    }

    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    };
  }, [isResting, restTime]);

  // Update progress animation
  useEffect(() => {
    const progress = completedSteps.size / workoutSteps.length;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [completedSteps.size, workoutSteps.length, progressAnim]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const completeStep = (stepId: string) => {
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(stepId);
    setCompletedSteps(newCompletedSteps);

    // Animate completion
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Start rest timer if not the last set
    const currentStep = workoutSteps.find(step => step.id === stepId);
    if (currentStep) {
      const isLastSetOfExercise = 
        currentStep.setIndex === currentStep.exercise.sets.length - 1;
      
      if (!isLastSetOfExercise) {
        startRestTimer(90); // Default 90 seconds rest
      }
    }

    // Check if workout is complete
    if (newCompletedSteps.size === workoutSteps.length) {
      completeWorkout();
    }
  };

  const uncompleteStep = (stepId: string) => {
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.delete(stepId);
    setCompletedSteps(newCompletedSteps);
  };

  const startRestTimer = (seconds: number) => {
    setRestTime(seconds);
    setIsResting(true);
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTime(0);
  };

  const completeWorkout = async () => {
    setIsTimerRunning(false);
    
    // Check if this is a custom workout and if user can complete it
    // A workout is considered custom if:
    // 1. It has exercises without baseExercise (user-created exercises)
    // 2. It's from the "My Exercises" collection
    const isCustomWorkout = workout.exercises.some(exercise => 
      !exercise.baseExercise || 
      exercise.name.toLowerCase().includes('custom') ||
      (exercise.baseExercise && exercise.baseExercise.category === 'custom')
    );
    
    if (isCustomWorkout && !canUseFeature('maxCustomWorkouts')) {
      Alert.alert(
        'Upgrade Required',
        'You\'ve reached your limit for custom workouts this month. Upgrade to Pro for unlimited custom workouts!',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => {
              // TODO: Navigate to upgrade screen
              console.log('Navigate to upgrade screen');
            }
          }
        ]
      );
      setIsTimerRunning(true); // Resume timer if they cancel
      return;
    }
    
    const completedWorkout: Workout = {
      ...workout,
      isCompleted: true,
      completedAt: new Date(),
      duration: Math.floor(elapsedTime / 60), // Convert to minutes
    };

    // If this is a custom workout, increment usage
    if (isCustomWorkout) {
      await incrementUsage('maxCustomWorkouts');
    }

    // Check for personal records in the workout
    const personalRecords = completedWorkout.exercises.filter(exercise => exercise.isMaxLift);
    
    const workoutDurationMinutes = Math.floor(elapsedTime / 60);
    const workoutDurationText = workoutDurationMinutes > 0 ? `${workoutDurationMinutes} min` : 'Quick session';

    Alert.alert(
      'Workout Complete! 🎉',
      `Great job! You completed your workout in ${formatTime(elapsedTime)}.`,
      [
        {
          text: 'Just Finish',
          style: 'cancel',
          onPress: () => onComplete(completedWorkout),
        },
        {
          text: 'Share Achievement',
          onPress: () => {
            onComplete(completedWorkout);
            
            // Check if user achieved any personal records
            if (personalRecords.length > 0) {
              const firstPR = personalRecords[0];
              const maxSet = firstPR.sets.reduce((max, set) => {
                const weight = parseFloat(set.weight || '0');
                return weight > parseFloat(max.weight || '0') ? set : max;
              }, firstPR.sets[0]);
              
              const weight = parseFloat(maxSet.weight || '0');
              const reps = parseInt(maxSet.reps || '0');
              
              // Show PR achievement
              achievementShare.triggerPersonalRecord(
                firstPR.name,
                weight,
                reps
              );
            } else {
              // Show general workout completion achievement
              achievementShare.triggerWorkoutComplete(
                completedWorkout.title,
                workoutDurationText,
                completedWorkout.exercises.length
              );
            }
          },
        },
      ]
    );
  };

  const exitWorkout = () => {
    Alert.alert(
      'Exit Workout?',
      'Are you sure you want to exit? Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Exit', 
          style: 'destructive',
          onPress: () => {
            setIsTimerRunning(false);
            onExit();
          }
        },
      ]
    );
  };

  const getTotalProgress = () => {
    return (completedSteps.size / workoutSteps.length) * 100;
  };

  const safeColors = {
    text: colors?.text || '#000000',
    background: colors?.background || '#FFFFFF',
    tint: colors?.tint || '#007AFF',
    card: colors?.background || '#FFFFFF',
  };

  // const screenWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: safeColors.text + '20' }]}>
        <TouchableOpacity onPress={exitWorkout} style={styles.exitButton}>
          <FontAwesome5 name="times" size={24} color={safeColors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <ThemedText type="title" style={styles.workoutTitle}>
            {workout.title}
          </ThemedText>
          <ThemedText style={[styles.progressText, { color: safeColors.text + '70' }]}>
            {completedSteps.size} of {workoutSteps.length} completed
          </ThemedText>
        </View>
        
        <TouchableOpacity onPress={toggleTimer} style={styles.timerButton}>
          <FontAwesome5 
            name={isTimerRunning ? "pause" : "play"} 
            size={20} 
            color={safeColors.tint} 
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: safeColors.text + '10' }]}>
        <Animated.View 
          style={[
            styles.progressBar, 
            { 
              backgroundColor: safeColors.tint,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }
          ]} 
        />
      </View>

      {/* Timer Display */}
      <View style={[styles.timerContainer, { backgroundColor: safeColors.card }]}>
        <ThemedText type="title" style={[styles.timer, { color: safeColors.tint }]}>
          {formatTime(elapsedTime)}
        </ThemedText>
        {isResting && (
          <View style={styles.restContainer}>
            <ThemedText style={[styles.restLabel, { color: safeColors.text + '70' }]}>
              Rest Time
            </ThemedText>
            <ThemedText type="subtitle" style={[styles.restTimer, { color: '#FF6B6B' }]}>
              {formatTime(restTime)}
            </ThemedText>
            <TouchableOpacity onPress={skipRest} style={styles.skipRestButton}>
              <ThemedText style={[styles.skipRestText, { color: safeColors.tint }]}>
                Skip Rest
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Exercise List */}
      <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
        {workout.exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={[styles.exerciseContainer, { backgroundColor: safeColors.card }]}>
            <ThemedText type="subtitle" style={styles.exerciseName}>
              {exercise.name}
            </ThemedText>
            
            {exercise.sets.map((set, setIndex) => {
              const stepId = `${exercise.id}-${set.id}`;
              const isCompleted = completedSteps.has(stepId);
              
              return (
                <Animated.View
                  key={set.id}
                  style={[
                    styles.setContainer,
                    { 
                      backgroundColor: isCompleted 
                        ? safeColors.tint + '15' 
                        : safeColors.background,
                      borderColor: isCompleted 
                        ? safeColors.tint 
                        : safeColors.text + '20',
                      transform: [{ scale: scaleAnim }],
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={styles.setContent}
                    onPress={() => isCompleted ? uncompleteStep(stepId) : completeStep(stepId)}
                  >
                    <View style={styles.setLeft}>
                      <View style={[
                        styles.checkbox,
                        {
                          backgroundColor: isCompleted ? safeColors.tint : 'transparent',
                          borderColor: safeColors.tint,
                        }
                      ]}>
                        {isCompleted && (
                          <FontAwesome5 name="check" size={12} color="white" />
                        )}
                      </View>
                      
                      <View style={styles.setInfo}>
                        <ThemedText style={styles.setNumber}>
                          Set {setIndex + 1}
                        </ThemedText>
                        <View style={styles.setDetails}>
                          <ThemedText style={[styles.setDetail, { color: safeColors.text + '70' }]}>
                            {set.reps} reps
                          </ThemedText>
                          {set.weight && (
                            <ThemedText style={[styles.setDetail, { color: safeColors.text + '70' }]}>
                              @ {set.weight} {units}
                            </ThemedText>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    {set.notes && (
                      <ThemedText style={[styles.setNotes, { color: safeColors.text + '60' }]}>
                        {set.notes}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Complete Workout Button */}
      {getTotalProgress() === 100 && (
        <View style={styles.completeButtonContainer}>
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: '#4CAF50' }]}
            onPress={completeWorkout}
          >
            <FontAwesome5 name="trophy" size={20} color="white" />
            <ThemedText style={styles.completeButtonText}>
              Complete Workout
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Achievement Share Modal */}
      {achievementShare.isVisible && achievementShare.achievementData && (
        <AchievementShareModal
          visible={achievementShare.isVisible}
          onClose={achievementShare.hideAchievementShare}
          achievementType={achievementShare.achievementType!}
          achievementData={achievementShare.achievementData}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,

  },
  exitButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressText: {
    fontSize: 14,
    marginTop: 2,
  },
  timerButton: {
    padding: 8,
  },
  progressContainer: {
    height: 4,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    height: 60,
    lineHeight: 60,
  },
  restContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  restLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  restTimer: {
    fontSize: 24,
    fontWeight: '600',
  },
  skipRestButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipRestText: {
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  exerciseContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  setContainer: {
    borderWidth: 2,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  setContent: {
    padding: 12,
  },
  setLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  setInfo: {
    flex: 1,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  setDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  setDetail: {
    fontSize: 14,
  },
  setNotes: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  completeButtonContainer: {
    padding: 20,
    paddingBottom: 34, // Extra padding for safe area
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
