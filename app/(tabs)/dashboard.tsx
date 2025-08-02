import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ManufacturingConsent_400Regular } from '@expo-google-fonts/manufacturing-consent';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { addDoc, collection, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { ChatMessage, getUserContext, sendChatMessage } from '../../services/openaiService';
import { createWorkoutFromAI, extractWorkoutFromChatMessage, validateAIWorkoutResponse } from '../../services/workoutParser';
import { convertExercisesToFormat, convertFirestoreDate, Exercise, getTodayLocalString } from '../../utils';

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

  // Load user context and chat messages from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    // Load user context (workout data, exercises, etc.) for better AI responses
    const loadUserContext = async () => {
      try {
        const context = await getUserContext(user.uid);
        setUserContext(context);
        console.log('🔥 User context loaded for enhanced AI responses');
      } catch (error) {
        console.error('Error loading user context:', error);
      }
    };
    
    loadUserContext();

    // Subscribe to chat messages from Firestore with real-time updates
    const chatMessagesRef = collection(db, 'profiles', user.uid, 'chatMessages');
    const chatQuery = query(chatMessagesRef, orderBy('timestamp', 'asc'));
    
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
        setMessages(loadedMessages);
        console.log('💬 Chat messages synced from Firestore:', loadedMessages.length);
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
      } catch (error) {
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
      const currentConversation = [...messages, userMessage];
      
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
      const currentConversation = [...messages, userMessage];
      
      // Get AI response with user context (workouts, exercises, etc.)
      const assistantResponse = await sendChatMessage(currentConversation, userContext);
      
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
    }
  }, [user?.uid, messages, userContext]);

  // Stop function (for compatibility with existing UI)
  const stop = useCallback(() => {
    setStatus('idle');
  }, []);

  // Clear chat function - only clears visible messages, not Firestore history
  const clearChat = useCallback(() => {
    setMessages([]);
    setInput('');
    console.log('🧹 Chat cleared - visible messages only');
  }, []);

  // Append function for compatibility with existing workout creation code
  const append = useCallback(async (message: { role: 'user' | 'assistant'; content: string }) => {
    await handleSendMessage(message.content);
  }, [handleSendMessage]);

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
    } catch {
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
          // Create workout directly from existing data
          console.log('✅ Creating workout from existing message:', validation.workout);
          
          const workoutRef = await createWorkoutFromAI(user!.uid, extractedJson);
          
          // Navigate to workouts screen
          router.push('/workouts');
          alert(`Workout "${validation.workout.title}" created successfully!`);
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
      
      // Create the workout
      console.log('✅ Creating workout from new structured response:', newValidation.workout);
      
      const workoutRef = await createWorkoutFromAI(user!.uid, newExtractedJson);
      
      // Update the status message to show success
      await addDoc(collection(db, 'profiles', user!.uid, 'chatMessages'), {
        role: 'assistant',
        content: `✅ Workout "${newValidation.workout.title}" has been created and added to your workout plan!`,
        timestamp: serverTimestamp(),
      });
      
      // Navigate to workouts screen
      router.push('/workouts');
      alert(`Workout "${newValidation.workout.title}" created successfully!`);
      
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

  // Early return AFTER all hooks are called - only check fonts since auth is handled in parent
  if (!fontsLoaded) {
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
            source={require('@/assets/images/dashboard-image.png')}
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
                {/* Input Container - Moved to Top */}
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

                {/* Status Display */}
                {(status === 'submitted' || status === 'streaming') && (
                  <View style={styles.statusContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <ThemedText style={styles.statusText}>
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
                          Start a conversation with your AI fitness assistant!
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
              </ThemedView>
            </ScrollView>
          </KeyboardAvoidingView>
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
});
