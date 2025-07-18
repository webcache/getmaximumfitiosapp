// firebase-direct.ts - Temporary file with hardcoded config for troubleshooting
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
