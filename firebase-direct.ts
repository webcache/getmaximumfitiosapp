// firebase-direct.ts - Temporary file with hardcoded config for troubleshooting
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Import AsyncStorage to ensure it's available for Firebase persistence

// Hardcoded config for troubleshooting
const firebaseConfig = {
  apiKey: "AIzaSyBDkKARs8rm0xIz6loFyrH8QI_M_S6NRbU",
  authDomain: "getmaximumfit.firebaseapp.com",
  databaseURL: "https://getmaximumfit-default-rtdb.firebaseio.com",
  projectId: "getmaximumfit",
  storageBucket: "getmaximumfit.firebasestorage.app",
  messagingSenderId: "424072992557",
  appId: "1:424072992557:web:e2657b967d53d6e79ee5a4",
  measurementId: "G-6M7GMSE26D"
};

// Initialize Firebase - only initialize if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with React Native persistence
// Firebase v11 automatically uses AsyncStorage for persistence in React Native when available
let auth;
try {
  auth = initializeAuth(app);
} catch (error) {
  // Auth instance already exists - use getAuth instead
  console.warn('Auth already initialized in firebase-direct, using getAuth:', error);
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
