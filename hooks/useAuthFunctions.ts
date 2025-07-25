import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { loadUserProfile, saveUserProfile } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signInWithGoogle as utilSignInWithGoogle } from '../utils/socialAuth';

export interface AuthFunctions {
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, profileData?: any) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
  createUserProfile: (user: User, profileData: any) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  getCurrentToken: () => Promise<string | null>;
}

export const useAuthFunctions = (): AuthFunctions => {
  const dispatch = useAppDispatch();
  
  // Use individual selectors for optimal performance
  const user = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.auth.userProfile);
  const tokens = useAppSelector((state) => state.auth.tokens);

  const signIn = async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save tokens immediately after sign in (Firebase v11 workaround)
    try {
      await firebaseAuthService.saveUserTokens(user);
    } catch (tokenError) {
      console.warn('Failed to save tokens after email sign in:', tokenError);
      // Don't throw error here as the sign-in itself was successful
    }
    
    return user;
  };

  const signUp = async (email: string, password: string, profileData?: any): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save tokens immediately after sign up (Firebase v11 workaround)
    try {
      await firebaseAuthService.saveUserTokens(user);
    } catch (tokenError) {
      console.warn('Failed to save tokens after email sign up:', tokenError);
    }

    // Create user profile if additional data provided
    if (profileData) {
      await createUserProfile(user, profileData);
    }

    return user;
  };

  const signInWithGoogle = async (): Promise<User> => {
    console.log('Starting Redux-integrated Google Sign-In...');
    const user = await utilSignInWithGoogle();
    
    // DEBUG: Log what Google returns
    console.log('Google Sign-In user object:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      providerData: user.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName,
        email: p.email
      }))
    });
    
    // After successful Google Sign-In, ensure profile exists in Firestore
    try {
      console.log('Creating/updating profile for Google user:', user.uid);
      
      // Improved name extraction logic
      let firstName = '';
      let lastName = '';
      let displayName = user.displayName || '';

      // First try: user.displayName
      if (user.displayName) {
        const nameParts = user.displayName.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        console.log('Extracted from user.displayName:', { firstName, lastName });
      }

      // Fallback: try provider data
      if (!firstName && user.providerData && user.providerData.length > 0) {
        const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
        if (googleProvider && googleProvider.displayName) {
          displayName = googleProvider.displayName;
          const nameParts = googleProvider.displayName.trim().split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          console.log('Extracted from provider data:', { firstName, lastName });
        }
      }

      // Last resort: use email prefix as first name
      if (!firstName && user.email) {
        firstName = user.email.split('@')[0];
        console.log('Using email prefix as firstName:', firstName);
      }

      const profileData = {
        id: user.uid,
        uid: user.uid,
        email: user.email || '',
        displayName,
        photoURL: user.photoURL || '',
        googleLinked: true,
        appleLinked: false,
        firstName,
        lastName,
        phone: '',
        height: '',
        weight: '',
        createdAt: new Date().toISOString(),
      };

      console.log('🔥 Profile data being saved to Firestore:', profileData);
      
      // Check if profile exists
      const userDocRef = doc(db, 'profiles', user.uid);
      await setDoc(userDocRef, profileData, { merge: true }); // Use merge to preserve existing data
      
      console.log('✅ Google Sign-In profile created/updated in Firestore');
      
      // Now immediately read back what we just saved to verify it was saved correctly
      try {
        const savedDoc = await getDoc(userDocRef);
        if (savedDoc.exists()) {
          const savedData = savedDoc.data();
          console.log('✅ Verification: Data actually saved to Firestore:', {
            id: savedData.id,
            uid: savedData.uid,
            firstName: savedData.firstName,
            lastName: savedData.lastName,
            displayName: savedData.displayName,
            email: savedData.email,
            allFields: Object.keys(savedData)
          });
        } else {
          console.error('❌ Verification failed: No document found in Firestore after save');
        }
      } catch (verifyError) {
        console.error('❌ Error verifying saved profile:', verifyError);
      }
      
      // Note: Profile loading is handled automatically by Firebase auth service
      // when auth state changes, so we don't need to manually dispatch loadUserProfile here
      
    } catch (profileError) {
      console.warn('Failed to create/update profile after Google Sign-In:', profileError);
      // Don't throw error here as the sign-in itself was successful
    }
    
    console.log('Google Sign-In completed, user:', user.uid);
    return user;
  };

  const signOut = async (): Promise<void> => {
    await firebaseAuthService.signOut();
  };

  const refreshUserProfile = async (): Promise<void> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log('Refreshing user profile for:', currentUser.uid);
      await dispatch(loadUserProfile(currentUser.uid));
    }
  };

  const refreshTokens = async (): Promise<boolean> => {
    try {
      const newToken = await firebaseAuthService.getCurrentIdToken(true);
      return !!newToken;
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      return false;
    }
  };

  const getCurrentToken = async (): Promise<string | null> => {
    return await firebaseAuthService.getCurrentIdToken();
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
    const userDocRef = doc(db, 'profiles', user.uid);
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
    signInWithGoogle,
    signOut,
    createUserProfile,
    refreshUserProfile,
    refreshTokens,
    getCurrentToken,
  };
};
