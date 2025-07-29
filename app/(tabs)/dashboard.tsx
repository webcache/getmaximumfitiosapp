import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useChat } from '@ai-sdk/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { fetch as expoFetch } from 'expo/fetch';
import { addDoc, collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebase';
import { convertExercisesToFormat, convertFirestoreDate, Exercise, formatDate, generateAPIUrl, getTodayLocalString } from '../../utils';
import ThemedText from '../components/ThemedText';
import ThemedView from '../components/ThemedView';
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
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL LOGIC
  const router = useRouter();
  const { isReady, user, userProfile } = useAuthGuard();
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
    initialMessages: [
      {
        id: 'system',
        role: 'system',
        content: `You are a helpful fitness assistant. You can help with workout planning, exercise form, nutrition advice, and motivation. Keep responses concise and actionable.`
      }
    ]
  });

  // ALL useEffect and useCallback hooks
  useEffect(() => {
    const loadLastWorkout = async () => {
      if (!user?.uid) return;
      
      try {
        setLoadingWorkout(true);
        const workoutQuery = query(
          collection(db, 'profiles', user.uid, 'workouts'),
          orderBy('date', 'desc'),
          limit(1)
        );
        const workoutSnapshot = await getDocs(workoutQuery);
        
        if (!workoutSnapshot.empty) {
          const lastWorkoutData = workoutSnapshot.docs[0].data();
          setLastWorkout({
            exercises: lastWorkoutData.exercises?.map((ex: any) => ex.name).join(', ') || 'No exercises',
            date: convertFirestoreDate(lastWorkoutData.date)
          });
        }
      } catch (error) {
        console.error('Error loading last workout:', error);
      } finally {
        setLoadingWorkout(false);
      }
    };

    loadLastWorkout();
  }, [user?.uid]);

  const handleSendMessage = useCallback(async (messageContent: string) => {
    try {
      await append({
        id: Date.now().toString(),
        role: 'user',
        content: messageContent
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [append]);

  const clearChat = useCallback(() => {
    // Reset messages to just the system message
    // Note: In React Native, we need to manually reset the chat state
    // instead of using window.location.reload() which is web-only
    console.log('Chat clear requested - this would require re-initializing the useChat hook');
  }, []);

  useEffect(() => {
    const loadNextWorkout = async () => {
      if (!user?.uid) return;
      
      try {
        setLoadingNextWorkout(true);
        // This is a placeholder - you would implement your workout scheduling logic
        setNextWorkout({
          id: 'next-1',
          title: 'Upper Body Strength',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          exercises: []
        });
      } catch (error) {
        console.error('Error loading next workout:', error);
      } finally {
        setLoadingNextWorkout(false);
      }
    };

    loadNextWorkout();
  }, [user?.uid]);

  // Additional hooks that were misplaced
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
      setNextWorkout(null);
    } finally {
      setLoadingNextWorkout(false);
    }
  }, [user]);

  // Fetch workouts when user is available
  useEffect(() => {
    if (user) {
      fetchLastWorkout();
      fetchNextWorkout();
    }
  }, [user]); // Removed fetchLastWorkout, fetchNextWorkout to prevent infinite re-render loop

  useEffect(() => {
    console.log('🔍 Dashboard user name effect - START');
    console.log('🔍 Dashboard user name effect:', { 
      userProfile: userProfile ? { 
        id: userProfile.id,
        uid: userProfile.uid,
        firstName: userProfile.firstName, 
        lastName: userProfile.lastName,
        displayName: userProfile.displayName,
        email: userProfile.email,
        allFields: Object.keys(userProfile)
      } : 'none',
      user: user ? { 
        uid: user.uid,
        displayName: user.displayName, 
        email: user.email 
      } : 'none'
    });
    
    if (userProfile) {
      // Create a personalized name, prioritizing firstName first
      let name = '';
      console.log('🔍 Processing userProfile for name extraction...');
      
      // Priority 1: Use firstName if available
      if (userProfile.firstName && userProfile.firstName.trim()) {
        name = userProfile.firstName.trim();
        console.log('✅ Using firstName:', name);
      }
      // Priority 2: Use displayName if available
      else if (userProfile.displayName && userProfile.displayName.trim()) {
        name = userProfile.displayName.trim();
        console.log('✅ Using displayName:', name);
      }
      // Priority 3: Use firstName + lastName combination (if firstName wasn't available alone)
      else if (userProfile.lastName) {
        name = userProfile.lastName;
        console.log('✅ Using lastName only:', name);
      }
      // Priority 4: Extract name from email (before @)
      else if (userProfile.email) {
        const emailName = userProfile.email.split('@')[0];
        // Capitalize first letter and replace dots/underscores with spaces
        name = emailName
          .replace(/[._]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        console.log('✅ Using formatted email name:', name);
      }
      // Final fallback
      else {
        name = 'Fitness Enthusiast';
        console.log('✅ Using final fallback:', name);
      }
      
      setUserName(name);
      console.log('✅ Dashboard userName set from userProfile:', name);
    } else if (user) {
      // Fallback to Firebase user data if userProfile not available
      let fallbackName = '';
      if (user.displayName && user.displayName.trim()) {
        // Try to extract firstName from displayName if it contains spaces
        const nameParts = user.displayName.trim().split(' ');
        fallbackName = nameParts[0]; // Use first part as firstName
      } else if (user.email) {
        const emailName = user.email.split('@')[0];
        fallbackName = emailName
          .replace(/[._]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      } else {
        fallbackName = 'Fitness Enthusiast';
      }
      setUserName(fallbackName);
      console.log('⚠️ Dashboard userName set from user fallback:', fallbackName);
    } else {
      console.log('❌ No user or userProfile available');
    }
    console.log('🔍 Dashboard user name effect - END');
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
  const createWorkoutFromPlan = async (plan: { title: string; exercises: WorkoutExercise[] }) => {
    if (!user || !plan) return;
    const workoutData = {
      title: plan.title || 'AI Generated Workout',
      date: getTodayLocalString(),
      exercises: plan.exercises,
    };
    try {
      await addDoc(collection(db, 'profiles', user.uid, 'workouts'), workoutData);
      
      // Save as favorite template with 'AI' prefix
      const favoriteTitle = plan.title?.startsWith('AI') ? plan.title : `AI ${plan.title || 'Generated Workout'}`;
      const favoriteTemplate = {
        name: favoriteTitle,
        defaultSets: plan.exercises.map(ex => ex.sets),
        notes: '',
        createdAt: new Date(),
        exercises: plan.exercises,
      };
      await addDoc(collection(db, 'profiles', user.uid, 'favoriteWorkouts'), favoriteTemplate);
      router.push('/(tabs)/workouts');
    } catch (err: any) {
      alert('Failed to create workout: ' + (err?.message || String(err)));
    }
  };

  // Button handler: Send structured prompt to AI, then create workout
  const handleCreateWorkout = async () => {
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistantMsg) return;
    
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
        alert(`Workout Plan Created!\nTitle: ${plan.title}\nExercises: ${plan.exercises.map(e => e.name).join(', ')}`);
        if (user) {
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

  // Send message function
  const sendMessage = useCallback(() => {
    if (input.trim()) {
      handleSendMessage(input.trim());
      setInput('');
    }
  }, [input, handleSendMessage]);

  // Early return AFTER all hooks are called
  if (!isReady) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/partial-react-logo.png')}
            style={styles.bannerLogo}
          />
        </View>
        <ScrollView style={styles.content}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Loading...</ThemedText>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/dashboard-image.png')}
          style={styles.bannerLogo}
        />
      </View>
      <ScrollView style={styles.content}>
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 250,
    backgroundColor: '#A1CEDC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  content: {
    flex: 1,
    padding: 16,
  },
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
    height: 200,
    width: '100%',
    resizeMode: 'contain',
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
