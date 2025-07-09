import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useChat } from '@ai-sdk/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { fetch as expoFetch } from 'expo/fetch';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { convertExercisesToFormat, convertFirestoreDate, Exercise, formatDate, generateAPIUrl, getTodayLocalString } from '../../utils';

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
    handleInputChange, 
    handleSubmit, 
    isLoading, 
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

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
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
              onPress={() => router.push('/(tabs)/explore')}
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
              onPress={() => router.push('/(tabs)/explore')}
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
                {messages.filter(m => m.role !== 'system').map((message) => (
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
  reactLogo: {
    height: 178,
    width: 290,
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
    padding: 16,
    marginTop: 8,
    height: 300, // Fixed height for better scrolling
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
    maxWidth: '90%', // Increased from 85% to show more content
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
