import { ManufacturingConsent_400Regular } from '@expo-google-fonts/manufacturing-consent';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { addDoc, collection, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { OpenAIDebugComponent } from '../../components/OpenAIDebugComponent';
import { RevenueCatStatus } from '../../components/RevenueCatStatus';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { UsageTracker } from '../../components/UsageTracker';
import { Workout as WorkoutModalWorkout } from '../../components/WorkoutModal';
import WorkoutReviewModal from '../../components/WorkoutReviewModal';
import WorkoutSessionModal from '../../components/WorkoutSessionModal';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useDashboardImage } from '../../hooks/useDashboardImage';
import { useFeatureGating } from '../../hooks/useFeatureGating';
import { useDynamicThemeColor } from '../../hooks/useThemeColor';
import { ChatMessage, cleanupOldChatMessages, getUserContext, sendChatMessage } from '../../services/openaiService';
import { createWorkoutFromParsedData, extractWorkoutFromChatMessage, validateAIWorkoutResponse } from '../../services/workoutParser';
import { convertExercisesToFormat, convertFirestoreDate, dateToFirestoreString, Exercise, getTodayLocalString } from '../../utils';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
 
interface Workout {
  id: string;
  title: string;
  date: Date;
  exercises: Exercise[];
}

export default function DashboardScreen() {
  return <DashboardScreenContent />;
}

function DashboardScreenContent() {
  // Load fonts
  const [fontsLoaded] = useFonts({
    ManufacturingConsent_400Regular,
  });

  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL LOGIC
  const router = useRouter();
  const authContext = useAuth();
  const { user, userProfile, loading } = authContext;
  
  // AUTH SAFETY GUARDS - Prevent crashes from accessing auth data too early
  if (loading) {
    console.log('🔄 Dashboard: Auth loading...');
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={{ marginTop: 16 }}>Loading...</ThemedText>
      </SafeAreaView>
    );
  }
  
  // Trust the centralized navigation in app/index.tsx - don't redirect here
  if (!user) {
    console.log('� Dashboard: No user found - letting app/index.tsx handle navigation');
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={{ marginTop: 16 }}>Redirecting...</ThemedText>
      </SafeAreaView>
    );
  }

  return <DashboardContent 
    fontsLoaded={fontsLoaded} 
    user={user} 
    userProfile={userProfile} 
    router={router}
  />;
}

