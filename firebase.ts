// Import polyfills FIRST before any Firebase imports
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import './polyfills';
import CrashLogger from './utils/crashLogger';

// Helper function to safely call CrashLogger methods
const safeCrashLog = (method: keyof typeof CrashLogger, ...args: any[]) => {
  try {
    (CrashLogger[method] as any)(...args);
  } catch (logError) {
    console.warn('CrashLogger not available:', logError);
  }
};

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
  safeCrashLog('recordNonFatalError', `Missing Firebase env vars: ${missingEnvVars.join(', ')}`);
}

safeCrashLog('logFirebaseStep', 'Initializing Firebase app', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
});

// Initialize app
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
safeCrashLog('logFirebaseStep', 'Firebase app initialized', { isNewApp: getApps().length === 1 });

// Initialize Auth for React Native
// Note: Auth persistence is now handled via SimpleTokenService + Firestore, not Firebase's built-in persistence
safeCrashLog('logFirebaseStep', 'Initializing Firebase Auth (persistence handled externally)');

let auth: Auth;
try {
  // Import initializeAuth to properly configure memory-only persistence
  const { initializeAuth, browserSessionPersistence } = require('firebase/auth');
  
  if (getApps().length > 0) {
    try {
      auth = getAuth(getApp());
    } catch (getAuthError) {
      // If getAuth fails, initialize with memory-only persistence
      auth = initializeAuth(getApp(), {
        persistence: [browserSessionPersistence] // Memory-only persistence
      });
    }
  } else {
    // Initialize new app with memory-only auth persistence
    const newApp = initializeApp(firebaseConfig);
    auth = initializeAuth(newApp, {
      persistence: [browserSessionPersistence] // Memory-only persistence
    });
  }
} catch (error) {
  // Ultimate fallback
  safeCrashLog('logFirebaseStep', 'Using fallback auth instance', { error: (error as Error).message });
  auth = getAuth();
}

safeCrashLog('logFirebaseStep', 'Firebase Auth initialized successfully');

// Initialize Firestore
safeCrashLog('logFirebaseStep', 'Initializing Firestore');
const db: Firestore = getFirestore(app);
safeCrashLog('logFirebaseStep', 'Firestore initialized successfully');

// Export
export { app, auth, db };
