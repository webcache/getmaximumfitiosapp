import Constants from 'expo-constants';
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import OpenAI from 'openai';
import { db } from '../firebase';

// Initialize OpenAI client lazily to ensure env vars are available
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    // Get API key from environment variables at runtime
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 
                   Constants.expoConfig?.extra?.OPENAI_API_KEY ||
                   Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY ||
                   // Fallback to non-public env var for development
                   process.env.OPENAI_API_KEY;

    console.log('🔍 OpenAI API Key resolution (enhanced debugging):');
    console.log('  - process.env.EXPO_PUBLIC_OPENAI_API_KEY exists:', !!process.env.EXPO_PUBLIC_OPENAI_API_KEY);
    console.log('  - process.env.EXPO_PUBLIC_OPENAI_API_KEY value preview:', process.env.EXPO_PUBLIC_OPENAI_API_KEY ? process.env.EXPO_PUBLIC_OPENAI_API_KEY.substring(0, 12) + '...' : 'null');
    console.log('  - Constants.expoConfig?.extra?.OPENAI_API_KEY exists:', !!Constants.expoConfig?.extra?.OPENAI_API_KEY);
    console.log('  - Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY exists:', !!Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY);
    console.log('  - process.env.OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('  - Final apiKey exists:', !!apiKey);
    console.log('  - Final apiKey preview:', apiKey ? apiKey.substring(0, 12) + '...' : 'null');
    console.log('  - Environment:', __DEV__ ? 'development' : 'production');
    console.log('  - Constants.expoConfig preview:', Constants.expoConfig ? 'exists' : 'null');

    if (!apiKey) {
      const errorMsg = `OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY in your environment.

Debug Info:
- Environment: ${__DEV__ ? 'development' : 'production'}
- Available env vars: ${Object.keys(process.env).filter(k => k.includes('OPENAI')).join(', ') || 'none'}
- process.env keys count: ${Object.keys(process.env).length}
- Constants.expoConfig exists: ${!!Constants.expoConfig}
- Build type: ${Constants.appOwnership || 'unknown'}`;
      
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    } else {
      console.log('✅ OpenAI API key loaded successfully');
    }

    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for React Native
    });
  }
  
  return openai;
}

export interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const systemMessage: ChatMessage = {
  role: 'system',
  content: `You are a fitness and strength training assistant. Only answer questions related to fitness, workout plans, exercise regimens, and strength training.

When asked to create workout plans or convert workouts to JSON format:
- Always provide valid JSON format with this structure: {"title": "Workout Name", "exercises": [{"name": "Exercise Name", "sets": [{"reps": "10", "weight": "135"}]}]}
- Each exercise should have a name (string) and sets (array of set objects)
- Each set should have reps (string), optional weight (string), and optional notes (string)
- Provide realistic rep ranges and weights
- Include 3-6 exercises per workout typically
- Make titles descriptive (e.g., "Push Day - Chest & Triceps", "Full Body Strength")

Example workout JSON:
{"title": "Push Day - Chest & Triceps", "exercises": [{"name": "Bench Press", "sets": [{"reps": "8", "weight": "135"}, {"reps": "6", "weight": "155"}, {"reps": "4", "weight": "175"}]}, {"name": "Incline Dumbbell Press", "sets": [{"reps": "10", "weight": "50"}, {"reps": "8", "weight": "55"}]}, {"name": "Tricep Dips", "sets": [{"reps": "12", "weight": "bodyweight"}, {"reps": "10", "weight": "bodyweight"}]}]}`,
};

export async function getUserContext(
  uid: string
): Promise<ChatMessage[]> {
  try {
    // Load only essential, summarized user data to avoid token overflow
    const contextData: Record<string, any> = {};
    
    // Load recent workouts (last 5 only)
    try {
      const workoutsRef = collection(db, 'profiles', uid, 'workouts');
      const recentWorkoutsQuery = query(workoutsRef, orderBy('date', 'desc'), limit(5));
      const workoutsSnap = await getDocs(recentWorkoutsQuery);
      contextData.recentWorkouts = workoutsSnap.docs.map(d => {
        const data = d.data();
        return {
          title: data.title,
          date: data.date,
          exerciseCount: data.exercises?.length || 0
        };
      });
    } catch (error) {
      contextData.recentWorkouts = [];
    }

    // Load max lifts (summary only)
    try {
      const maxLiftsRef = collection(db, 'profiles', uid, 'maxLifts');
      const maxLiftsSnap = await getDocs(maxLiftsRef);
      contextData.maxLifts = maxLiftsSnap.docs.map(d => {
        const data = d.data();
        return {
          exercise: data.exerciseName,
          weight: data.weight,
          unit: data.unit || 'lbs'
        };
      }).slice(0, 10); // Limit to top 10 lifts
    } catch (error) {
      contextData.maxLifts = [];
    }

    // Load goals (active ones only)
    try {
      const goalsRef = collection(db, 'profiles', uid, 'goals');
      const goalsSnap = await getDocs(goalsRef);
      contextData.goals = goalsSnap.docs.map(d => {
        const data = d.data();
        return {
          type: data.type,
          description: data.description,
          targetValue: data.targetValue,
          unit: data.unit
        };
      }).slice(0, 5); // Limit to 5 most recent goals
    } catch (error) {
      contextData.goals = [];
    }

    // Load favorite exercises (names only)
    try {
      const favExercisesRef = collection(db, 'profiles', uid, 'favoriteExercises');
      const favExercisesSnap = await getDocs(favExercisesRef);
      contextData.favoriteExercises = favExercisesSnap.docs.map(d => d.data().name).slice(0, 10);
    } catch (error) {
      contextData.favoriteExercises = [];
    }

    console.log('🔥 User context loaded (summarized):', Object.keys(contextData));
    
    // Create a more concise context message
    const contextSummary = `User fitness profile summary:
- Recent workouts: ${contextData.recentWorkouts.length} workouts
- Max lifts: ${contextData.maxLifts.map((lift: any) => `${lift.exercise}: ${lift.weight}${lift.unit}`).join(', ') || 'None recorded'}
- Goals: ${contextData.goals.map((goal: any) => goal.description).join(', ') || 'None set'}
- Favorite exercises: ${contextData.favoriteExercises.join(', ') || 'None saved'}`;

    return [
      {
        role: 'system',
        content: contextSummary,
      },
    ];
  } catch (error) {
    console.error('Error loading user context:', error);
    return [];
  }
}

