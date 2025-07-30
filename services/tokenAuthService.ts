import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  AuthCredential,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithCredential as firebaseSignInWithCredential,
  signOut as firebaseSignOut,
  getAuth,
  User
} from 'firebase/auth';

// Lazy initialization of auth to avoid calling getAuth() before Firebase is initialized
let auth: ReturnType<typeof getAuth> | null = null;
const getAuthInstance = () => {
    if (!auth) {
        try {
            auth = getAuth();
        } catch (error) {
            console.error('🚨 Failed to get Firebase Auth instance:', error);
            throw new Error('Firebase Auth not available - ensure Firebase is properly initialized');
        }
    }
    return auth;
};

let unsubscribe: (() => void) | null = null;

/**
 * Sets up a listener for Firebase authentication state changes.
 * This is the core of the auth system.
 * @param onUserChanged The function to call when the auth state changes.
 * @param onError The function to call when an error occurs.
 * @returns An unsubscribe function.
 */
export const onAuthStateChanged = (
  onUserChanged: (user: User | null) => void,
  onError: (error: Error) => void
): (() => void) => {
  // Clean up any existing listener before creating a new one to prevent duplicates.
  if (unsubscribe) {
    unsubscribe();
  }
  unsubscribe = firebaseOnAuthStateChanged(getAuthInstance(), onUserChanged, onError);
  return unsubscribe;
};

/**
 * Signs in with a Firebase credential.
 */
export const signInWithCredential = async (credential: AuthCredential): Promise<User> => {
  console.log('🔑 Signing in with credential via auth service...');
  
  try {
    // Production-specific delay multiplier for physical devices
    const PROD_DELAY_MULTIPLIER = __DEV__ ? 1 : 3;
    
    // Enhanced bridge stabilization delay before Firebase call
    await new Promise(resolve => setTimeout(resolve, 300 * PROD_DELAY_MULTIPLIER));
    
    const userCredential = await firebaseSignInWithCredential(getAuthInstance(), credential);
    
    // Extended stabilization delay after Firebase operation for production
    await new Promise(resolve => setTimeout(resolve, 200 * PROD_DELAY_MULTIPLIER));
    
    return userCredential.user;
  } catch (error) {
    console.error('🚨 Firebase signInWithCredential error:', error);
    throw error;
  }
};

/**
 * Signs out the current user from Firebase and Google.
 */
export const signOut = async (): Promise<void> => {
  console.log('🚪 Signing out via auth service...');
  await firebaseSignOut(getAuthInstance());
  await GoogleSignin.signOut();
};

/**
 * Cleans up the auth state listener. Essential for development hot-reloading.
 */
export const cleanupAuthListener = (): void => {
  if (unsubscribe) {
    console.log('🧹 Cleaning up auth state listener.');
    unsubscribe();
    unsubscribe = null;
  }
};
