import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { getUserProviders } from '../utils/socialAuth';

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  height?: string;
  weight?: string;
  googleLinked?: boolean;
  appleLinked?: boolean;
  uid: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  // Add other profile fields as needed
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  saveUserToken: (idToken: string) => Promise<void>;
  restoreUserFromToken: () => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Constants for AsyncStorage
  const ID_TOKEN_KEY = '@firebase_id_token';
  const REFRESH_TOKEN_KEY = '@firebase_refresh_token';

  // Save user tokens to AsyncStorage (Firebase 11+ persistence workaround)
  const saveUserToken = async (idToken: string) => {
    try {
      await AsyncStorage.setItem(ID_TOKEN_KEY, idToken);
      console.log('ID token saved to AsyncStorage');
    } catch (error) {
      console.error('Error saving ID token to AsyncStorage:', error);
    }
  };

  // Restore user session from AsyncStorage
  const restoreUserFromToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(ID_TOKEN_KEY);
      if (storedToken) {
        console.log('Found stored token, restoring session...');
        // The onAuthStateChanged listener will handle setting user state
        // We're just checking if we have a valid token stored
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error restoring user from AsyncStorage:', error);
      return false;
    }
  };

  // Clear stored tokens
  const clearStoredTokens = async () => {
    try {
      await AsyncStorage.multiRemove([ID_TOKEN_KEY, REFRESH_TOKEN_KEY]);
      console.log('Stored tokens cleared from AsyncStorage');
    } catch (error) {
      console.error('Error clearing stored tokens:', error);
    }
  };

  // Load user profile from Firestore
  const loadUserProfile = async (user: User) => {
    try {
      const providers = getUserProviders(user);
      const hasGoogle = providers.includes('google.com');
      const hasApple = providers.includes('apple.com');
      
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        setUserProfile({ 
          id: user.uid, 
          uid: user.uid,
          email: profileData.email || user.email || '',
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          phone: profileData.phone || '',
          height: profileData.height || '',
          weight: profileData.weight || '',
          googleLinked: hasGoogle || profileData.googleLinked || false,
          appleLinked: hasApple || profileData.appleLinked || false,
          displayName: profileData.displayName || user.displayName || '',
          photoURL: profileData.photoURL || user.photoURL || '',
          createdAt: profileData.createdAt || new Date().toISOString(),
          ...profileData 
        } as UserProfile);
        
        // Update Firestore with current provider status if changed
        if (hasGoogle !== profileData.googleLinked || hasApple !== profileData.appleLinked) {
          await setDoc(doc(db, 'profiles', user.uid), {
            ...profileData,
            googleLinked: hasGoogle,
            appleLinked: hasApple,
            email: user.email || profileData.email || '',
            displayName: user.displayName || profileData.displayName || '',
            photoURL: user.photoURL || profileData.photoURL || '',
          }, { merge: true });
        }
      } else {
        // Create basic profile if Firestore document doesn't exist
        const basicProfile: UserProfile = {
          id: user.uid,
          uid: user.uid,
          email: user.email || '',
          firstName: '', // Will be empty until user updates profile
          lastName: '',
          phone: '',
          height: '',
          weight: '',
          googleLinked: hasGoogle,
          appleLinked: hasApple,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        
        // Create profile document in Firestore
        await setDoc(doc(db, 'profiles', user.uid), basicProfile);
        setUserProfile(basicProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to basic profile from auth data
      const providers = getUserProviders(user);
      const fallbackProfile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        email: user.email || '',
        firstName: '',
        lastName: '',
        phone: '',
        height: '',
        weight: '',
        googleLinked: providers.includes('google.com'),
        appleLinked: providers.includes('apple.com'),
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
      };
      setUserProfile(fallbackProfile);
    }
  };

  // Refresh user profile (useful after linking/unlinking accounts)
  const refreshUserProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Check for stored token first
        await restoreUserFromToken();
        
        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) return;

          console.log('Auth state changed:', user ? 'User logged in' : 'User not logged in');
          setUser(user);
          
          if (user) {
            // User is authenticated, save their ID token for persistence
            try {
              const idToken = await user.getIdToken();
              await saveUserToken(idToken);
            } catch (error) {
              console.error('Error getting/saving ID token:', error);
            }

            // Load user profile
            await loadUserProfile(user);
          } else {
            // User is not authenticated, clear stored tokens and profile
            await clearStoredTokens();
            setUserProfile(null);
          }
          
          if (isMounted) {
            setLoading(false);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const unsubscribePromise = initializeAuth();

    return () => {
      isMounted = false;
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await clearStoredTokens();
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signOut: handleSignOut,
    saveUserToken,
    restoreUserFromToken,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
