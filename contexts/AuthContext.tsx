import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

interface UserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  height?: string;
  weight?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string, profileData?: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  createAccount: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Google OAuth configuration
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
    },
    discovery
  );

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential);
    }
  }, [response]);

  // Listen to auth state changes
  useEffect(() => {
    console.log('🔥 AuthContext: Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log(`🔥 AuthContext: [${new Date().toISOString()}] onAuthStateChanged:`, 
        firebaseUser ? `User: ${firebaseUser.uid} (${firebaseUser.email})` : 'User signed out');
      
      setUser(firebaseUser);
      
      // Clear profile when user signs out
      if (!firebaseUser) {
        console.log('🔥 AuthContext: Clearing user profile');
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Listen to user profile changes (real-time)
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    console.log('🔥 AuthContext: Setting up profile listener for', user.uid);
    
    const profileRef = doc(db, 'profiles', user.uid);
    const unsubscribe = onSnapshot(profileRef, 
      (doc) => {
        if (doc.exists()) {
          console.log('🔥 AuthContext: Profile updated:', doc.data());
          setUserProfile(doc.data() as UserProfile);
        } else {
          console.log('🔥 AuthContext: Creating new profile for', user.uid);
          // Create profile if it doesn't exist
          const newProfile: UserProfile = {
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            email: user.email || '',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          setDoc(profileRef, newProfile);
          setUserProfile(newProfile);
        }
      },
      (error) => {
        console.error('🔥 AuthContext: Profile listener error:', error);
      }
    );

    return unsubscribe;
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      console.log('🔥 AuthContext: Starting Google sign-in');
      await promptAsync();
    } catch (error) {
      console.error('🔥 AuthContext: Google sign-in error:', error);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('🔥 AuthContext: Starting email sign-in');
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('🔥 AuthContext: Email sign-in error:', error);
      throw error;
    }
  };

  const createAccount = async (email: string, password: string, profileData?: Partial<UserProfile>) => {
    try {
      console.log('🔥 AuthContext: Creating account');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // If profile data is provided, create the profile document
      if (profileData && userCredential.user) {
        const profileRef = doc(db, 'profiles', userCredential.user.uid);
        const newProfile = {
          ...profileData,
          email: userCredential.user.email,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await setDoc(profileRef, newProfile);
      }
    } catch (error) {
      console.error('🔥 AuthContext: Account creation error:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('🔥 AuthContext: Starting sign out');
      setLoading(true); // Set loading to true during sign out
      
      // Clear user profile first
      setUserProfile(null);
      
      // Sign out from Firebase
      await signOut(auth);
      
      console.log('🔥 AuthContext: Sign out successful');
    } catch (error) {
      console.error('🔥 AuthContext: Sign out error:', error);
      setLoading(false); // Reset loading on error
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signInWithEmail,
    createAccount,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
