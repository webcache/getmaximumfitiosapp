import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useChat } from '@ai-sdk/react';
import { ManufacturingConsent_400Regular } from '@expo-google-fonts/manufacturing-consent';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { fetch as expoFetch } from 'expo/fetch';
import { addDoc, collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebase';
import { convertExercisesToFormat, convertFirestoreDate, Exercise, generateAPIUrl, getTodayLocalString } from '../../utils';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Local fallback type definitions for AI workout plan conversion
type ExerciseSet = { id: string; reps: string; weight?: string; notes?: string };
type CustomWorkoutExercise = { id: string; name: string; sets: ExerciseSet[]; notes?: string; isMaxLift?: boolean; baseExercise?: any };
 
interface Workout {
  id: string;
  title: string;
  date: Date;
  exercises: Exercise[];
}

export default function DashboardScreen() {
  // Load fonts
  const [fontsLoaded] = useFonts({
    ManufacturingConsent_400Regular,
  });

  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL LOGIC
  const router = useRouter();
  const { isReady, user, userProfile, loading, initialized, persistenceRestored } = useAuthGuard();
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

  // Helper: Parse AI JSON workout plan and convert to CustomWorkoutExercise[] template
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

  // Convert AI plan exercises to CustomWorkoutExercise[]
  const convertAIExercisesToWorkoutExercises = (aiExercises: ParsedAIPlan['exercises']): CustomWorkoutExercise[] => {
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

  const parseWorkoutPlan = (jsonString: string): { title: string; exercises: CustomWorkoutExercise[] } | null => {
    try {
      const plan: ParsedAIPlan = JSON.parse(jsonString);
      if (!plan.exercises || !Array.isArray(plan.exercises)) return null;
      const exercises = convertAIExercisesToWorkoutExercises(plan.exercises);
      return { title: plan.title || 'AI Generated Workout', exercises };
    } catch {
      return null;
    }
  };

  // Create workout in Firestore from parsed plan (CustomWorkoutExercise[])
  const createWorkoutFromPlan = async (plan: { title: string; exercises: CustomWorkoutExercise[] }) => {
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

  // Handle font loading
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Dynamic style for AppTitle with font fallback
  const appTitleStyle = {
    ...styles.AppTitle,
    fontFamily: fontsLoaded ? 'ManufacturingConsent_400Regular' : Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  };

  // Optional: Create custom styled text for headers if needed
  const customHeaderStyle = {
    fontFamily: fontsLoaded ? 'ManufacturingConsent_400Regular' : Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
    fontWeight: '600' as const,
    fontSize: 20,
  };

  // Early return AFTER all hooks are called
  if (!fontsLoaded || !isReady) {
    return (
      <SafeAreaView style={styles.safeArea} onLayout={onLayoutRootView}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/dashboard-image.png')}
              style={styles.bannerLogo}
            />
            <ThemedText style={appTitleStyle}>Get Maximum Fit</ThemedText>
          </View>
          <ScrollView style={styles.content}>
            <ThemedView style={styles.titleContainer}>
              <ThemedText type="title">Loading...</ThemedText>
            </ThemedView>
            <ThemedView style={styles.stepContainer}>
              <ThemedText style={styles.debugText}>
                Debug: fontsLoaded={String(fontsLoaded)} | isReady={String(isReady)} | loading={String(loading)} | initialized={String(initialized)} | persistenceRestored={String(persistenceRestored)}
              </ThemedText>
            </ThemedView>
          </ScrollView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} onLayout={onLayoutRootView}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/dashboard-image.png')}
            style={styles.bannerLogo}
          />
          <ThemedText style={appTitleStyle}>Get Maximum Fit</ThemedText>
        </View>
        <View style={styles.content}>
          <ScrollView 
            style={styles.contentScrollView} 
            contentContainerStyle={styles.scrollContentPadding}
            showsVerticalScrollIndicator={false}
          >
            <ThemedView style={styles.titleContainer}>
              <ThemedText type="title">Welcome, {userName}!</ThemedText>
            </ThemedView>
            
            <ThemedView style={styles.stepContainer}>
              <ThemedText type="subtitle">Your Fitness Dashboard</ThemedText>
              <ThemedText>
                Track your workouts, set goals, and achieve your maximum fitness potential.
              </ThemedText>
            </ThemedView>

            {/* Last Workout Section */}
            <ThemedView style={styles.lastWorkoutContainer}>
              <ThemedText type="subtitle">Last Workout</ThemedText>
              {loadingWorkout ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : lastWorkout ? (
                <>
                  <ThemedText style={styles.exercisesText}>{lastWorkout.exercises}</ThemedText>
                  <ThemedText style={styles.workoutDate}>{lastWorkout.date ? lastWorkout.date.toLocaleDateString() : ''}</ThemedText>
                  {/* Small shortcut link to progress */}
                  <TouchableOpacity
                    style={styles.smallShortcutButton}
                    onPress={() => router.push('/(tabs)/progress')}
                  >
                    <ThemedText style={styles.smallShortcutText}>View Progress →</ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <ThemedText style={styles.emptyMessagesText}>No previous workout found.</ThemedText>
              )}
            </ThemedView>

            {/* Next Workout Section */}
            <ThemedView style={styles.nextWorkoutContainer}>
              <ThemedText type="subtitle">Next Workout</ThemedText>
              {loadingNextWorkout ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : nextWorkout ? (
                <>
                  <ThemedText style={styles.nextWorkoutTitle}>{nextWorkout.title}</ThemedText>
                  <ThemedText style={styles.nextWorkoutDate}>{nextWorkout.date ? nextWorkout.date.toLocaleDateString() : ''}</ThemedText>
                  <ThemedText style={styles.nextWorkoutExercises}>{nextWorkout.exercises && nextWorkout.exercises.length > 0 ? nextWorkout.exercises.map(e => e.name).join(', ') : 'No exercises listed.'}</ThemedText>
                  {/* Small shortcut link to workouts screen */}
                  <TouchableOpacity
                    style={styles.smallShortcutButton}
                    onPress={() => router.push('/(tabs)/workouts')}
                  >
                    <ThemedText style={styles.smallShortcutText}>Start Workout →</ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <ThemedText style={styles.emptyMessagesText}>No upcoming workout scheduled.</ThemedText>
                  {/* Small shortcut link to create workout */}
                  <TouchableOpacity
                    style={styles.smallShortcutButton}
                    onPress={() => router.push('/(tabs)/workouts')}
                  >
                    <ThemedText style={styles.smallShortcutText}>Create Workout →</ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </ThemedView>

            {/* AI Fitness Assistant Chat Section */}
            <ThemedView style={styles.stepContainer}>
              <ThemedText type="subtitle">AI Fitness Assistant</ThemedText>
              <ThemedText>
                Ask for workout plans, exercise advice, nutrition tips, or motivation!
              </ThemedText>
            </ThemedView>

            {/* Chat Container */}
            <ThemedView style={styles.chatContainer}>
              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <ThemedText style={styles.errorText}>
                    Error: {error.message}
                  </ThemedText>
                </View>
              )}

              {/* Status Display */}
              {(status === 'submitted' || status === 'streaming') && (
                <View style={styles.statusContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <ThemedText style={styles.statusText}>
                    {status === 'streaming' ? 'AI is responding...' : 'Processing...'}
                  </ThemedText>
                </View>
              )}

              {/* Messages Display */}
              <ScrollView 
                ref={scrollViewRef}
                style={styles.messagesScrollContainer}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.messagesContainer}>
                  {messages.length <= 1 ? (
                    <View style={styles.emptyMessagesContainer}>
                      <ThemedText style={styles.emptyMessagesText}>
                        Start a conversation with your AI fitness assistant!
                      </ThemedText>
                    </View>
                  ) : (
                    messages.slice(1).map((message) => (
                      <View
                        key={message.id}
                        style={[
                          styles.messageBox,
                          message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.messageText,
                            message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                          ]}
                        >
                          {message.content}
                        </ThemedText>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              {/* Input Container */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.chatInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask about workouts, exercises, nutrition..."
                  placeholderTextColor="#999"
                  multiline
                  textAlignVertical="top"
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
                      style={[
                        styles.sendButton,
                        !input.trim() && styles.sendButtonDisabled,
                      ]}
                      onPress={sendMessage}
                      disabled={!input.trim()}
                    >
                      <ThemedText style={styles.sendButtonText}>Send</ThemedText>
                    </TouchableOpacity>
                  )}
                  
                  {/* Create Workout Button - shown when there's a recent AI response */}
                  {messages.length > 1 && messages[messages.length - 1].role === 'assistant' && (
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={handleCreateWorkout}
                    >
                      <ThemedText style={styles.sendButtonText}>Create Workout</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ThemedView>
          </ScrollView>
        </View>
      </ThemedView>
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
    backgroundColor: '#ffffff',
  },
  header: {
    height: 180,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  AppTitle: {
    fontSize: 40,
    fontFamily: 'ManufacturingConsent_400Regular',
    fontWeight: 'bold',
    color: '#ffffff',
    position: 'absolute',
    top: '40%',
    left: 0,
    paddingVertical: 12,
    width: '100%',
    textAlign: 'center',
    zIndex: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 5 },
    textShadowRadius: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  contentScrollView: {
    flex: 1,
  },
  scrollContentPadding: {
    paddingBottom: 50, // Extra padding to prevent overlap with tab bar
  },
  titleContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  stepContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  bannerLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  lastWorkoutContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.08)',
  },
  exercisesText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 10,
    color: '#2c3e50',
    lineHeight: 20,
  },
  workoutDate: {
    fontSize: 13,
    opacity: 0.7,
    fontStyle: 'italic',
    color: '#6c757d',
  },
  nextWorkoutContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(34, 139, 34, 0.08)',
  },
  nextWorkoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 10,
    color: '#2c3e50',
  },
  nextWorkoutDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#228B22',
    marginBottom: 6,
  },
  nextWorkoutExercises: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  chatContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    height: 420,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  messagesScrollContainer: {
    flex: 1,
    marginBottom: 16,
    paddingHorizontal: 2,
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
    paddingVertical: 32,
  },
  emptyMessagesText: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
    color: '#666666',
  },
  messageBox: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    maxWidth: '100%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(248, 249, 250, 0.95)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
    flexWrap: 'wrap',
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
    gap: 6,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(99, 99, 99, 0.6)',
    borderRadius: 8,
    padding: 12,
    color: '#333333',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    maxHeight: 80,
    minHeight: 40,
    fontSize: 14,
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
  tapToEdit: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'right',
  },
  smallShortcutButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  smallShortcutText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
