import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  Unsubscribe,
  User
} from 'firebase/auth';
import { auth } from '../firebase';
import { store } from '../store';
import {
  loadUserProfile,
  persistAuthState,
  resetAuthState,
  restoreAuthState,
  setInitialized,
  setLoading,
  setUser
} from '../store/authSlice';
import CrashLogger from '../utils/crashLogger';

class FirebaseAuthService {
  private unsubscribeAuth: Unsubscribe | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private lastAuthStateChange = 0;
  private authStateChangeCount = 0;
  private profileLoadingTimeout: ReturnType<typeof setTimeout> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized || this.initializationPromise) {
      return this.initializationPromise || Promise.resolve();
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      CrashLogger.logAuthStep('Firebase auth service initialization started');
      
      // Start loading
      store.dispatch(setLoading(true));

      // Restore persisted auth state first
      await store.dispatch(restoreAuthState());

      // Set up Firebase auth state listener
      this.setupAuthStateListener();

      // Mark as initialized
      this.isInitialized = true;
      store.dispatch(setInitialized(true));
      store.dispatch(setLoading(false));

      CrashLogger.logAuthStep('Firebase auth service initialization completed');
    } catch (error) {
      CrashLogger.recordError(error as Error, 'AUTH_SERVICE_INIT');
      store.dispatch(setLoading(false));
      store.dispatch(setInitialized(true)); // Still mark as initialized to prevent hanging
      throw error;
    }
  }

  private setupAuthStateListener(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }

    this.unsubscribeAuth = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        try {
          const currentTime = Date.now();
          
          // Debounce rapid auth state changes (potential loop prevention)
          if (currentTime - this.lastAuthStateChange < 500) {
            this.authStateChangeCount++;
            if (this.authStateChangeCount > 5) {
              console.warn('Too many rapid auth state changes detected. Potential loop prevented.');
              return;
            }
          } else {
            this.authStateChangeCount = 0;
          }
          this.lastAuthStateChange = currentTime;

          CrashLogger.logAuthStep('Firebase auth state changed', { 
            uid: firebaseUser?.uid || 'null',
            email: firebaseUser?.email || 'null',
            changeCount: this.authStateChangeCount
          });

          // Update Redux store with current user first
          store.dispatch(setUser(firebaseUser));

          if (firebaseUser) {
            // Clear any existing timeout
            if (this.profileLoadingTimeout) {
              clearTimeout(this.profileLoadingTimeout);
            }

            // Use debounced profile loading to prevent rapid successive dispatches
            this.profileLoadingTimeout = setTimeout(async () => {
              try {
                // Load user profile from Firestore
                const profileResult = await store.dispatch(loadUserProfile(firebaseUser.uid));

                // Only persist if profile loading succeeded or failed gracefully
                if (loadUserProfile.fulfilled.match(profileResult) || loadUserProfile.rejected.match(profileResult)) {
                  const state = store.getState();
                  await store.dispatch(persistAuthState({
                    user: state.auth.user,
                    profile: state.auth.userProfile
                  }));
                }
              } catch (profileError) {
                CrashLogger.recordError(profileError as Error, 'AUTH_PROFILE_LOAD');
                console.warn('Error loading profile after auth state change:', profileError);
              }
            }, 200); // 200ms delay to debounce
          } else {
            // User signed out - clear persisted state immediately
            await store.dispatch(persistAuthState({ user: null, profile: null }));
          }
        } catch (error) {
          CrashLogger.recordError(error as Error, 'AUTH_STATE_CHANGE');
          console.error('Error handling auth state change:', error);
        }
      },
      (error) => {
        CrashLogger.recordError(error, 'AUTH_STATE_LISTENER_ERROR');
        console.error('Firebase auth state listener error:', error);
      }
    );
  }

  async signOut(): Promise<void> {
    try {
      CrashLogger.logAuthStep('User sign out initiated');
      
      // Clear Redux state first
      store.dispatch(resetAuthState());
      
      // Clear AsyncStorage
      await AsyncStorage.multiRemove(['@auth_user', '@auth_profile']);
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      CrashLogger.logAuthStep('User signed out successfully');
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SIGN_OUT_ERROR');
      throw error;
    }
  }

  cleanup(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
    if (this.profileLoadingTimeout) {
      clearTimeout(this.profileLoadingTimeout);
      this.profileLoadingTimeout = null;
    }
    this.isInitialized = false;
    this.initializationPromise = null;
    this.authStateChangeCount = 0;
    this.lastAuthStateChange = 0;
    CrashLogger.logAuthStep('Firebase auth service cleaned up');
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const firebaseAuthService = new FirebaseAuthService();
