import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
    AuthCredential,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    signInWithCredential as firebaseSignInWithCredential,
    signOut as firebaseSignOut,
    getAuth,
    User
} from 'firebase/auth';

const auth = getAuth();
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
  unsubscribe = firebaseOnAuthStateChanged(auth, onUserChanged, onError);
  return unsubscribe;
};

/**
 * Signs in with a Firebase credential.
 */
export const signInWithCredential = async (credential: AuthCredential): Promise<User> => {
  console.log('🔑 Signing in with credential via auth service...');
  const userCredential = await firebaseSignInWithCredential(auth, credential);
  return userCredential.user;
};

/**
 * Signs out the current user from Firebase and Google.
 */
export const signOut = async (): Promise<void> => {
  console.log('🚪 Signing out via auth service...');
  await firebaseSignOut(auth);
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
