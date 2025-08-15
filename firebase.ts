// Import polyfills FIRST before any Firebase imports
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, initializeFirestore } from 'firebase/firestore';
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
  isDev: typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production',
  platform: (() => {
    try {
      return require('react-native').Platform.OS;
    } catch {
      return 'node';
    }
  })()
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

console.log(`[${new Date().toISOString()}] [FIREBASE] Initializing Firebase app`);

// Initialize app
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
console.log(`[${new Date().toISOString()}] [FIREBASE] Firebase app initialized`);

// Initialize Auth (memory persistence only)
console.log(`[${new Date().toISOString()}] [FIREBASE] Initializing Firebase Auth (memory persistence)`);
const auth: Auth = getAuth(app);
console.log(`[${new Date().toISOString()}] [FIREBASE] Firebase Auth initialized successfully`);

// Initialize Firestore with React Native optimizations
console.log(`[${new Date().toISOString()}] [FIREBASE] Initializing Firestore for React Native`);
const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true, // For React Native
  // Note: IndexedDB persistence is not available in React Native
  // Memory cache is used automatically, which is appropriate for mobile apps
});

console.log(`[${new Date().toISOString()}] [FIREBASE] Firebase initialized successfully`);

// Export
export { app, auth, db };
