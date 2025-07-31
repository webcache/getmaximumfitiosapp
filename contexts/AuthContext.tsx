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
  const [oauthInProgress, setOauthInProgress] = useState(false);

  // Google OAuth configuration
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'com.googleusercontent.apps.424072992557-1iehcohe1bkudsr6qk4r85u13t9loa5o',
  });

  console.log('🔥 AuthContext: Redirect URI:', redirectUri);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  // Handle Google OAuth response
  useEffect(() => {
    console.log('🔥 AuthContext: OAuth response changed:', response);
    
    if (response?.type === 'success') {
      console.log('🔥 AuthContext: OAuth success, processing authorization code...');
      const { code } = response.params;
      if (code) {
        // Exchange authorization code for access token
        AuthSession.exchangeCodeAsync(
          {
            clientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!,
            code,
            redirectUri,
            extraParams: {
              code_verifier: request?.codeVerifier || '',
            },
          },
          discovery
        )
          .then(async (tokenResponse) => {
            console.log('🔥 AuthContext: Token exchange successful:', tokenResponse);
            const { accessToken, idToken } = tokenResponse;
            if (idToken) {
              const credential = GoogleAuthProvider.credential(idToken);
              await signInWithCredential(auth, credential);
              console.log('🔥 AuthContext: Google sign-in successful');
            } else if (accessToken) {
              // Fallback: use access token to get user info and create credential
              console.log('🔥 AuthContext: Using access token for authentication');
              const credential = GoogleAuthProvider.credential(null, accessToken);
              await signInWithCredential(auth, credential);
              console.log('🔥 AuthContext: Google sign-in successful with access token');
            } else {
              console.error('🔥 AuthContext: No id_token or access_token in token response');
            }
          })
          .catch((error) => {
            console.error('🔥 AuthContext: Token exchange error:', error);
          })
          .finally(() => {
            setOauthInProgress(false);
          });
      } else {
        console.error('🔥 AuthContext: No authorization code in response');
        setOauthInProgress(false);
      }
    } else if (response?.type === 'error') {
      console.error('🔥 AuthContext: OAuth error:', response.error);
      setOauthInProgress(false);
    } else if (response?.type === 'cancel') {
      console.log('🔥 AuthContext: OAuth cancelled by user');
      setOauthInProgress(false);
    }
  }, [response, request]);

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
      if (oauthInProgress) {
        console.log('🔥 AuthContext: OAuth already in progress, skipping...');
        return;
      }

      console.log('🔥 AuthContext: Starting Google sign-in');
      console.log('🔥 AuthContext: Google Client ID:', process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
      console.log('🔥 AuthContext: Redirect URI:', redirectUri);
      console.log('🔥 AuthContext: Request object:', request);
      
      if (!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
        throw new Error('Google iOS Client ID is not configured');
      }

      if (!request) {
        throw new Error('OAuth request not initialized');
      }
      
      setOauthInProgress(true);
      const result = await promptAsync();
      console.log('🔥 AuthContext: OAuth result:', result);
    } catch (error) {
      console.error('🔥 AuthContext: Google sign-in error:', error);
      setOauthInProgress(false);
      throw error;
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
