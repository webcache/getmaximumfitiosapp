// firebase.ts
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - use direct config for development builds
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
// This prevents "Firebase App named '[DEFAULT]' already exists" errors
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Export the initialized instances
export { auth, db };
