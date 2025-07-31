import { User, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { cacheManager } from '../utils/cacheManager';

// This interface describes the shape of the user profile document stored in Firestore under the "profiles" collection.
// Each document's ID is the user's UID, and its fields match the properties below.
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
  refreshProfile: () => Promise<void>;
  resetProfile: () => Promise<void>; // Add this for debugging
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
  
  // If no displayName, just leave firstName empty - don't extract from email
  // The user can fill it in themselves in the profile screen
  
  const newProfile = {
    id: user.uid,
    firstName,
    lastName,
    displayName: user.displayName || '',
    email: user.email || '',
    phone: '', // To be filled by user later
    height: '', // To be filled by user later
    weight: '', // To be filled by user later
  };
  
  console.log('🏗️ AuthContext: Created new profile from Firebase user:', {
    input: { email: user.email, displayName: user.displayName },
    output: newProfile
  });
  
  return newProfile;
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

      // Only clear state if user signed out
      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setInitialized(true);
        setLoading(false);
        return;
      }

      // Set user
      setUser(firebaseUser);

      try {
        console.log(`🔍 AuthContext: [${timestamp}] Checking for existing profile document...`);
        const profileDoc = await getDoc(doc(db, 'profiles', firebaseUser.uid));
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
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }
        console.log(`🔥 AuthContext: [${timestamp}] Setting up profile listener for UID:`, firebaseUser.uid);
        unsubscribeProfile = onSnapshot(
          doc(db, 'profiles', firebaseUser.uid),
          (snapshot) => {
            const listenerTimestamp = new Date().toISOString();
            console.log(`🔥 AuthContext: [${listenerTimestamp}] Profile snapshot received:`, {
              exists: snapshot.exists(),
              id: snapshot.id,
              data: snapshot.exists() ? snapshot.data() : null
            });              if (snapshot.exists()) {
                const rawData = snapshot.data();
                const profileData = { id: snapshot.id, ...rawData } as UserProfile;
                console.log(`🔥 AuthContext: [${listenerTimestamp}] Profile data loaded:`, profileData);
                setUserProfile(profileData);
                // Update cache manager sync time when we get fresh data
                cacheManager.updateLastSyncTime();
              } else {
              console.log(`⚠️ AuthContext: [${listenerTimestamp}] No profile document found for UID:`, firebaseUser.uid);
              // Do NOT clear userProfile here to avoid race conditions
            }
          },
          (error) => {
            console.error('❌ AuthContext: Error listening to profile:', error);
          }
        );
      } catch (error) {
        console.error(`❌ AuthContext: [${timestamp}] Error checking/creating user profile:`, error);
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
  }, []);

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

  const refreshProfile = async () => {
    if (!user?.uid) {
      console.log('🔄 AuthContext: No user to refresh profile for');
      return;
    }

    try {
      console.log('🔄 AuthContext: Manually refreshing profile for UID:', user.uid);
      
      // Force sync with cache manager
      await cacheManager.forceSyncWithFirestore();
      
      // Manually fetch the latest profile data
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      if (profileDoc.exists()) {
        const rawData = profileDoc.data();
        const profileData = { id: profileDoc.id, ...rawData } as UserProfile;
        console.log('🔄 AuthContext: Manual profile refresh successful:', profileData);
        setUserProfile(profileData);
        cacheManager.updateLastSyncTime();
      } else {
        console.log('🔄 AuthContext: No profile document found during manual refresh');
      }
    } catch (error) {
      console.error('❌ AuthContext: Error during manual profile refresh:', error);
    }
  };

  // Reset profile function for debugging
  const resetProfile = async () => {
    if (!user?.uid) {
      console.log('🔄 AuthContext: No user to reset profile for');
      return;
    }

    try {
      console.log('🔄 AuthContext: Resetting profile for UID:', user.uid);
      // Reset profile data in Firestore
      await setDoc(doc(db, 'profiles', user.uid), {
        firstName: '',
        lastName: '',
        displayName: '',
        email: '',
        phone: '',
        height: '',
        weight: '',
      });
      console.log('✅ AuthContext: Profile reset successful');
      // Optionally, refresh the profile in the context
      refreshProfile();
    } catch (error) {
      console.error('❌ AuthContext: Error during profile reset:', error);
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    isAuthenticated: !!user,
    loading,
    initialized,
    signOut,
    refreshProfile,
    resetProfile, // Add resetProfile to context value
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
