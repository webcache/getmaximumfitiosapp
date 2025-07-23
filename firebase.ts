import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
// Import AsyncStorage to ensure it's available for Firebase persistence
import CrashLogger from './utils/crashLogger';

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
  CrashLogger.recordNonFatalError(`Missing Firebase env vars: ${missingEnvVars.join(', ')}`);
}

CrashLogger.logFirebaseStep('Initializing Firebase app', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
});

// Initialize app
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
CrashLogger.logFirebaseStep('Firebase app initialized', { isNewApp: getApps().length === 1 });

// Initialize Auth with React Native persistence
// Firebase v11 automatically uses AsyncStorage for persistence in React Native when available
// No need to explicitly configure persistence - it's handled automatically
let auth: Auth;
try {
  CrashLogger.logFirebaseStep('Attempting to initialize Firebase Auth');
  auth = initializeAuth(app);
  CrashLogger.logFirebaseStep('Firebase Auth initialized successfully');
} catch (error) {
  // Auth instance already exists - use getAuth instead
  console.warn('Auth already initialized, using getAuth:', error);
  CrashLogger.logFirebaseStep('Auth already exists, using getAuth', { error: error instanceof Error ? error.message : String(error) });
  auth = getAuth(app);
}

// Initialize Firestore
CrashLogger.logFirebaseStep('Initializing Firestore');
const db: Firestore = getFirestore(app);
CrashLogger.logFirebaseStep('Firestore initialized successfully');

// Export
export { app, auth, db };
