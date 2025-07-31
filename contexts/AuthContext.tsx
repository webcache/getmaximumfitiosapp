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
    let unsubscribeProfile: (() => void) | null = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      const timestamp = new Date().toISOString();
      console.log(`🔥 AuthContext: [${timestamp}] onAuthStateChanged triggered:`, firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName } : 'null');
      
      // Clean up any existing profile listener
      if (unsubscribeProfile) {
        console.log(`🔥 AuthContext: [${timestamp}] Cleaning up previous profile listener`);
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      
      if (firebaseUser) {
        // Set user first
        setUser(firebaseUser);
        
        try {
          console.log(`🔍 AuthContext: [${timestamp}] Checking for existing profile document...`);
          const profileDoc = await getDoc(doc(db, 'profiles', firebaseUser.uid));
          
          // Only create profile if it truly doesn't exist
          if (!profileDoc.exists()) {
            console.log(`📝 AuthContext: [${timestamp}] Creating new user profile for:`, firebaseUser.email);
            const newProfile = createUserProfileFromFirebaseUser(firebaseUser);
            console.log(`📝 AuthContext: [${timestamp}] New profile data to save:`, newProfile);
            await setDoc(doc(db, 'profiles', firebaseUser.uid), newProfile);
            console.log(`✅ AuthContext: [${timestamp}] User profile created successfully`);
          } else {
            console.log(`✅ AuthContext: [${timestamp}] Existing profile found - NEVER overwriting`);
            const existingData = profileDoc.data();
            console.log(`✅ AuthContext: [${timestamp}] Existing profile data:`, existingData);
            console.log(`✅ AuthContext: [${timestamp}] Existing profile has firstName:`, `"${existingData?.firstName}"`);
          }
          
          // Set up profile listener for this user
          console.log(`🔥 AuthContext: [${timestamp}] Setting up profile listener for UID:`, firebaseUser.uid);
          unsubscribeProfile = onSnapshot(
            doc(db, 'profiles', firebaseUser.uid),
            (snapshot) => {
              const listenerTimestamp = new Date().toISOString();
              console.log(`🔥 AuthContext: [${listenerTimestamp}] Profile snapshot received:`, {
                exists: snapshot.exists(),
                id: snapshot.id,
                data: snapshot.exists() ? snapshot.data() : null
              });
              
              if (snapshot.exists()) {
                const rawData = snapshot.data();
                const profileData = { id: snapshot.id, ...rawData } as UserProfile;
                console.log(`🔥 AuthContext: [${listenerTimestamp}] Profile data loaded:`, {
                  firstName: profileData.firstName,
                  lastName: profileData.lastName,
                  email: profileData.email
                });
                console.log(`🔥 AuthContext: [${listenerTimestamp}] Setting userProfile state...`);
                setUserProfile(profileData);
              } else {
                console.log(`⚠️ AuthContext: [${listenerTimestamp}] No profile document found for UID:`, firebaseUser.uid);
                // Don't clear userProfile to null here to avoid race conditions
                // setUserProfile(null);
              }
            },
            (error) => {
              console.error('❌ AuthContext: Error listening to profile:', error);
            }
          );
          
        } catch (error) {
          console.error(`❌ AuthContext: [${timestamp}] Error checking/creating user profile:`, error);
        }
      } else {
        // User signed out
        console.log(`🔥 AuthContext: [${timestamp}] User signed out, clearing state`);
        setUser(null);
        setUserProfile(null);
      }
      
      setInitialized(true);
      setLoading(false);
    });

    // Cleanup function
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []); // Empty dependency array - this effect should only run once

  const signOut = async () => {
    console.log('🔥 AuthContext: Signing out user...');
    try {
      await firebaseSignOut(auth);
      // State will be cleared by onAuthStateChanged listener
      console.log('🔥 AuthContext: Sign out completed - letting app/index.tsx handle navigation');
    } catch (error) {
      console.error('❌ AuthContext: Error during sign out:', error);
    }
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
