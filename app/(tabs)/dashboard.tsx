import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useChat } from '@ai-sdk/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { fetch as expoFetch } from 'expo/fetch';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { formatDate, generateAPIUrl } from '../../utils';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [userName, setUserName] = useState<string>('');
  const [lastWorkout, setLastWorkout] = useState<{
    exercises: string;
    date: Date;
  } | null>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(true);

  // AI Chat functionality
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    api: generateAPIUrl('/api/ai/chat'),
    onError: (error) => {
      console.error('Chat error:', error);
    },
    initialMessages: [
      {
        id: 'system',
        role: 'system',
        content: `You are a fitness AI assistant for the GetMaximumFit app. Help users with workout advice, exercise form, nutrition tips, and motivation. Keep responses concise and actionable for mobile users. User's name is ${userName || 'there'}.`,
      },
    ],
  });

  // Fetch last workout from Firestore
  const fetchLastWorkout = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingWorkout(true);
      
      // Query the workouts subcollection for the user, ordered by date (newest first)
      const workoutsRef = collection(db, 'profiles', user.uid, 'workouts');
      const workoutsQuery = query(
        workoutsRef,
        orderBy('date', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(workoutsQuery);
      
      if (!querySnapshot.empty) {
        const workoutDoc = querySnapshot.docs[0];
        const workoutData = workoutDoc.data();
        
        // Handle date as string (convert to Date object)
        let workoutDate = new Date();
        if (workoutData.date) {
          if (typeof workoutData.date === 'string') {
            // For date strings in "YYYY-MM-DD" format, parse as local date
            if (workoutData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Split the date string and create a local date
              const [year, month, day] = workoutData.date.split('-').map(Number);
              workoutDate = new Date(year, month - 1, day); // month is 0-indexed
            } else {
              // For other date formats, use standard parsing
              workoutDate = new Date(workoutData.date);
            }
          } else if (workoutData.date.toDate) {
            // Handle Firebase Timestamp if it exists
            workoutDate = workoutData.date.toDate();
          }
        }
        
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

  // Handle authentication state changes
  useEffect(() => {
    if (!user) {
      // User is no longer logged in, redirect to login
      console.log('User logged out, redirecting to login...');
      router.replace('/login/loginScreen');
    } else {
      // User is logged in, fetch their last workout
      fetchLastWorkout();
    }
  }, [user, router, fetchLastWorkout]);

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
        <ThemedText type="subtitle">Today&apos;s Plan</ThemedText>
        <ThemedText>
          {`You have no scheduled workouts for today. Tap here to add one to your calendar.`}
        </ThemedText>
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
          {messages.filter(m => m.role !== 'system').length > 0 && (
            <View style={styles.messagesContainer}>
              {messages.filter(m => m.role !== 'system').slice(-2).map((message) => (
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
            </View>
          )}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.chatInput}
              value={input}
              onChangeText={(text) => 
                handleInputChange({
                  target: { value: text }
                } as React.ChangeEvent<HTMLInputElement>)
              }
              placeholder="Ask me about fitness, workouts, or nutrition..."
              placeholderTextColor="#666666"
              multiline
              onSubmitEditing={(e) => {
                handleSubmit(e as any);
                e.preventDefault();
              }}
            />
            <TouchableOpacity 
              style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.sendButtonText}>Send</ThemedText>
              )}
            </TouchableOpacity>
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
    minHeight: 200,
  },
  messagesContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  messageBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
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
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
});
