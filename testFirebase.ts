// Firebase connection test script
import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

// Your Firebase config (from your .env file or app.json)
const firebaseConfig = {
  apiKey: "AIzaSyDJwH5ffYQX4XBgbY1EMJCF6ZEjttbR0OI",
  authDomain: "getmaximumfit.firebaseapp.com",
  databaseURL: "https://getmaximumfit-default-rtdb.firebaseio.com",
  projectId: "getmaximumfit",
  storageBucket: "getmaximumfit.firebasestorage.app",
  messagingSenderId: "424072992557",
  appId: "1:424072992557:ios:46b412dfe393fc119ee5a4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test function
export const testFirebaseConnection = async (userId: string) => {
  try {
    console.log('🔥 Testing Firebase connection...');
    
    // Test 1: Check profile document
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);
    
    console.log('🔍 Profile test:', {
      exists: profileSnap.exists(),
      path: `profiles/${userId}`,
      data: profileSnap.exists() ? profileSnap.data() : null
    });
    
    return {
      profileExists: profileSnap.exists(),
      profileData: profileSnap.exists() ? profileSnap.data() : null
    };
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return { error: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error) };
  }
};

export default testFirebaseConnection;
