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
        auth = getAuth();
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
    // Add bridge stabilization delay before Firebase call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const userCredential = await firebaseSignInWithCredential(getAuthInstance(), credential);
    
    // Add stabilization delay after Firebase operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
