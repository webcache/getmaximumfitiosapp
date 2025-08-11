import Constants from 'expo-constants';
import { collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import OpenAI from 'openai';
import { db } from '../firebase';

// Initialize OpenAI client lazily to ensure env vars are available
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    // Get API key from environment variables at runtime
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 
                   Constants.expoConfig?.extra?.OPENAI_API_KEY ||
                   // Fallback to non-public env var for development
                   process.env.OPENAI_API_KEY;

    console.log('🔍 OpenAI API Key resolution:');
    console.log('  - EXPO_PUBLIC_OPENAI_API_KEY exists:', !!process.env.EXPO_PUBLIC_OPENAI_API_KEY);
    console.log('  - Constants.expoConfig?.extra?.OPENAI_API_KEY exists:', !!Constants.expoConfig?.extra?.OPENAI_API_KEY);
    console.log('  - process.env.OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('  - Final apiKey exists:', !!apiKey);
    console.log('  - Environment:', __DEV__ ? 'development' : 'production');

    if (!apiKey) {
      console.error('❌ OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY in your .env file.');
      throw new Error('OpenAI API key is not configured');
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
    const data: Record<string, any[]> = {};
    const collections = [
      'exercises',
      'maxLifts', 
      'workouts',
      'goals',
      'myexercises',
      'favoriteExercises',
      'favoriteWorkouts'
    ];

    for (const name of collections) {
      try {
        const snap = await getDocs(collection(db, 'profiles', uid, name));
        data[name] = snap.docs.map((d) => d.data());
      } catch (error) {
        console.log(`Collection ${name} not found or empty, skipping...`);
        data[name] = [];
      }
    }

    console.log('🔥 User context loaded:', Object.keys(data));

    return [
      {
        role: 'system',
        content: `User data context: ${JSON.stringify(data)}`,
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
    
    // Truncate conversation to keep only recent messages to stay within token limits
    // Keep the last 6 messages (3 user + 3 assistant pairs) to maintain context
    const maxConversationLength = 6;
    const truncatedConversation = conversation.length > maxConversationLength 
      ? conversation.slice(-maxConversationLength)
      : conversation;
    
    // Also limit user context to essential data only
    const truncatedUserContext = userContext.slice(0, 2); // Keep only first 2 context messages
    
    const messages = [systemMessage, ...truncatedUserContext, ...truncatedConversation];
    
    console.log(`📊 Message counts - UserContext: ${truncatedUserContext.length}, Conversation: ${truncatedConversation.length}, Total: ${messages.length}`);
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
export async function cleanupOldChatMessages(uid: string, keepCount: number = 30): Promise<void> {
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
