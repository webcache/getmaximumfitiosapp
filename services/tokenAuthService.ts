import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, signOut, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { store } from '../store';
import { clearTokens, setInitialized, setLoading, setUser } from '../store/authSlice';
import CrashLogger from '../utils/crashLogger';
import SimpleTokenService, { TokenData } from './simpleTokenService';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt?: any;
  lastLogin: any;
  authProvider: string;
}

/**
 * Pure token-based authentication service using Redux + SimpleTokenService + Firestore
 * No dependency on Firebase Auth state persistence or SecureStore
 */
class TokenAuthService {
  private static instance: TokenAuthService;
  private simpleTokenService: SimpleTokenService;

  private constructor() {
    this.simpleTokenService = SimpleTokenService.getInstance();
  }

  static getInstance(): TokenAuthService {
    if (!TokenAuthService.instance) {
      TokenAuthService.instance = new TokenAuthService();
    }
    return TokenAuthService.instance;
  }

  /**
   * Initialize the auth service and restore persisted tokens
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 Initializing TokenAuthService...');
      
      // Set loading state
      store.dispatch(setLoading(true));
      
      // Try to restore tokens from secure storage
      const tokens = await this.simpleTokenService.loadTokens();
      
      if (tokens) {
        // Check if tokens need refresh
        const refreshedTokens = await this.simpleTokenService.refreshTokensIfNeeded(tokens);
        
        if (refreshedTokens) {
          console.log('✅ Authentication restored from secure storage');
          store.dispatch(setLoading(false));
          store.dispatch(setInitialized(true));
          return true;
        } else {
          console.log('🔄 Tokens need refresh - user should re-authenticate');
          await this.signOut();
          store.dispatch(setLoading(false));
          store.dispatch(setInitialized(true));
          return false;
        }
      }
      
      console.log('❌ No valid tokens found - user needs to sign in');
      store.dispatch(setLoading(false));
      store.dispatch(setInitialized(true));
      return false;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'AUTH_INITIALIZE');
      console.error('Error initializing auth service:', error);
      store.dispatch(setLoading(false));
      store.dispatch(setInitialized(true));
      return false;
    }
  }

  /**
   * Sign in with Google and store tokens securely
   */
  async signInWithGoogle(): Promise<boolean> {
    try {
      console.log('🔄 Starting Google Sign-In...');
      
      // Check if Google Sign-In is configured
      await GoogleSignin.hasPlayServices();
      
      // Get Google Sign-in result
      const { data } = await GoogleSignin.signIn();
      
      if (!data?.idToken) {
        throw new Error('Google Sign-In failed: No ID token received');
      }
      
      const idToken = data.idToken;
      // Note: Google Sign-in doesn't typically provide accessToken in this flow
      const accessToken = ''; // Will be replaced by Firebase token
      
      console.log('✅ Google Sign-In successful');
      
      // Create Firebase credential and sign in
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const result = await signInWithCredential(auth, credential);
      const firebaseUser = result.user;
      
      // Get Firebase tokens
      const firebaseToken = await firebaseUser.getIdToken();
      const tokenResult = await firebaseUser.getIdTokenResult();
      
      // Create token data
      const tokens: TokenData = {
        idToken: firebaseToken,
        accessToken: accessToken || '',
        refreshToken: firebaseUser.refreshToken,
        tokenExpiry: new Date(tokenResult.expirationTime).getTime(),
        lastRefresh: Date.now(),
      };
      
      // Save tokens securely
      await this.simpleTokenService.saveTokens(firebaseUser.uid, tokens);
      
      // Update user profile in Firestore
      await this.updateUserProfile(firebaseUser);
      
      // Update Redux store with Firebase user (it will be serialized internally)
      store.dispatch(setUser(firebaseUser));
      
      CrashLogger.logAuthStep('Google sign-in completed successfully', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        tokenExpiry: new Date(tokens.tokenExpiry).toISOString()
      });
      
      console.log('✅ Authentication completed successfully');
      return true;
      
    } catch (error) {
      CrashLogger.recordError(error as Error, 'GOOGLE_SIGN_IN');
      console.error('Google Sign-In failed:', error);
      
      // Clean up any partial state
      await this.signOut();
      return false;
    }
  }

  /**
   * Sign out and clear all tokens
   */
  async signOut(): Promise<void> {
    try {
      console.log('🔄 Signing out...');
      
      // Get current user ID before clearing
      const state = store.getState();
      const userId = state.auth.user?.uid;
      
      // Clear Redux state (setUser with null clears the user)
      store.dispatch(setUser(null));
      store.dispatch(clearTokens());
      
      // Clear all stored tokens
      await this.simpleTokenService.clearAllTokens(userId);
      
      // Sign out from Google
      try {
        await GoogleSignin.signOut();
      } catch (googleError) {
        console.warn('Google signOut failed (non-critical):', googleError);
      }
      
      // Sign out from Firebase (but don't rely on it for persistence)
      try {
        await signOut(auth);
      } catch (firebaseError) {
        console.warn('Firebase signOut failed (non-critical):', firebaseError);
      }
      
      CrashLogger.logAuthStep('User signed out successfully', { userId: userId || 'unknown' });
      console.log('✅ Sign out completed');
      
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SIGN_OUT');
      console.error('Error during sign out:', error);
    }
  }

  /**
   * Update user profile in Firestore
   */
  private async updateUserProfile(user: User): Promise<void> {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      const profileData: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        lastLogin: serverTimestamp(),
        authProvider: 'google',
        // Only set createdAt if this is a new user
        ...(userDoc.exists() ? {} : { createdAt: serverTimestamp() })
      };
      
      await setDoc(userRef, profileData, { merge: true });
      
      console.log('✅ User profile updated in Firestore');
    } catch (error) {
      CrashLogger.recordError(error as Error, 'UPDATE_USER_PROFILE');
      console.warn('Failed to update user profile (non-critical):', error);
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.simpleTokenService.hasValidTokens();
  }

  /**
   * Get current authentication status
   */
  getAuthState() {
    return store.getState().auth;
  }

  /**
   * Force refresh tokens (if refresh logic is implemented)
   */
  async refreshTokens(): Promise<boolean> {
    try {
      const currentTokens = await this.simpleTokenService.loadTokens();
      if (!currentTokens) {
        return false;
      }
      
      const refreshedTokens = await this.simpleTokenService.refreshTokensIfNeeded(currentTokens);
      return refreshedTokens !== null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }
}

export default TokenAuthService;
