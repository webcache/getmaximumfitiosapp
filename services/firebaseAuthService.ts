import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    signOut as firebaseSignOut,
    getIdToken,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithCredential,
    Unsubscribe,
    User
} from 'firebase/auth';
import { auth } from '../firebase';
import { store } from '../store';
import {
    clearTokens,
    loadUserProfile,
    persistAuthState,
    resetAuthState,
    restoreAuthState,
    setInitialized,
    setLoading,
    setTokens,
    setUser
} from '../store/authSlice';
import CrashLogger from '../utils/crashLogger';

// Token storage keys for AsyncStorage
const STORAGE_KEYS = {
  ACCESS_TOKEN: '@firebase_access_token',
  REFRESH_TOKEN: '@firebase_refresh_token',
  ID_TOKEN: '@firebase_id_token',
  TOKEN_EXPIRY: '@firebase_token_expiry',
  USER_DATA: '@auth_user',
  USER_PROFILE: '@auth_profile',
  LAST_TOKEN_REFRESH: '@last_token_refresh'
} as const;

// Interface for stored token data
interface StoredTokenData {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiryTime: number;
  userId: string;
  email: string | null;
}

class FirebaseAuthService {
  private unsubscribeAuth: Unsubscribe | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private lastAuthStateChange = 0;
  private authStateChangeCount = 0;
  private profileLoadingTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitializing = false;
  private lastProfileLoadUserId: string | null = null; // Track last user ID for profile loading
  private isProfileLoading = false; // Prevent concurrent profile loading
  
  // Circuit breaker for error loop prevention
  private initializationAttempts = 0;
  private maxInitializationAttempts = 3;
  private lastInitializationError: number = 0;
  private circuitBreakerOpen = false;

  async initialize(): Promise<void> {
    // Circuit breaker - prevent repeated initialization attempts that could cause loops
    const now = Date.now();
    if (this.circuitBreakerOpen && now - this.lastInitializationError < 30000) { // 30 second cooldown
      console.warn('Auth service circuit breaker is open, skipping initialization');
      store.dispatch(setInitialized(true));
      store.dispatch(setLoading(false));
      return Promise.resolve();
    }

    // If already initialized, return immediately
    if (this.isInitialized) {
      return Promise.resolve();
    }

    // If currently initializing, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      console.warn('Firebase auth service is already initializing, returning resolved promise');
      return Promise.resolve();
    }

    // Check if we've exceeded max attempts
    if (this.initializationAttempts >= this.maxInitializationAttempts) {
      console.warn('Max initialization attempts reached, opening circuit breaker');
      this.circuitBreakerOpen = true;
      this.lastInitializationError = now;
      store.dispatch(setInitialized(true));
      store.dispatch(setLoading(false));
      return Promise.resolve();
    }

    this.isInitializing = true;
    this.initializationAttempts++;
    this.initializationPromise = this._initialize();
    
    try {
      await this.initializationPromise;
      // Reset circuit breaker on success
      this.initializationAttempts = 0;
      this.circuitBreakerOpen = false;
    } catch (error) {
      this.lastInitializationError = now;
      console.error(`Auth initialization attempt ${this.initializationAttempts} failed:`, error);
      
      if (this.initializationAttempts >= this.maxInitializationAttempts) {
        this.circuitBreakerOpen = true;
        console.warn('Opening circuit breaker after max attempts');
        store.dispatch(setInitialized(true));
        store.dispatch(setLoading(false));
      }
    } finally {
      this.isInitializing = false;
    }
    
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      CrashLogger.logAuthStep('Firebase auth service initialization started');
      
      // Start loading
      store.dispatch(setLoading(true));

      // First try to restore from our AsyncStorage token cache (Firebase v11 workaround)
      // Use a timeout to prevent hanging
      let tokenRestored = false;
      try {
        const restorePromise = this.restoreUserFromTokens();
        const timeoutPromise = new Promise<User | null>((_, reject) => 
          setTimeout(() => reject(new Error('Token restoration timeout')), 5000)
        );
        
        const result = await Promise.race([restorePromise, timeoutPromise]);
        tokenRestored = !!result;
      } catch (tokenError) {
        CrashLogger.recordError(tokenError as Error, 'TOKEN_RESTORE_ERROR');
        console.warn('Token restoration failed, continuing with normal auth flow:', tokenError);
        tokenRestored = false;
      }
      
