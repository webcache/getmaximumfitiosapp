import { router } from 'expo-router';
import { User, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';

interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  height?: string;
  weight?: string;
  // Add other profile fields as needed
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to create user profile from Firebase user data
const createUserProfileFromFirebaseUser = (user: User): UserProfile => {
  let firstName = '';
  let lastName = '';
  
  // Extract name from displayName if available
  if (user.displayName && user.displayName.trim()) {
    const nameParts = user.displayName.trim().split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  }
  
  // If no displayName, try to extract from email
  if (!firstName && user.email) {
    const emailName = user.email.split('@')[0];
    firstName = emailName
      .replace(/[._]/g, ' ')
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return {
    id: user.uid,
    firstName,
    lastName,
    displayName: user.displayName || '',
    email: user.email || '',
    phone: '', // To be filled by user later
    height: '', // To be filled by user later
    weight: '', // To be filled by user later
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // If user just signed in, check if they have a profile
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', firebaseUser.uid));
          
          // If no profile exists, create one
          if (!profileDoc.exists()) {
            console.log('Creating new user profile for:', firebaseUser.email);
            const newProfile = createUserProfileFromFirebaseUser(firebaseUser);
            await setDoc(doc(db, 'profiles', firebaseUser.uid), newProfile, { merge: true });
            console.log('User profile created successfully');
          }
        } catch (error) {
          console.error('Error checking/creating user profile:', error);
        }
      }
      
      setInitialized(true);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && user.uid) {
      // Real-time listener for user profile
      const unsubscribeProfile = onSnapshot(
        doc(db, 'profiles', user.uid),
        (snapshot) => {
          if (snapshot.exists()) {
            setUserProfile({ id: snapshot.id, ...snapshot.data() } as UserProfile);
          } else {
            setUserProfile(null);
          }
        }
      );
      return unsubscribeProfile;
    } else {
      setUserProfile(null);
    }
  }, [user]);

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.replace('/login/loginScreen');
  };

  const value: AuthContextType = {
    user,
    userProfile,
    isAuthenticated: !!user,
    loading,
    initialized,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