export async function sendChatMessage(
  conversation: ChatMessage[],
  userContext: ChatMessage[] = []
): Promise<string> {
  try {
    console.log('🤖 Sending chat message to OpenAI with user context');
    
    // Get OpenAI client (this will initialize it if needed)
    const client = getOpenAIClient();
    
    // More aggressive conversation truncation to prevent token overflow
    // Keep only the last 4 messages (2 user + 2 assistant pairs) to maintain context
    const maxConversationLength = 4;
    const truncatedConversation = conversation.length > maxConversationLength 
      ? conversation.slice(-maxConversationLength)
      : conversation;
    
    // Limit user context to essential data only (just the first context message)
    const truncatedUserContext = userContext.slice(0, 1);
    
    const messages = [systemMessage, ...truncatedUserContext, ...truncatedConversation];
    
    console.log(`📊 Message counts - UserContext: ${truncatedUserContext.length}, Conversation: ${truncatedConversation.length}, Total: ${messages.length}`);
    
    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const totalCharacters = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const estimatedTokens = Math.ceil(totalCharacters / 4);
    
    console.log(`🔢 Estimated tokens: ${estimatedTokens} (${totalCharacters} characters)`);
    
    // If still too many tokens, further reduce conversation
    if (estimatedTokens > 15000) {
      console.log('⚠️ Still too many tokens, reducing conversation further');
      const furtherTruncated = conversation.slice(-2); // Keep only last 2 messages
      const reducedMessages = [systemMessage, ...truncatedUserContext, ...furtherTruncated];
      
      const reducedCharacters = reducedMessages.reduce((sum, msg) => sum + msg.content.length, 0);
      const reducedTokens = Math.ceil(reducedCharacters / 4);
      console.log(`🔢 Reduced to: ${reducedTokens} tokens (${reducedCharacters} characters)`);
      
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: reducedMessages,
        max_tokens: 800,
        temperature: 0.7,
      });
      
      const assistantMessage = response.choices[0]?.message?.content;
      
      if (!assistantMessage) {
        throw new Error('No response from OpenAI');
      }

      console.log('✅ OpenAI response received with reduced context');
      return assistantMessage;
    }
    
    console.log('🔑 OpenAI client initialized successfully');
    
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 800, // Increased for workout JSON generation
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0]?.message?.content;
    
    if (!assistantMessage) {
      throw new Error('No response from OpenAI');
    }

    console.log('✅ OpenAI response received with user context');
    return assistantMessage;
  } catch (error) {
    console.error('💥 OpenAI API Error:', error);
    
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('not configured')) {
        throw new Error('OpenAI API key is invalid or missing. Please check your configuration.');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to OpenAI. Please check your internet connection.');
      } else if (error.message.includes('quota') || error.message.includes('billing')) {
        throw new Error('OpenAI quota exceeded. Please check your OpenAI account billing.');
      } else {
        throw new Error(`OpenAI API Error: ${error.message}`);
      }
    }
    
    throw new Error('Unknown error occurred while communicating with OpenAI');
  }
}

// Utility function to clean up old chat messages to prevent token overflow
export async function cleanupOldChatMessages(uid: string, keepCount: number = 20): Promise<void> {
  try {
    const chatMessagesRef = collection(db, 'profiles', uid, 'chatMessages');
    const allMessagesQuery = query(chatMessagesRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(allMessagesQuery);
    
    // If we have more messages than we want to keep, delete the older ones
    if (snapshot.docs.length > keepCount) {
      const docsToDelete = snapshot.docs.slice(keepCount); // Keep first `keepCount`, delete the rest
      
      console.log(`🧹 Cleaning up ${docsToDelete.length} old chat messages for user ${uid}`);
      
      // Delete old messages in batches
      const deletePromises = docsToDelete.map(docSnapshot => 
        deleteDoc(doc(db, 'profiles', uid, 'chatMessages', docSnapshot.id))
      );
      
      await Promise.all(deletePromises);
      console.log(`✅ Cleaned up ${docsToDelete.length} old chat messages`);
    }
  } catch (error) {
    console.error('Error cleaning up old chat messages:', error);
  }
}

// Function to proactively clean up chat history if it's getting too long
export async function autoCleanupChatHistory(uid: string): Promise<void> {
  try {
    const chatMessagesRef = collection(db, 'profiles', uid, 'chatMessages');
    const countQuery = query(chatMessagesRef);
    const snapshot = await getDocs(countQuery);
    
    // If more than 30 messages, clean up to keep only the most recent 15
    if (snapshot.docs.length > 30) {
      console.log(`🧹 Auto-cleanup triggered: ${snapshot.docs.length} messages found`);
      await cleanupOldChatMessages(uid, 15);
    }
  } catch (error) {
    console.error('Error in auto cleanup chat history:', error);
  }
}
