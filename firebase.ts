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

// Log Firebase configuration for debugging (production vs dev differences)
console.log('🔥 Firebase Config Status:', {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
  appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 20)}...` : 'MISSING',
  isDev: __DEV__,
  platform: require('react-native').Platform.OS
});

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
  
  // Production-specific auth initialization with enhanced error handling
  const isProduction = !__DEV__;
  
  console.log('🔐 Initializing Firebase Auth:', {
    isProduction,
    existingApps: getApps().length,
    platform: require('react-native').Platform.OS
  });
  
  if (getApps().length > 0) {
    try {
      auth = getAuth(getApp());
      console.log('✅ Using existing Firebase Auth instance');
    } catch (getAuthError) {
      console.warn('⚠️ getAuth failed, initializing with memory persistence:', getAuthError);
      // If getAuth fails, initialize with memory-only persistence
      auth = initializeAuth(getApp(), {
        persistence: [browserSessionPersistence] // Memory-only persistence
      });
      console.log('✅ Initialized Firebase Auth with memory persistence');
    }
  } else {
    // Initialize new app with memory-only auth persistence
    console.log('🆕 Creating new Firebase app with auth persistence');
    const newApp = initializeApp(firebaseConfig);
    auth = initializeAuth(newApp, {
      persistence: [browserSessionPersistence] // Memory-only persistence
    });
    console.log('✅ New Firebase app created with auth');
  }
  
  // Add production-specific auth state logging
  if (isProduction) {
    auth.onAuthStateChanged((user) => {
      console.log('🔐 Production Auth State Change:', {
        isAuthenticated: !!user,
        uid: user?.uid?.substring(0, 8) + '...' || 'none',
        hasEmail: !!user?.email,
        timestamp: new Date().toISOString()
      });
    });
  }
  
} catch (error) {
  // Ultimate fallback with detailed error logging
  console.error('❌ Firebase Auth initialization failed:', error);
  safeCrashLog('logFirebaseStep', 'Using fallback auth instance', { 
    error: (error as Error).message,
    stack: (error as Error).stack,
    isProduction: !__DEV__
  });
  auth = getAuth();
}

safeCrashLog('logFirebaseStep', 'Firebase Auth initialized successfully');


// Initialize Firestore
safeCrashLog('logFirebaseStep', 'Initializing Firestore');
const db: Firestore = getFirestore(app);
safeCrashLog('logFirebaseStep', 'Firestore initialized successfully');

// Enable Firestore offline persistence
import { enableIndexedDbPersistence } from 'firebase/firestore';
try {
  enableIndexedDbPersistence(db);
  console.log('✅ Firestore offline persistence enabled');
} catch (err) {
  console.warn('⚠️ Could not enable Firestore offline persistence:', err);
}

// Export
export { app, auth, db };
