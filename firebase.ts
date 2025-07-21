import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Validate env
const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.warn('Missing environment variables detected:', missingEnvVars);
}

// Initialize app
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth - Create minimal persistence to satisfy Firebase while keeping custom token management
let auth: Auth;
try {
  // Try to satisfy Firebase v11's React Native persistence requirement
  // This won't interfere with your custom token system in AuthContext
  auth = initializeAuth(app, {
    persistence: {
      type: 'LOCAL',
      _isAvailable() { return Promise.resolve(true); },
      _set(key: string, value: any) { 
        // Use AsyncStorage for Firebase's internal needs only
        return AsyncStorage.setItem(`firebase_${key}`, JSON.stringify(value)); 
      },
      _get(key: string) { 
        return AsyncStorage.getItem(`firebase_${key}`).then(v => v ? JSON.parse(v) : null); 
      },
      _remove(key: string) { 
        return AsyncStorage.removeItem(`firebase_${key}`); 
      }
    } as any
  });
} catch (error) {
  // Fallback if app already initialized  
  console.warn('Auth already initialized, using getAuth');
  auth = getAuth(app);
}

// Initialize Firestore
const db: Firestore = getFirestore(app);

// Export
export { app, auth, db };
