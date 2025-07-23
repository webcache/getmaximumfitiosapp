import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useChat } from '@ai-sdk/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { fetch as expoFetch } from 'expo/fetch';
import { addDoc, collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { convertExercisesToFormat, convertFirestoreDate, Exercise, formatDate, generateAPIUrl, getTodayLocalString } from '../../utils';
// Local fallback type definitions for AI workout plan conversion
type ExerciseSet = { id: string; reps: string; weight?: string; notes?: string };
type WorkoutExercise = { id: string; name: string; sets: ExerciseSet[]; notes?: string; isMaxLift?: boolean; baseExercise?: any };

interface Workout {
  id: string;
  title: string;
  date: Date;
  exercises: Exercise[];
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [userName, setUserName] = useState<string>('');
  const [lastWorkout, setLastWorkout] = useState<{
    exercises: string;
    date: Date;
  } | null>(null);
  const [nextWorkout, setNextWorkout] = useState<Workout | null>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(true);
  const [loadingNextWorkout, setLoadingNextWorkout] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // AI Chat functionality
  const { 
    messages, 
    input, 
    error, 
    status,
    stop,
    setInput,
    append 
  } = useChat({
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    api: generateAPIUrl('/api/ai/chat'),
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('Chat message finished:', message);
    },
    onResponse: (response) => {
      console.log('Chat response received:', response.status, response.headers);
    },
    initialMessages: [
      {
        id: 'system',
        role: 'system',
        content: `You are a fitness AI assistant for the GetMaximumFit app. Help users with workout advice, exercise form, nutrition tips, and motivation. Keep responses concise and actionable for mobile users. User's name is ${userName || 'there'}.`,
      },
    ],
  });

  // Function to send message
  const sendMessage = () => {
    if (input.trim() && status === 'ready') {
      append({
        role: 'user',
        content: input,
      });
      setInput(''); // Clear input after sending
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 1) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Fetch last workout from Firestore
  const fetchLastWorkout = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingWorkout(true);
      
      // Get today's date as a local string for consistent comparison
      const todayString = getTodayLocalString();
      
      // Query the workouts subcollection for workouts before today, ordered by date (newest first)
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      const workoutsQuery = query(
        workoutsRef,
        where('date', '<', todayString),
        orderBy('date', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(workoutsQuery);
      
      if (!querySnapshot.empty) {
        const workoutDoc = querySnapshot.docs[0];
        const workoutData = workoutDoc.data();
        
        // Handle date conversion using proper UTC/local conversion
        const workoutDate = convertFirestoreDate(workoutData.date);
        
        // Handle exercises data properly
        let exercisesDisplay = '';
        if (workoutData.exercises) {
          if (typeof workoutData.exercises === 'string') {
            exercisesDisplay = workoutData.exercises;
          } else if (Array.isArray(workoutData.exercises)) {
            // If exercises is an array of objects like [{sets, exercise}, ...]
            exercisesDisplay = workoutData.exercises
              .map((ex: any) => {
                if (typeof ex === 'string') {
                  return ex;
                } else if (ex.exercise) {
                  return ex.exercise;
                } else if (ex.name) {
                  return ex.name;
                } else {
                  return JSON.stringify(ex);
                }
              })
              .join(', ');
          } else {
            exercisesDisplay = JSON.stringify(workoutData.exercises);
          }
        }
        
        setLastWorkout({
          exercises: exercisesDisplay,
          date: workoutDate,
        });
      } else {
        // No workouts found
        setLastWorkout(null);
      }
    } catch (error) {
      console.error('Error fetching last workout:', error);
      setLastWorkout(null);
    } finally {
      setLoadingWorkout(false);
    }
  }, [user]);

  // Fetch next upcoming workout from Firestore
  const fetchNextWorkout = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingNextWorkout(true);
      
      // Get today's date as a local string for consistent comparison
      const todayString = getTodayLocalString();
      
      // First, try to find workouts for today
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      let workoutsQuery = query(
        workoutsRef,
        where('date', '==', todayString),
        orderBy('date', 'asc'),
        limit(1)
      );
      
      let querySnapshot = await getDocs(workoutsQuery);
      
      // If no workouts for today, look for future workouts
      if (querySnapshot.empty) {
        workoutsQuery = query(
          workoutsRef,
          where('date', '>', todayString),
          orderBy('date', 'asc'),
          limit(1)
        );
        querySnapshot = await getDocs(workoutsQuery);
      }
      
      if (!querySnapshot.empty) {
        const workoutDoc = querySnapshot.docs[0];
        const workoutData = workoutDoc.data();
        
        // Handle date conversion using proper UTC/local conversion
        const workoutDate = convertFirestoreDate(workoutData.date);
        
        // Handle exercises conversion to proper format
        const exercises = convertExercisesToFormat(workoutData.exercises, workoutDoc.id);
        
        setNextWorkout({
          id: workoutDoc.id,
          title: workoutData.title || 'Untitled Workout',
          date: workoutDate,
          exercises,
        });
      } else {
        setNextWorkout(null);
      }
    } catch (error) {
      console.error('Error fetching next workout:', error);
      setNextWorkout(null);
    } finally {
      setLoadingNextWorkout(false);
    }
  }, [user]);

  // Handle authentication state changes
  useEffect(() => {
    if (!user) {
      // User is no longer logged in, redirect to login
      console.log('User logged out, redirecting to login...');
      router.replace('/login/loginScreen');
    } else {
      // User is logged in, fetch their workout data
      fetchLastWorkout();
      fetchNextWorkout();
    }
  }, [user, router, fetchLastWorkout, fetchNextWorkout]);

  useEffect(() => {
    if (userProfile) {
      // Create a personalized name from firstName and lastName, with fallbacks
      let name = '';
      if (userProfile.firstName && userProfile.lastName) {
        name = `${userProfile.firstName} ${userProfile.lastName}`;
      } else if (userProfile.firstName) {
        name = userProfile.firstName;
      } else if (userProfile.lastName) {
        name = userProfile.lastName;
      } else {
        name = userProfile.displayName || userProfile.email || 'Fitness Enthusiast';
      }
      setUserName(name);
    } else if (user) {
      setUserName(user.displayName || user.email || 'Fitness Enthusiast');
    }
  }, [user, userProfile]);

  // Helper: Parse AI JSON workout plan and convert to WorkoutExercise[] template

  interface ParsedAIPlan {
    title?: string;
    exercises: {
      name: string;
      sets?: number | { reps?: string | number; weight?: string | number; notes?: string }[];
      reps?: string | number;
      weight?: string | number;
      notes?: string;
    }[];
  }

  // Convert AI plan exercises to WorkoutExercise[]
  const convertAIExercisesToWorkoutExercises = (aiExercises: ParsedAIPlan['exercises']): WorkoutExercise[] => {
    return aiExercises.map((ex, idx) => {
      let sets: ExerciseSet[] = [];
      if (Array.isArray(ex.sets)) {
        sets = ex.sets.map((set, i) => ({
          id: `${Date.now()}-${idx}-${i}`,
          reps: set.reps?.toString() || ex.reps?.toString() || '10',
          weight: set.weight?.toString() || ex.weight?.toString() || '',
          notes: set.notes || ex.notes || '',
        }));
      } else {
        const numSets = typeof ex.sets === 'number' ? ex.sets : 3;
        for (let i = 0; i < numSets; i++) {
          sets.push({
            id: `${Date.now()}-${idx}-${i}`,
            reps: ex.reps?.toString() || '10',
            weight: ex.weight?.toString() || '',
            notes: ex.notes || '',
          });
        }
      }
      return {
        id: `${Date.now()}-${idx}`,
        name: ex.name,
        sets,
        notes: ex.notes || '',
      };
    });
  };

  const parseWorkoutPlan = (jsonString: string): { title: string; exercises: WorkoutExercise[] } | null => {
    try {
      const plan: ParsedAIPlan = JSON.parse(jsonString);
      if (!plan.exercises || !Array.isArray(plan.exercises)) return null;
      const exercises = convertAIExercisesToWorkoutExercises(plan.exercises);
      return { title: plan.title || 'AI Generated Workout', exercises };
    } catch {
      return null;
    }
  };

  // Create workout in Firestore from parsed plan (WorkoutExercise[])
  // Also save as a favorite template with 'AI' in the title
  const createWorkoutFromPlan = async (plan: { title: string; exercises: WorkoutExercise[] }) => {
    if (!user || !plan) return;
    const workoutData = {
      title: plan.title || 'AI Generated Workout',
      date: getTodayLocalString(),
      exercises: plan.exercises,
    };
    try {
      // Save workout to workouts collection
      await addDoc(collection(db, 'profiles', user.uid, 'workouts'), workoutData);

      // Save as favorite template with 'AI' prefix
      const favoriteTitle = plan.title?.startsWith('AI') ? plan.title : `AI ${plan.title || 'Generated Workout'}`;
      const favoriteTemplate = {
        name: favoriteTitle,
        defaultSets: plan.exercises.map(ex => ex.sets), // array of sets arrays
        notes: '',
        createdAt: new Date(),
        exercises: plan.exercises,
      };
      // Save as a single favorite workout template (not individual exercises)
      await addDoc(collection(db, 'profiles', user.uid, 'favoriteWorkouts'), favoriteTemplate);

      router.push('/(tabs)/workouts');
    } catch (err: any) {
      alert('Failed to create workout: ' + (err?.message || String(err)));
    }
  };

  // Button handler: Send structured prompt to AI, then create workout
  const handleCreateWorkout = async () => {
    // Find last assistant message
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistantMsg) return;
    // Prompt AI for structured JSON matching WorkoutExercise[] template
    const structuredPrompt = `Convert the following workout plan to JSON format for a mobile fitness app. The JSON should have a 'title' and an 'exercises' array. Each exercise should have: name (string), sets (number or array of sets), and each set should have reps (string or number), weight (string or number), and optional notes. Example: {"title": "Push Day", "exercises": [{"name": "Bench Press", "sets": [{"reps": "10", "weight": "135"}, {"reps": "8", "weight": "155"}]}]}.\n${lastAssistantMsg.content}`;
    append({ role: 'user', content: structuredPrompt });
    // Wait for next assistant message
    let tries = 0;
    let newMsg;
    while (tries < 20) {
      await new Promise(res => setTimeout(res, 1000));
      newMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.content !== lastAssistantMsg.content);
      if (newMsg) break;
      tries++;
    }
    if (newMsg) {
      const plan = parseWorkoutPlan(newMsg.content);
      if (plan) {
        // Show a summary to the user (not JSON)
        alert(`Workout Plan Created!\nTitle: ${plan.title}\nExercises: ${plan.exercises.map(e => e.name).join(', ')}`);
        // Save as workout template in Firestore (behind the scenes)
        if (user) {
          // Save each exercise as a favoriteExercises document, matching the pattern
          for (const ex of plan.exercises) {
            const favoriteExercise = {
              name: ex.name,
              defaultSets: ex.sets,
              notes: ex.notes || '',
              createdAt: new Date(),
            };
            try {
              await addDoc(collection(db, 'profiles', user.uid, 'favoriteExercises'), favoriteExercise);
            } catch (err: any) {
              console.error('Failed to save favorite exercise:', err);
            }
          }
          // Optionally, also save a summary template in favoriteWorkouts for multi-exercise plans
          const favoriteTitle = plan.title?.startsWith('AI') ? plan.title : `AI ${plan.title || 'Generated Workout'}`;
          const favoriteTemplate = {
            name: favoriteTitle,
            exercises: plan.exercises,
            notes: '',
            createdAt: new Date(),
          };
          try {
            await addDoc(collection(db, 'profiles', user.uid, 'favoriteWorkouts'), favoriteTemplate);
          } catch (err: any) {
            console.error('Failed to save workout template:', err);
          }
        }
      } else {
        alert('Sorry, the AI could not generate a valid workout plan. Please try rephrasing your request.');
      }
    } else {
      alert('No new AI response received.');
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/dashboard-image.png')}
          style={styles.bannerLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome, {userName}!</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Your Fitness Dashboard</ThemedText>
        <ThemedText>
          Track your workouts, set goals, and achieve your maximum fitness potential.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">
          {(() => {
            if (!nextWorkout) return "Today's Plan";
            
            const today = new Date();
            const workoutDate = new Date(nextWorkout.date);
            today.setHours(0, 0, 0, 0);
            workoutDate.setHours(0, 0, 0, 0);
            
            if (workoutDate.getTime() === today.getTime()) {
              return "Today's Plan";
            } else {
              return "Upcoming Workout";
            }
          })()}
        </ThemedText>
        <ThemedView style={styles.nextWorkoutContainer}>
          {loadingNextWorkout ? (
            <ThemedText style={styles.exercisesText}>Loading upcoming workouts...</ThemedText>
          ) : nextWorkout ? (
            <TouchableOpacity
              style={styles.nextWorkoutCard}
              onPress={() => router.push('/(tabs)/workouts')}
            >
              <ThemedText style={styles.nextWorkoutTitle}>
                {nextWorkout.title}
              </ThemedText>
              <ThemedText style={styles.nextWorkoutDate}>
                {(() => {
                  const today = new Date();
                  const workoutDate = new Date(nextWorkout.date);
                  today.setHours(0, 0, 0, 0);
                  workoutDate.setHours(0, 0, 0, 0);
                  
                  if (workoutDate.getTime() === today.getTime()) {
                    return 'Today';
                  } else if (workoutDate.getTime() === today.getTime() + 86400000) {
                    return 'Tomorrow';
                  } else {
                    return formatDate(nextWorkout.date);
                  }
                })()}
              </ThemedText>
              {nextWorkout.exercises.length > 0 && (
                <ThemedText style={styles.nextWorkoutExercises}>
                  {nextWorkout.exercises.slice(0, 3).map(ex => ex.name).join(', ')}
                  {nextWorkout.exercises.length > 3 && ` +${nextWorkout.exercises.length - 3} more`}
                </ThemedText>
              )}
              <ThemedText style={styles.tapToEdit}>
                Tap to view workouts →
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.noWorkoutCard}
              onPress={() => router.push('/(tabs)/workouts')}
            >
              <ThemedText style={styles.exercisesText}>
                No upcoming workouts scheduled
              </ThemedText>
              <ThemedText style={styles.tapToEdit}>
                Tap to create your first workout →
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Last Workout</ThemedText>
        <ThemedView style={styles.lastWorkoutContainer}>
          {loadingWorkout ? (
            <ThemedText style={styles.exercisesText}>Loading workout data...</ThemedText>
          ) : lastWorkout ? (
            <>
              <ThemedText style={styles.exercisesText}>
                {lastWorkout.exercises}
              </ThemedText>
              <ThemedText style={styles.workoutDate}>
                {formatDate(lastWorkout.date)}
              </ThemedText>
            </>
          ) : (
            <ThemedText style={styles.exercisesText}>
              No workouts recorded yet. Start your first workout!
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>


      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">AI Fitness Assistant</ThemedText>
        {error && (
          <ThemedView style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>
              Error: {error.message}
            </ThemedText>
          </ThemedView>
        )}
        <ThemedView style={styles.chatContainer}>
          {messages.filter(m => m.role !== 'system').length > 0 ? (
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesScrollContainer} 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.scrollContentContainer}
            >
              <View style={styles.messagesContainer}>
                {messages.filter(m => m.role !== 'system').map((message, idx, arr) => (
                  <View 
                    key={message.id} 
                    style={[
                      styles.messageBox,
                      message.role === 'user' ? styles.userMessage : styles.assistantMessage
                    ]}
                  >
                    <ThemedText style={[
                      styles.messageText,
                      message.role === 'user' ? styles.userMessageText : styles.assistantMessageText
                    ]}>
                      {message.content}
                    </ThemedText>
                  </View>
                ))}
                {(status === 'submitted' || status === 'streaming') && (
                  <View style={styles.statusContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <ThemedText style={styles.statusText}>
                      {status === 'submitted' ? 'Sending...' : 'AI is responding...'}
                    </ThemedText>
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyMessagesContainer}>
              <ThemedText style={styles.emptyMessagesText}>
                Ask me anything about fitness, workouts, or nutrition!
              </ThemedText>
            </View>
          )}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.chatInput}
              value={input}
              onChangeText={setInput}
              placeholder="Type in your prompt here."
              placeholderTextColor="#666666"
              multiline
              editable={status === 'ready'}
              onSubmitEditing={sendMessage}
            />
            <View style={styles.buttonContainer}>
              {(status === 'submitted' || status === 'streaming') ? (
                <TouchableOpacity 
                  style={styles.stopButton}
                  onPress={stop}
                >
                  <ThemedText style={styles.stopButtonText}>Stop</ThemedText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.sendButton, (!input.trim() || status !== 'ready') && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!input.trim() || status !== 'ready'}
                >
                  <ThemedText style={styles.sendButtonText}>Send</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ThemedView>
      </ThemedView>
        <View style={styles.emptyContainer} />
      </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  bannerLogo: {
    height:250,
    width: '100%',
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  emptyContainer: {
    height: 100, // Adjust the height as needed
  },
  lastWorkoutContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  exercisesText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  workoutDate: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  chatContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 0,
    marginTop: 8,
    height: 400, // Fixed height for better scrolling
    flexDirection: 'column',
  },
  messagesScrollContainer: {
    flex: 1,
    marginBottom: 16,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messagesContainer: {
    paddingBottom: 8,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  messageBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    maxWidth: '100%', // Increased from 85% to show more content
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // More opaque for better readability
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap', // Ensure text wraps properly
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#333333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(99, 99, 99, 0.8)',
    borderRadius: 8,
    padding: 12,
    color: '#333333',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(0, 122, 255, 0.5)',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderColor: 'rgba(255, 0, 0, 0.3)',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  debugText: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  nextWorkoutContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  nextWorkoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 16,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    borderWidth: 1,
  },
  noWorkoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    borderColor: 'rgba(99, 99, 99, 0.3)',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  nextWorkoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333333',
  },
  nextWorkoutDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 8,
  },
  nextWorkoutExercises: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 18,
  },
  tapToEdit: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'right',
  },
});