// Separate component for the actual dashboard content
function DashboardContent({ 
  fontsLoaded, 
  user, 
  userProfile, 
  router
}: { 
  fontsLoaded: boolean;
  user: any;
  userProfile: any;
  router: any;
}) {
  const { dashboardImage } = useDashboardImage();
  const colorScheme = useColorScheme();
  const { themeColor, colors } = useDynamicThemeColor();
  
  // Feature gating hook for AI queries
  const { canUseFeature, incrementUsage } = useFeatureGating();
  
  const [userName, setUserName] = useState<string>('');
  const [lastWorkout, setLastWorkout] = useState<{
    exercises: string;
    date: Date;
  } | null>(null);
  const [nextWorkout, setNextWorkout] = useState<Workout | null>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(true);
  const [loadingNextWorkout, setLoadingNextWorkout] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // AI Chat functionality - using enhanced OpenAI service with user context
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming'>('idle');
  const [userContext, setUserContext] = useState<ChatMessage[]>([]);
  const [hasGeneratedWorkout, setHasGeneratedWorkout] = useState(false);

  // Workout Review Modal state
  const [showWorkoutReview, setShowWorkoutReview] = useState(false);
  const [workoutToReview, setWorkoutToReview] = useState<any>(null);

  // Workout Session Modal state
  const [workoutSessionVisible, setWorkoutSessionVisible] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutModalWorkout | null>(null);

  // Load user context and chat messages from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    // Load user context (workout data, exercises, etc.) for better AI responses
    const loadUserContext = async () => {
      try {
        const context = await getUserContext(user.uid);
        setUserContext(context);
        console.log('🔥 User context loaded for enhanced AI responses');
        
        // Periodically cleanup old chat messages to prevent token overflow
        await cleanupOldChatMessages(user.uid, 25); // Keep last 25 messages
      } catch (error) {
        console.error('Error loading user context:', error);
      }
    };
    
    loadUserContext();

    // Subscribe to chat messages from Firestore with real-time updates
    // Limit to recent messages to prevent token overflow
    const chatMessagesRef = collection(db, 'profiles', user.uid, 'chatMessages');
    const chatQuery = query(chatMessagesRef, orderBy('timestamp', 'desc'), limit(20)); // Limit to last 20 messages
    
    const unsubscribe = onSnapshot(
      chatQuery,
      (snapshot) => {
        const loadedMessages: ChatMessage[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          loadedMessages.push({ 
            id: doc.id,
            role: data.role, 
            content: data.content 
          });
        });
        // Reverse to maintain chronological order since we queried in desc order
        const chronologicalMessages = loadedMessages.reverse();
        setMessages(chronologicalMessages);
        
        // Don't automatically set hasGeneratedWorkout based on historical messages
        // This will be set to true only when a workout is generated in the current session
        
        console.log('💬 Chat messages synced from Firestore:', chronologicalMessages.length);
      },
      (error) => {
        console.error('Chat messages subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Function to process message content and hide JSON responses
  const formatMessageContent = (message: ChatMessage): string => {
    if (message.role === 'user') {
      return message.content; // Show user messages as-is
    }
    
    // For assistant messages, check if it contains JSON
    const content = message.content;
    
    // Check if the message contains workout JSON
    const extractedJson = extractWorkoutFromChatMessage(content);
    
    if (extractedJson) {
      try {
        const validation = validateAIWorkoutResponse(extractedJson);
        
        if (validation.isValid && validation.workout) {
          const workout = validation.workout;
          const exerciseCount = workout.exercises.length;
          const exerciseNames = workout.exercises.slice(0, 3).map(ex => ex.name);
          const totalSets = workout.exercises.reduce((total, ex) => total + ex.sets.length, 0);
          
          // Create a user-friendly summary
          let summary = `🏋️ ${workout.title}\n\n`;
          summary += `� ${exerciseCount} exercises • ${totalSets} total sets\n\n`;
          
          if (exerciseNames.length > 0) {
            summary += `Exercises include:\n`;
            exerciseNames.forEach(name => {
              summary += `• ${name}\n`;
            });
            
            if (exerciseCount > 3) {
              summary += `• ...and ${exerciseCount - 3} more\n`;
            }
          }
          
          summary += `\n💡 Use the "Create Workout" button to add this to your workout plan!`;
          
          return summary;
        }
      } catch {
        // If parsing fails, fall through to show original content
      }
    }
    
    // For non-JSON assistant messages, show as-is but clean up any remaining JSON blocks
    let cleanContent = content;
    
    // Remove JSON code blocks
    cleanContent = cleanContent.replace(/```json[\s\S]*?```/g, '');
    cleanContent = cleanContent.replace(/```[\s\S]*?```/g, '');
    
    // Remove standalone JSON objects/arrays
    cleanContent = cleanContent.replace(/^\s*[\{\[][\s\S]*?[\}\]]\s*$/gm, '');
    
    // Clean up extra whitespace
    cleanContent = cleanContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleanContent = cleanContent.trim();
    
    // If we removed everything, provide a fallback message
    if (!cleanContent) {
      return "I've prepared a workout plan for you! Use the 'Create Workout' button to add it to your routine.";
    }
    
    return cleanContent;
  };

  // Internal message handler for system prompts (doesn't store in chat history)
  const sendInternalMessage = async (messageContent: string): Promise<string> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      // Create conversation including the new message for AI context
      const userMessage: ChatMessage = { role: 'user', content: messageContent };
      
      // Use only the most recent messages to avoid token limits
      const recentMessages = messages.slice(-4); // Last 4 messages for context
      const currentConversation = [...recentMessages, userMessage];
      
      // Get AI response with user context (workouts, exercises, etc.)
      const assistantResponse = await sendChatMessage(currentConversation, userContext);
      
      return assistantResponse;
    } catch (error) {
      console.error('Error sending internal message:', error);
      throw error;
    }
  };

  // Enhanced send message function with user context and Firestore persistence
  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!user?.uid) return;
    
    // Check if user can make AI queries (await the async function)
    let canMakeQuery = false;
    try {
      canMakeQuery = await canUseFeature('aiQueriesPerMonth');
    } catch (error) {
      console.warn('⚠️ Feature gating check failed, allowing AI query in production:', error);
      // In production builds (TestFlight), if feature gating fails, allow the query
      // This prevents Firebase/feature gating issues from blocking AI functionality
      canMakeQuery = !__DEV__; // Allow in production, block in dev if feature gating fails
    }
    
    if (!canMakeQuery) {
      Alert.alert(
        'AI Query Limit Reached',
        'You\'ve used all 5 of your monthly AI queries. Upgrade to Pro for unlimited AI assistance!',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => {
              // TODO: Navigate to upgrade screen
              console.log('Navigate to upgrade screen from AI query limit');
            }
          }
        ]
      );
      return;
    }
    
    try {
      setStatus('submitted');
      
      // Store user message in Firestore
      await addDoc(collection(db, 'profiles', user.uid, 'chatMessages'), {
        role: 'user',
        content: messageContent,
        timestamp: serverTimestamp(),
      });

      setStatus('streaming');
      
      // Create conversation including the new message for AI context
      const userMessage: ChatMessage = { role: 'user', content: messageContent };
      
      // Use only recent messages to avoid token limits
      const recentMessages = messages.slice(-4); // Last 4 messages for context
      const currentConversation = [...recentMessages, userMessage];
      
      // Get AI response with user context (workouts, exercises, etc.)
      const assistantResponse = await sendChatMessage(currentConversation, userContext);
      
      // Increment AI query usage after successful response (with fallback)
      try {
        await incrementUsage('aiQueriesPerMonth');
      } catch (error) {
        console.warn('⚠️ Failed to increment AI usage count (continuing anyway):', error);
      }
      
      // Check if the AI response contains a valid workout
      const extractedJson = extractWorkoutFromChatMessage(assistantResponse);
      if (extractedJson && validateAIWorkoutResponse(extractedJson).isValid) {
        setHasGeneratedWorkout(true);
      }
      
      // Store AI response in Firestore
      await addDoc(collection(db, 'profiles', user.uid, 'chatMessages'), {
        role: 'assistant',
        content: assistantResponse,
        timestamp: serverTimestamp(),
      });

      setStatus('idle');
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus('idle');
      
      // Provide user-friendly error message based on error type
      let errorMessage = 'Unable to get AI response. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'AI service configuration issue. Please contact support.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('quota')) {
          errorMessage = 'AI service temporarily unavailable. Please try again later.';
        }
      }
      
      // Show error to user
      Alert.alert(
        'AI Response Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  }, [user?.uid, messages, userContext, canUseFeature, incrementUsage]);

  // Stop function (for compatibility with existing UI)
  const stop = useCallback(() => {
    setStatus('idle');
  }, []);

  // Clear chat function - only clears visible messages, not Firestore history
  const clearChat = useCallback(() => {
    setMessages([]);
    setInput('');
    setHasGeneratedWorkout(false); // Reset workout generation state
    console.log('🧹 Chat cleared - visible messages only');
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
    } catch {
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
      
      // Get today's date in the same format we store in Firestore (YYYY-MM-DD)
      const today = new Date();
      const todayString = dateToFirestoreString(today);
      
      console.log('🗓️ Dashboard: Today as Firestore string:', todayString);
      console.log('🗓️ Dashboard: Today as Date:', today);
      
      // First, let's see all workouts for debugging
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      const allWorkoutsQuery = query(workoutsRef, where('isCompleted', '==', false));
      const allWorkoutsSnapshot = await getDocs(allWorkoutsQuery);
      
      console.log('📊 Dashboard: All uncompleted workouts found:', allWorkoutsSnapshot.size);
      allWorkoutsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`📝 Dashboard: Workout "${data.title || data.name}" - Date: "${data.date}" - IsCompleted: ${data.isCompleted} - Raw date type:`, typeof data.date);
        
        // Check date comparison
        const workoutDate = convertFirestoreDate(data.date);
        const isToday = workoutDate.toDateString() === today.toDateString();
        const isFuture = workoutDate > today;
        const dateComparison = data.date >= todayString;
        
        console.log(`📅 Dashboard: "${data.title}" date analysis:`);
        console.log(`   - Workout date object: ${workoutDate.toDateString()}`);
        console.log(`   - Is today: ${isToday}`);
        console.log(`   - Is future: ${isFuture}`);
        console.log(`   - String comparison (${data.date} >= ${todayString}): ${dateComparison}`);
        console.log(`   - Should show on dashboard: ${!data.isCompleted && (isToday || isFuture)}`);
      });
      
      // First, try to find workouts for today and future
      let workoutsQuery = query(
        workoutsRef,
        where('date', '>=', todayString),
        where('isCompleted', '==', false),
        orderBy('date', 'asc'),
        limit(1)
      );
      
      console.log('🔍 Dashboard: Running query for today and future workouts with date >=', todayString);
      let querySnapshot = await getDocs(workoutsQuery);
      console.log('📊 Dashboard: Query results:', querySnapshot.size);
      
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
        
        console.log('✅ Dashboard: Found upcoming workout:', workoutData.title, 'on', workoutDate.toDateString());
      } else {
        console.log('❌ Dashboard: No workouts found with string query, trying alternative approach...');
        
        // Fallback: Get all uncompleted workouts and filter in JavaScript (like workouts screen does)
        const allUncompletedQuery = query(
          workoutsRef,
          where('isCompleted', '==', false),
          orderBy('date', 'asc')
        );
        
        const allUncompletedSnapshot = await getDocs(allUncompletedQuery);
        console.log('🔄 Dashboard: Fallback query - all uncompleted workouts:', allUncompletedSnapshot.size);
        
        // Filter for today and future dates using JavaScript
        const upcomingWorkouts = allUncompletedSnapshot.docs
          .map(doc => {
            const docData = doc.data();
            return {
              id: doc.id,
              ...docData,
              workoutDate: convertFirestoreDate(docData.date)
            } as any; // Type cast to avoid TypeScript issues
          })
          .filter((workout: any) => {
            const workoutDate = workout.workoutDate;
            const isToday = workoutDate.toDateString() === today.toDateString();
            const isFuture = workoutDate > today;
            const isUpcoming = isToday || isFuture;
            
            console.log(`🔍 Dashboard: "${workout.title}" - Date: ${workoutDate.toDateString()}, Is upcoming: ${isUpcoming}`);
            return isUpcoming;
          })
          .sort((a: any, b: any) => a.workoutDate.getTime() - b.workoutDate.getTime());
        
        if (upcomingWorkouts.length > 0) {
          const nextWorkoutData: any = upcomingWorkouts[0];
          const exercises = convertExercisesToFormat(nextWorkoutData.exercises, nextWorkoutData.id);
          
          setNextWorkout({
            id: nextWorkoutData.id,
            title: nextWorkoutData.title || 'Untitled Workout',
            date: nextWorkoutData.workoutDate,
            exercises,
          });
          
          console.log('✅ Dashboard: Found upcoming workout via fallback:', nextWorkoutData.title, 'on', nextWorkoutData.workoutDate.toDateString());
        } else {
          console.log('❌ Dashboard: No upcoming workouts found via fallback either');
          setNextWorkout(null);
        }
      }
    } catch (error) {
      console.error('Error fetching next workout:', error);
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
  }, [user, fetchLastWorkout, fetchNextWorkout]);

  // Simple effect to set userName from userProfile
  useEffect(() => {
    if (userProfile?.firstName && userProfile.firstName.trim()) {
      setUserName(userProfile.firstName.trim());
    } else {
      setUserName('Workout Warrior');
    }
  }, [userProfile]);

  // Enhanced workout creation using the new parser
  const handleCreateWorkout = async () => {
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistantMsg) {
      alert('Please ask the AI for a workout plan first.');
      return;
    }
    
    try {
      // First, try to extract workout data from the existing message
      const extractedJson = extractWorkoutFromChatMessage(lastAssistantMsg.content);
      
      if (extractedJson) {
        // Validate the extracted workout data
        const validation = validateAIWorkoutResponse(extractedJson);
        
        if (validation.isValid && validation.workout) {
          // Show workout review modal instead of creating immediately
          console.log('✅ Showing workout review modal for:', validation.workout);
          setWorkoutToReview(validation.workout); // Use the parsed workout object
          setShowWorkoutReview(true);
          return;
        }
      }
      
      // Show a user-friendly status message
      await addDoc(collection(db, 'profiles', user!.uid, 'chatMessages'), {
        role: 'assistant',
        content: '🔄 Converting your workout plan to a structured format...',
        timestamp: serverTimestamp(),
      });
      
      // If no valid workout found in existing message, request a structured format internally
      const structuredPrompt = `Please convert your workout recommendation into a JSON format. Use this exact structure:

{
  "title": "Workout Name",
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": [
        {"reps": "10", "weight": "135"},
        {"reps": "8", "weight": "155"}
      ]
    }
  ]
}

Please convert your previous workout recommendation to this format.`;
      
      // Send the structured prompt internally (won't appear in chat)
      const assistantResponse = await sendInternalMessage(structuredPrompt);
      
      // Extract and validate the response
      const newExtractedJson = extractWorkoutFromChatMessage(assistantResponse);
      
      if (!newExtractedJson) {
        // Update the status message to show failure
        await addDoc(collection(db, 'profiles', user!.uid, 'chatMessages'), {
          role: 'assistant',
          content: '❌ Could not extract workout data. Please try asking for a different workout format.',
          timestamp: serverTimestamp(),
        });
        return;
      }
      
      const newValidation = validateAIWorkoutResponse(newExtractedJson);
      
      if (!newValidation.isValid || !newValidation.workout) {
        console.error('Workout validation failed:', newValidation.error);
        // Update the status message to show validation failure
        await addDoc(collection(db, 'profiles', user!.uid, 'chatMessages'), {
          role: 'assistant',
          content: `❌ Could not create workout: ${newValidation.error}`,
          timestamp: serverTimestamp(),
        });
        return;
      }
      
      // Show workout review modal instead of creating immediately
      console.log('✅ Showing workout review modal for structured response:', newValidation.workout);
      setWorkoutToReview(newValidation.workout); // Use the parsed workout object
      setShowWorkoutReview(true);
      
    } catch (error) {
      console.error('Error creating workout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Show error message in chat
      await addDoc(collection(db, 'profiles', user!.uid, 'chatMessages'), {
        role: 'assistant',
        content: `❌ Failed to create workout: ${errorMessage}`,
        timestamp: serverTimestamp(),
      });
    }
  };

  // Handle workout review modal save
  const handleWorkoutSave = async (workoutData: any, selectedDate: Date, editedTitle: string, notes?: string, duration?: number) => {
    try {
      console.log('💾 Saving workout:', { title: editedTitle, date: selectedDate, notes, duration });
      
      // Update the workout data with the selected date, edited title, and duration
      const updatedWorkoutData = {
        ...workoutData,
        title: editedTitle,
        notes: notes || '',
        duration: duration || 45 // Default to 45 minutes if not provided
      };
      
      // Create the workout with the selected date using the parsed data function
      await createWorkoutFromParsedData(user!.uid, updatedWorkoutData, selectedDate);
      
      // Show success message in chat
      await addDoc(collection(db, 'profiles', user!.uid, 'chatMessages'), {
        role: 'assistant',
        content: `✅ Workout "${editedTitle}" has been created and scheduled for ${selectedDate.toLocaleDateString()}!`,
        timestamp: serverTimestamp(),
      });
      
      // Reset states
      setShowWorkoutReview(false);
      setWorkoutToReview(null);
      setHasGeneratedWorkout(false);
      
      // Navigate to workouts screen
      router.push('/workouts');
      alert(`Workout "${editedTitle}" created successfully!`);
      
    } catch (error) {
      console.error('Error saving workout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Show error message in chat
      await addDoc(collection(db, 'profiles', user!.uid, 'chatMessages'), {
        role: 'assistant',
        content: `❌ Failed to save workout: ${errorMessage}`,
        timestamp: serverTimestamp(),
      });
      
      alert(`Failed to save workout: ${errorMessage}`);
    }
  };

  // Handle workout review modal cancel
  const handleWorkoutCancel = () => {
    console.log('❌ Workout creation cancelled');
    setShowWorkoutReview(false);
    setWorkoutToReview(null);
  };

  // Handle starting a workout session
  const handleStartWorkout = (workout: Workout) => {
    console.log('🏋️ Starting workout:', workout.title);
    
    // Convert from dashboard Workout type to WorkoutModal Workout type
    const workoutModalWorkout: WorkoutModalWorkout = {
      id: workout.id,
      title: workout.title,
      date: workout.date,
      exercises: workout.exercises.map(exercise => ({
        id: `${workout.id}-${exercise.name}`,
        name: exercise.name,
        sets: exercise.sets || [],
        notes: '',
        restTime: 60
      })),
      isCompleted: false,
      duration: 0,
      notes: ''
    };
    
    setActiveWorkout(workoutModalWorkout);
    setWorkoutSessionVisible(true);
  };

  // Handle workout session completion
  const handleWorkoutComplete = (completedWorkout: WorkoutModalWorkout) => {
    console.log('✅ Workout session completed:', completedWorkout.title);
    setActiveWorkout(null);
    setWorkoutSessionVisible(false);
    // Refresh next workout data
    fetchNextWorkout();
  };

  // Handle workout session cancellation
  const handleWorkoutClose = () => {
    console.log('❌ Workout session closed');
    setActiveWorkout(null);
    setWorkoutSessionVisible(false);
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

  // Dynamic button styles using theme colors
  const dynamicStyles = {
    startButton: {
      ...styles.startButton,
      backgroundColor: themeColor,
    },
    sendButton: {
      ...styles.sendButton,
      backgroundColor: themeColor,
    },
    sendButtonDisabled: {
      ...styles.sendButton,
      backgroundColor: `${themeColor}80`, // 50% opacity
    },
    createButton: {
      ...styles.createButton,
      backgroundColor: themeColor,
    },
    createWorkoutButton: {
      ...styles.createWorkoutButton,
      backgroundColor: themeColor,
      shadowColor: themeColor,
    },
    editButton: {
      ...styles.editButton,
      borderColor: themeColor,
    },
    editButtonText: {
      ...styles.editButtonText,
      color: themeColor,
    },
    browseButton: {
      ...styles.browseButton,
      borderColor: themeColor,
    },
    browseButtonText: {
      ...styles.browseButtonText,
      color: themeColor,
    },
    smallShortcutButton: {
      ...styles.smallShortcutButton,
      backgroundColor: `${themeColor}1A`, // 10% opacity
      borderColor: `${themeColor}4D`, // 30% opacity
    },
    smallShortcutText: {
      ...styles.smallShortcutText,
      color: themeColor,
    },
    statusContainer: {
      ...styles.statusContainer,
      backgroundColor: `${themeColor}1A`, // 10% opacity
    },
    statusText: {
      ...styles.statusText,
      color: themeColor,
    },
  };

  // Early return AFTER all hooks are called - only check fonts since auth is handled in parent
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.safeArea} onLayout={onLayoutRootView}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <Image
              source={dashboardImage ? { uri: dashboardImage } : require('@/assets/images/dashboard-image.png')}
              style={styles.bannerLogo}
            />
            <ThemedText style={appTitleStyle}>Get Maximum Fit</ThemedText>
          </View>
          <ScrollView style={styles.content}>
            <ThemedView style={styles.titleContainer}>
              <ThemedText type="title">Loading fonts...</ThemedText>
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
            source={dashboardImage ? { uri: dashboardImage } : require('../../assets/images/dashboard-image.png')}
            style={styles.bannerLogo}
          />
          <ThemedText style={appTitleStyle}>Get Maximum Fit</ThemedText>
        </View>
        <View style={styles.content}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          >
            <ScrollView 
              style={styles.contentScrollView} 
              contentContainerStyle={styles.scrollContentPadding}
              showsVerticalScrollIndicator={false}
            >
              <ThemedView style={styles.titleContainer}>
                <ThemedText type="title">Welcome, {userName}!</ThemedText>
              </ThemedView>
              
              {/* RevenueCat Status (Development Only) */}
              <RevenueCatStatus showDetails={true} />
              
              {/* OpenAI Debug Component (Development Only) */}
              <OpenAIDebugComponent />
              
              {/* Test Premium Upgrade (Development Only) */}
              {__DEV__ && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#007AFF',
                    padding: 12,
                    borderRadius: 8,
                    marginVertical: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => router.push('/premiumUpgrade')}
                >
                  <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                    🧪 Test Premium Upgrade
                  </ThemedText>
                </TouchableOpacity>
              )}
              
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
                  <ActivityIndicator size="small" color={themeColor} />
                ) : lastWorkout ? (
                  <>
                    <ThemedText style={styles.exercisesText}>{lastWorkout.exercises}</ThemedText>
                    <ThemedText style={styles.workoutDate}>{lastWorkout.date ? lastWorkout.date.toLocaleDateString() : ''}</ThemedText>
                    {/* Small shortcut link to progress */}
                    <TouchableOpacity
                      style={dynamicStyles.smallShortcutButton}
                      onPress={() => router.push('/(tabs)/progress')}
                    >
                      <ThemedText style={dynamicStyles.smallShortcutText}>View Progress →</ThemedText>
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
                  <ActivityIndicator size="small" color={themeColor} />
                ) : nextWorkout ? (
                  <>
                    <ThemedText style={styles.nextWorkoutTitle}>{nextWorkout.title}</ThemedText>
                    <ThemedText style={styles.nextWorkoutDate}>Scheduled for {nextWorkout.date ? nextWorkout.date.toLocaleDateString() : ''}</ThemedText>
                    <ThemedText style={styles.nextWorkoutExercises}>{nextWorkout.exercises && nextWorkout.exercises.length > 0 ? nextWorkout.exercises.map(e => e.name).join(', ') : 'No exercises listed.'}</ThemedText>
                    <View style={styles.workoutActionButtons}>
                      <TouchableOpacity
                        style={[styles.workoutActionButton, dynamicStyles.startButton]}
                        onPress={() => handleStartWorkout(nextWorkout)}
                      >
                        <FontAwesome5 name="play" size={14} color="#fff" />
                        <ThemedText style={styles.startButtonText}>Start Workout</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.workoutActionButton, dynamicStyles.editButton]}
                        onPress={() => router.push({
                          pathname: '/createWorkout',
                          params: { 
                            date: nextWorkout.date?.toISOString() || new Date().toISOString()
                          }
                        })}
                      >
                        <FontAwesome5 name="edit" size={14} color={themeColor} />
                        <ThemedText style={dynamicStyles.editButtonText}>Create Workout</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <ThemedText style={styles.emptyMessagesText}>No upcoming workout scheduled.</ThemedText>
                    <View style={styles.workoutActionButtons}>
                      <TouchableOpacity
                        style={[styles.workoutActionButton, dynamicStyles.createButton]}
                        onPress={() => router.push({
                          pathname: '/createWorkout',
                          params: { date: new Date().toISOString() }
                        })}
                      >
                        <FontAwesome5 name="plus" size={14} color="#fff" />
                        <ThemedText style={styles.createButtonText}>Create Workout</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.workoutActionButton, dynamicStyles.browseButton]}
                        onPress={() => router.push('/(tabs)/workouts')}
                      >
                        <FontAwesome5 name="calendar-alt" size={14} color={themeColor} />
                        <ThemedText style={dynamicStyles.browseButtonText}>View Calendar</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ThemedView>

              {/* AI Fitness Assistant Chat Section */}
              <ThemedView style={styles.stepContainer}>
                <View style={styles.chatHeaderContainer}>
                  <View style={styles.chatTitleContainer}>
                    <ThemedText type="subtitle">AI Fitness Assistant</ThemedText>
                    <ThemedText>
                      Ask for workout plans, exercise advice, nutrition tips, or motivation!
                    </ThemedText>
                  </View>
                  {messages.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearChatButton}
                      onPress={clearChat}
                    >
                      <FontAwesome5 name="broom" size={16} color="#666" />
                      <ThemedText style={styles.clearChatButtonText}>Clear</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </ThemedView>

              {/* Chat Container */}
              <ThemedView style={styles.chatContainer}>
                {/* AI Query Usage Tracker */}
                <View style={styles.usageSection}>
                  <ThemedText style={styles.usageSectionTitle}>AI Queries This Month</ThemedText>
                  <UsageTracker 
                    feature="aiQueriesPerMonth" 
                    onUpgradePress={() => router.push('/premiumUpgrade')}
                  />
                </View>
                
                {/* Input Container - Moved to Top */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.chatInput}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Ask about workouts or strength training..."
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
                          dynamicStyles.sendButton,
                          !input.trim() && dynamicStyles.sendButtonDisabled,
                        ]}
                        onPress={sendMessage}
                        disabled={!input.trim()}
                      >
                        <ThemedText style={styles.sendButtonText}>Send</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Status Display */}
                {(status === 'submitted' || status === 'streaming') && (
                  <View style={dynamicStyles.statusContainer}>
                    <ActivityIndicator size="small" color={themeColor} />
                    <ThemedText style={dynamicStyles.statusText}>
                      {status === 'streaming' ? 'AI is responding...' : 'Processing...'}
                    </ThemedText>
                  </View>
                )}

                {/* Messages Display - Below Input */}
                <ScrollView 
                  ref={scrollViewRef}
                  style={styles.messagesScrollContainer}
                  contentContainerStyle={styles.scrollContentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.messagesContainer}>
                    {messages.length === 0 ? (
                      <View style={styles.emptyMessagesContainer}>
                        <ThemedText style={styles.emptyMessagesText}>
                          Start a conversation with your AI workout and stength assistant!
                        </ThemedText>
                      </View>
                    ) : (
                      messages.map((message) => (
                        <View
                          key={message.id || message.content}
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
                            {formatMessageContent(message)}
                          </ThemedText>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
                
                {/* Create Workout Button - shown when a workout has been generated */}
                {hasGeneratedWorkout && (
                  <View style={styles.createWorkoutButtonContainer}>
                    <TouchableOpacity
                      style={dynamicStyles.createWorkoutButton}
                      onPress={handleCreateWorkout}
                    >
                      <FontAwesome5 name="plus-circle" size={16} color="#fff" style={styles.createWorkoutIcon} />
                      <ThemedText style={styles.createWorkoutButtonText}>Create Workout</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </ThemedView>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ThemedView>
      
      {/* Workout Review Modal */}
      <WorkoutReviewModal
        visible={showWorkoutReview}
        workoutData={workoutToReview}
        onSave={handleWorkoutSave}
        onCancel={handleWorkoutCancel}
      />
      
      {/* Workout Session Modal */}
      <WorkoutSessionModal
        visible={workoutSessionVisible}
        workout={activeWorkout}
        onComplete={handleWorkoutComplete}
        onClose={handleWorkoutClose}
      />
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
  usageSection: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  usageSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.7,
  },
  messagesScrollContainer: {
    flex: 1,
    paddingHorizontal: 2,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
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
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chatHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  chatTitleContainer: {
    flex: 1,
  },
  clearChatButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearChatButtonText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
  },
  createWorkoutButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#ffffff',
  },
  createWorkoutButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createWorkoutIcon: {
    marginRight: 4,
  },
  createWorkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New workout action button styles
  workoutActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  workoutActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  startButton: {
    backgroundColor: '#007AFF',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#FF9500',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#34C759',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  browseButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  browseButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  draftIndicator: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9500',
    marginBottom: 4,
  },
  draftDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
});
