import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    User
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useReduxAuth } from '../contexts/ReduxAuthProvider';
import { auth, db } from '../firebase';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { saveUserProfile } from '../store/authSlice';
import { useAppDispatch } from '../store/hooks';

export interface AuthFunctions {
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, profileData?: any) => Promise<User>;
  signOut: () => Promise<void>;
  createUserProfile: (user: User, profileData: any) => Promise<void>;
}

export const useAuthFunctions = (): AuthFunctions => {
  const dispatch = useAppDispatch();
  const authState = useReduxAuth();

  const signIn = async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const signUp = async (email: string, password: string, profileData?: any): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile if additional data provided
    if (profileData) {
      await createUserProfile(user, profileData);
    }

    return user;
  };

  const signOut = async (): Promise<void> => {
    await firebaseAuthService.signOut();
  };

  const createUserProfile = async (user: User, profileData: any): Promise<void> => {
    const profile = {
      id: user.uid,
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString(),
      ...profileData,
    };

    // Save to Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, profile, { merge: true });

    // Update Redux store
    const serializedUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      providerId: user.providerId,
      providerData: user.providerData.map(provider => ({
        providerId: provider.providerId,
        uid: provider.uid,
        email: provider.email,
        displayName: provider.displayName,
        photoURL: provider.photoURL,
      })),
    };

    await dispatch(saveUserProfile({ user: serializedUser, profileData: profile }));
  };

  return {
    signIn,
    signUp,
    signOut,
    createUserProfile,
  };
};
