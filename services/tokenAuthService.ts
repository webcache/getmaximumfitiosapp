import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
    getAuth,
    onAuthStateChanged,
    User,
} from 'firebase/auth';
import { store } from '../store';
import { setInitialized, setLoading, setUser } from '../store/authSlice';
import CrashLogger from '../utils/crashLogger';
import { clearTokens, getTokens, storeTokens } from './secureTokenStorage';

class TokenAuthService {
  private static instance: TokenAuthService;
  private auth = getAuth();
  private unsubscribeAuth: (() => void) | null = null;
  private isInitializing: boolean = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): TokenAuthService {
    if (!TokenAuthService.instance) {
      TokenAuthService.instance = new TokenAuthService();
    }
    return TokenAuthService.instance;
  }

  public static resetInstance(): void {
    if (TokenAuthService.instance) {
      TokenAuthService.instance.cleanup();
    }
    // @ts-ignore
    TokenAuthService.instance = null;
  }

  /**
   * Initialize the auth service and restore persisted tokens
   */
  async initialize(): Promise<User | null> {
    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      console.log('⏸️ TokenAuthService initialization already in progress');
      return null;
    }

    try {
      this.isInitializing = true;
      console.log('🔄 Initializing TokenAuthService...');
      
      // Set loading state
      store.dispatch(setLoading(true));
      
      // Try to restore tokens from secure storage
      const tokens = await getTokens();
      
      if (tokens) {
        // There's a token, let's try to sign in with it.
        // Note: This is a simplified example. In a real app, you'd
        // likely need to refresh the token with your backend.
        // For now, we'll rely on onAuthStateChanged to handle it.
      }

      if (this.unsubscribeAuth) {
        this.unsubscribeAuth();
      }

      this.unsubscribeAuth = onAuthStateChanged(
        this.auth,
        async (user) => {
          if (user) {
            await storeTokens(user);
            store.dispatch(setUser(user));
          } else {
            store.dispatch(setUser(null));
          }
          store.dispatch(setLoading(false));
          store.dispatch(setInitialized(true));
        },
        (error) => {
          console.error('TokenAuthService: Auth state change error', error);
          store.dispatch(setLoading(false));
          store.dispatch(setInitialized(true));
        }
      );
    } catch (error) {
      console.error('TokenAuthService: Initialization failed', error);
      store.dispatch(setLoading(false));
      store.dispatch(setInitialized(true));
    } finally {
      this.isInitializing = false;
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
      const credential = signInWithCustomToken(auth, idToken);
      const result = await credential;
      const firebaseUser = result.user;
      
      // Update Redux store with Firebase user (it will be serialized internally)
      store.dispatch(setUser(firebaseUser));

      CrashLogger.logAuthStep('Google sign-in completed successfully', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
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
      
      // Clear all stored tokens
      await clearTokens();
      
      // Sign out from Google
      try {
        await GoogleSignin.signOut();
      } catch (googleError) {
        console.warn('Google signOut failed (non-critical):', googleError);
      }
      
      // Sign out from Firebase (but don't rely on it for persistence)
      try {
        await auth.signOut();
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

  cleanup(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
  }
}

export default TokenAuthService;