      // Also restore Redux persisted auth state with timeout
      try {
        const restoreStatePromise = store.dispatch(restoreAuthState());
        const timeoutPromise = new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('State restoration timeout')), 3000)
        );
        
        await Promise.race([restoreStatePromise, timeoutPromise]);
      } catch (stateError) {
        CrashLogger.recordError(stateError as Error, 'STATE_RESTORE_ERROR');
        console.warn('State restoration failed, continuing with clean state:', stateError);
      }

      // Set up Firebase auth state listener
      this.setupAuthStateListener();

      // Mark as initialized
      this.isInitialized = true;
      store.dispatch(setInitialized(true));
      store.dispatch(setLoading(false));

      CrashLogger.logAuthStep('Firebase auth service initialization completed', { 
        tokenRestored,
        currentUser: auth.currentUser?.uid || 'none'
      });
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
          
          // Enhanced debounce for rapid auth state changes (loop prevention)
          if (currentTime - this.lastAuthStateChange < 1000) { // Increased from 500ms to 1s
            this.authStateChangeCount++;
            if (this.authStateChangeCount > 3) { // Reduced threshold from 5 to 3
              console.warn('Too many rapid auth state changes detected. Preventing loop.', {
                count: this.authStateChangeCount,
                timeSinceLastChange: currentTime - this.lastAuthStateChange
              });
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

            // Save user tokens to AsyncStorage (Firebase v11 workaround) with error handling
            try {
              await Promise.race([
                this.saveUserTokens(firebaseUser),
                new Promise<void>((_, reject) => 
                  setTimeout(() => reject(new Error('Token save timeout')), 3000)
                )
              ]);
            } catch (tokenError) {
              CrashLogger.recordError(tokenError as Error, 'SAVE_TOKENS_ON_AUTH_CHANGE');
              console.warn('Failed to save user tokens (non-critical):', tokenError);
              // Continue execution - this is not critical for auth flow
            }

            // Use debounced profile loading to prevent rapid successive dispatches
            // Only load if user ID has changed or we're not already loading
            if (this.lastProfileLoadUserId !== firebaseUser.uid && !this.isProfileLoading) {
              this.profileLoadingTimeout = setTimeout(async () => {
                try {
                  this.isProfileLoading = true;
                  this.lastProfileLoadUserId = firebaseUser.uid;
                  
                  console.log('🔄 Firebase auth service loading profile for user:', firebaseUser.uid);
                  
                  // Load user profile from Firestore with timeout
                  const profilePromise = store.dispatch(loadUserProfile(firebaseUser.uid));
                  const timeoutPromise = new Promise<void>((_, reject) => 
                    setTimeout(() => reject(new Error('Profile load timeout')), 5000)
                  );

                  const profileResult = await Promise.race([
                    profilePromise,
                    timeoutPromise
                  ]);

                  // Only persist if profile loading succeeded or failed gracefully
                  if (loadUserProfile.fulfilled.match(profileResult) || loadUserProfile.rejected.match(profileResult)) {
                    const state = store.getState();
                    await Promise.race([
                      store.dispatch(persistAuthState({
                        user: state.auth.user,
                        profile: state.auth.userProfile
                      })),
                      new Promise<void>((_, reject) => 
                        setTimeout(() => reject(new Error('Persist state timeout')), 2000)
                    )
                    ]);
                  }
                } catch (profileError) {
                  CrashLogger.recordError(profileError as Error, 'AUTH_PROFILE_LOAD');
                  console.warn('Error loading profile after auth state change (non-critical):', profileError);
                  // Continue - profile loading failure shouldn't break auth
                } finally {
                  this.isProfileLoading = false;
                }
              }, 200); // 200ms delay to debounce
            } else {
              console.log('🔄 Skipping redundant profile load for user:', firebaseUser.uid, 
                         'lastUser:', this.lastProfileLoadUserId, 'isLoading:', this.isProfileLoading);
            }
          } else {
            // User signed out - clear all stored data with timeout protection
            this.lastProfileLoadUserId = null; // Reset profile loading tracking
            this.isProfileLoading = false;
            
            try {
              await Promise.race([
                Promise.all([
                  this.clearStoredTokens(),
                  store.dispatch(persistAuthState({ user: null, profile: null }))
                ]),
                new Promise<void>((_, reject) => 
                  setTimeout(() => reject(new Error('Signout cleanup timeout')), 3000)
                )
              ]);
            } catch (cleanupError) {
              CrashLogger.recordError(cleanupError as Error, 'SIGNOUT_CLEANUP_ERROR');
              console.warn('Error during signout cleanup (continuing):', cleanupError);
              // Force clear tokens even if there was an error
              store.dispatch(clearTokens());
            }
          }
        } catch (error) {
          CrashLogger.recordError(error as Error, 'AUTH_STATE_CHANGE');
          console.error('Error handling auth state change:', error);
          
          // If we're in an error state, try to reset auth state to prevent loops
          if (this.authStateChangeCount > 3) {
            console.warn('Multiple auth state change errors, resetting auth state');
            store.dispatch(resetAuthState());
            store.dispatch(clearTokens());
          }
        }
      },
      (error) => {
        CrashLogger.recordError(error, 'AUTH_STATE_LISTENER_ERROR');
        console.error('Firebase auth state listener error:', error);
        
        // If auth state listener fails, try to reset and prevent loops
        store.dispatch(setLoading(false));
        store.dispatch(setInitialized(true));
      }
    );
  }

  async signOut(): Promise<void> {
    try {
      CrashLogger.logAuthStep('User sign out initiated');
      
      // Clear Redux state first
      store.dispatch(resetAuthState());
      
      // Clear all stored tokens and auth data (comprehensive cleanup)
      await this.clearStoredTokens();
      
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
    this.isInitializing = false;
    this.initializationPromise = null;
    this.authStateChangeCount = 0;
    this.lastAuthStateChange = 0;
    this.lastProfileLoadUserId = null; // Reset profile loading tracking
    this.isProfileLoading = false;
    CrashLogger.logAuthStep('Firebase auth service cleaned up');
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Enhanced token management for Firebase v11 persistence workaround
   */
  async saveUserTokens(user: User): Promise<void> {
    try {
      const idToken = await getIdToken(user, true);
      const refreshToken = user.refreshToken;
      const accessToken = (user as any).accessToken;
      const tokenExpiry = Date.now() + (3600 * 1000); // 1 hour from now
      const lastRefresh = Date.now();

      const tokenData: StoredTokenData = {
        accessToken: accessToken || '',
        refreshToken: refreshToken || '',
        idToken,
        expiryTime: tokenExpiry,
        userId: user.uid,
        email: user.email,
      };

      // Save to AsyncStorage
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, tokenData.accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, tokenData.refreshToken],
        [STORAGE_KEYS.ID_TOKEN, tokenData.idToken],
        [STORAGE_KEYS.TOKEN_EXPIRY, tokenData.expiryTime.toString()],
        [STORAGE_KEYS.LAST_TOKEN_REFRESH, lastRefresh.toString()],
      ]);

      // Update Redux store
      store.dispatch(setTokens({
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        idToken: tokenData.idToken,
        tokenExpiry: tokenData.expiryTime,
        lastRefresh,
      }));

      CrashLogger.logAuthStep('User tokens saved to AsyncStorage', { uid: user.uid });
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SAVE_USER_TOKENS');
      console.error('Error saving user tokens:', error);
      throw error;
    }
  }

  /**
   * Restore user from stored tokens (Firebase v11 persistence workaround)
   */
  async restoreUserFromTokens(): Promise<User | null> {
    try {
      // Add timeout protection to AsyncStorage operations
      const asyncStoragePromise = AsyncStorage.multiGet([
        STORAGE_KEYS.ID_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY,
        STORAGE_KEYS.LAST_TOKEN_REFRESH,
      ]);
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('AsyncStorage timeout')), 3000)
      );
      
      const storedTokens = await Promise.race([asyncStoragePromise, timeoutPromise]);

      const idToken = storedTokens[0][1];
      const refreshToken = storedTokens[1][1];
      const accessToken = storedTokens[2][1];
      const tokenExpiry = storedTokens[3][1] ? parseInt(storedTokens[3][1]) : null;
      const lastRefresh = storedTokens[4][1] ? parseInt(storedTokens[4][1]) : null;

      if (idToken && refreshToken && tokenExpiry) {
        // Check if token is still valid (not expired)
        const now = Date.now();
        const isExpired = now >= tokenExpiry;

        if (!isExpired) {
          // Update Redux store with restored tokens
          store.dispatch(setTokens({
            accessToken,
            refreshToken,
            idToken,
            tokenExpiry,
            lastRefresh,
          }));

          CrashLogger.logAuthStep('User tokens restored from AsyncStorage');
          return auth.currentUser; // Return current Firebase user if available
        } else {
          CrashLogger.logAuthStep('Stored tokens have expired, clearing them');
          // Clear expired tokens but don't throw error
          try {
            await this.clearStoredTokens();
          } catch (clearError) {
            console.warn('Failed to clear expired tokens:', clearError);
          }
        }
      }

      return null;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'RESTORE_USER_FROM_TOKENS');
      console.error('Error restoring user from tokens:', error);
      
      // If AsyncStorage is having issues, clear the Redux token state to avoid inconsistency
      try {
        store.dispatch(clearTokens());
      } catch (reduxError) {
        console.error('Failed to clear Redux tokens after restore error:', reduxError);
      }
      
      return null;
    }
  }

  /**
   * Get current ID token with automatic refresh if needed
   */
  async getCurrentIdToken(forceRefresh: boolean = false): Promise<string | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }

      // Check if we need to refresh based on stored expiry
      if (!forceRefresh) {
        const storedExpiry = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
        if (storedExpiry) {
          const expiryTime = parseInt(storedExpiry);
          const now = Date.now();
          const timeUntilExpiry = expiryTime - now;
          
          // Refresh if token expires within 5 minutes
          if (timeUntilExpiry < 5 * 60 * 1000) {
            forceRefresh = true;
          }
        }
      }

      if (forceRefresh && auth.currentUser) {
        // Force refresh and save new token
        const freshIdToken = await getIdToken(auth.currentUser, true);
        await this.saveUserTokens(currentUser);
        return freshIdToken;
      } else {
        // Return cached token if available
        const cachedToken = await AsyncStorage.getItem(STORAGE_KEYS.ID_TOKEN);
        return cachedToken || await getIdToken(currentUser, false);
      }
    } catch (error) {
      CrashLogger.recordError(error as Error, 'GET_CURRENT_ID_TOKEN');
      console.error('Error getting current ID token:', error);
      return null;
    }
  }

  /**
   * Clear all stored tokens and auth data (Firebase v11 persistence workaround)
   */
  private async clearStoredTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ID_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY,
        STORAGE_KEYS.LAST_TOKEN_REFRESH,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_PROFILE,
      ]);
      
      // Clear Redux tokens
      store.dispatch(clearTokens());
      
      CrashLogger.logAuthStep('All stored tokens cleared');
    } catch (error) {
      CrashLogger.recordError(error as Error, 'CLEAR_STORED_TOKENS');
      console.error('Error clearing stored tokens:', error);
    }
  }

  /**
   * Handle Google Sign-In credentials (Firebase v11 workaround)
   */
  async handleGoogleSignInCredentials(idToken: string, accessToken: string): Promise<User> {
    try {
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // Save tokens immediately after successful sign-in
      await this.saveUserTokens(user);

      CrashLogger.logAuthStep('Google Sign-In credentials handled successfully', { uid: user.uid });
      return user;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'GOOGLE_SIGNIN_CREDENTIALS');
      throw error;
    }
  }

  /**
   * Check if user is authenticated with valid tokens
   */
  async isUserAuthenticated(): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return false;
      }

      // Check if we have valid stored tokens
      const tokenExpiry = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      if (tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const now = Date.now();
        return now < expiryTime;
      }

      // If no stored expiry, try to get fresh token
      try {
        const freshToken = await getIdToken(currentUser, true);
        if (freshToken) {
          await this.saveUserTokens(currentUser);
          return true;
        }
      } catch (tokenError) {
        CrashLogger.recordError(tokenError as Error, 'TOKEN_VALIDATION');
      }

      return false;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'IS_USER_AUTHENTICATED');
      return false;
    }
  }

  /**
   * Get comprehensive authentication status
   */
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    hasValidToken: boolean;
    user: User | null;
    tokenExpiry: number | null;
    needsRefresh: boolean;
  }> {
    try {
      const currentUser = auth.currentUser;
      const isAuthenticated = !!currentUser;
      
      if (!isAuthenticated) {
        return {
          isAuthenticated: false,
          hasValidToken: false,
          user: null,
          tokenExpiry: null,
          needsRefresh: false,
        };
      }

      // Check token expiry
      const tokenExpiry = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      const expiryTime = tokenExpiry ? parseInt(tokenExpiry) : null;
      const now = Date.now();
      
      // Token is valid if it exists and hasn't expired
      const hasValidToken = expiryTime ? now < expiryTime : false;
      
      // Needs refresh if token expires within 5 minutes
      const needsRefresh = expiryTime ? (expiryTime - now) < (5 * 60 * 1000) : true;

      return {
        isAuthenticated,
        hasValidToken,
        user: currentUser,
        tokenExpiry: expiryTime,
        needsRefresh,
      };
    } catch (error) {
      CrashLogger.recordError(error as Error, 'GET_AUTH_STATUS');
      return {
        isAuthenticated: false,
        hasValidToken: false,
        user: null,
        tokenExpiry: null,
        needsRefresh: false,
      };
    }
  }

  /**
   * Reset the auth service to a clean state (emergency recovery)
   */
  async reset(): Promise<void> {
    try {
      console.warn('Resetting Firebase auth service to clean state');
      
      // Cleanup current state
      this.cleanup();
      
      // Clear all stored data
      await this.clearStoredTokens();
      
      // Reset Redux state
      store.dispatch(resetAuthState());
      store.dispatch(clearTokens());
      store.dispatch(setInitialized(false));
      store.dispatch(setLoading(false));
      
      // Reset circuit breaker
      this.initializationAttempts = 0;
      this.circuitBreakerOpen = false;
      this.lastInitializationError = 0;
      
      CrashLogger.logAuthStep('Auth service reset completed');
    } catch (error) {
      console.error('Error during auth service reset:', error);
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();
