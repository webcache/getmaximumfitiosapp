import {
  signOut as firebaseSignOut,
  getIdToken,
  Unsubscribe,
  User
} from 'firebase/auth';
import { auth } from '../firebase';
import { store } from '../store';
import {
  loadUserProfile,
  resetAuthState,
  setInitialized,
  setLoading
} from '../store/authSlice';
import CrashLogger from '../utils/crashLogger';

// DEPRECATED: This service is no longer used for token persistence.
// All token persistence is now handled by SecureTokenService and TokenAuthService.
// This service is kept for backward compatibility but should not be used for new features.

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

  /**
   * DEPRECATED: This method is no longer used.
   * Initialize Firebase Auth listener and restore auth state
   */
  async initialize(): Promise<void> {
    console.log('⚠️ FirebaseAuthService.initialize() called - This service is deprecated');
    
    if (this.isInitialized) {
      console.log('FirebaseAuthService already initialized');
      return;
    }

    if (this.initializationPromise) {
      console.log('FirebaseAuthService initialization in progress');
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * DEPRECATED: Simplified initialization without persistence
   */
  private async performInitialization(): Promise<void> {
    try {
      console.log('🔥 FirebaseAuthService: Starting deprecated initialization...');

      // DEPRECATED: No longer set up auth state listener to avoid conflicts with TokenAuthService
      console.log('⚠️ FirebaseAuthService: Skipping auth state listener setup - TokenAuthService handles auth state');

      // Mark as initialized
      this.isInitialized = true;
      store.dispatch(setInitialized(true));

      console.log('✅ FirebaseAuthService: Deprecated initialization complete');
    } catch (error) {
      console.error('❌ FirebaseAuthService initialization error:', error);
      CrashLogger.recordError(error as Error, 'FirebaseAuthService initialization failed');
      throw error;
    }
  }

  /**
   * DEPRECATED: No longer sets up auth state listener to avoid conflicts
   */
  private setupAuthStateListener(): void {
    console.warn('⚠️ FirebaseAuthService.setupAuthStateListener() called - This is deprecated. TokenAuthService handles auth state.');
    // Do nothing - TokenAuthService handles all auth state management
  }

  /**
   * DEPRECATED: This method should not be used
   */
  async signInWithCredential(credential: any): Promise<void> {
    console.warn('⚠️ FirebaseAuthService.signInWithCredential() called - This service is deprecated. Use TokenAuthService.signInWithGoogle() instead.');
    
    // Do nothing - TokenAuthService handles all authentication
    throw new Error('FirebaseAuthService.signInWithCredential is deprecated. Use TokenAuthService.signInWithGoogle() instead.');
  }

  /**
   * DEPRECATED: Simplified sign out
   */
  async signOut(): Promise<void> {
    console.log('⚠️ FirebaseAuthService.signOut() called - This service is deprecated');
    
    try {
      store.dispatch(setLoading(true));
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      // Clear Redux state
      store.dispatch(resetAuthState());
      
      console.log('✅ FirebaseAuthService: Sign out complete');
    } catch (error) {
      console.error('❌ FirebaseAuthService sign out error:', error);
      throw error;
    } finally {
      store.dispatch(setLoading(false));
    }
  }

  /**
   * DEPRECATED: Get current user token (no persistence)
   */
  async getCurrentUserToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return null;
      }
      
      return await getIdToken(user);
    } catch (error) {
      console.error('❌ FirebaseAuthService get token error:', error);
      return null;
    }
  }

  /**
   * Load user profile from Firestore
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      await store.dispatch(loadUserProfile(userId));
      console.log('✅ FirebaseAuthService: User profile loaded');
    } catch (error) {
      console.error('❌ FirebaseAuthService profile load error:', error);
      // Don't throw - profile loading is non-critical
    }
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
    this.isInitialized = false;
  }

  // === DEPRECATED METHODS - These should not be called ===
  
  async saveTokensToAsyncStorage(): Promise<void> {
    console.warn('⚠️ FirebaseAuthService.saveTokensToAsyncStorage() called - This method is deprecated and does nothing');
  }

  async loadTokensFromAsyncStorage(): Promise<StoredTokenData | null> {
    console.warn('⚠️ FirebaseAuthService.loadTokensFromAsyncStorage() called - This method is deprecated');
    return null;
  }

  async isTokenValid(): Promise<boolean> {
    console.warn('⚠️ FirebaseAuthService.isTokenValid() called - This method is deprecated');
    return false;
  }

  async refreshUserToken(): Promise<string | null> {
    console.warn('⚠️ FirebaseAuthService.refreshUserToken() called - This method is deprecated');
    return null;
  }

  async hasValidCachedCredentials(): Promise<boolean> {
    console.warn('⚠️ FirebaseAuthService.hasValidCachedCredentials() called - This method is deprecated');
    return false;
  }

  // Additional deprecated methods from the original file
  async saveUserTokens(): Promise<void> {
    console.warn('⚠️ FirebaseAuthService.saveUserTokens() called - This method is deprecated');
  }

  async saveUserTokensToFirestore(): Promise<void> {
    console.warn('⚠️ FirebaseAuthService.saveUserTokensToFirestore() called - This method is deprecated');
  }

  async restoreUserFromTokens(): Promise<User | null> {
    console.warn('⚠️ FirebaseAuthService.restoreUserFromTokens() called - This method is deprecated');
    return null;
  }

  async restoreUserFromFirestoreTokens(): Promise<User | null> {
    console.warn('⚠️ FirebaseAuthService.restoreUserFromFirestoreTokens() called - This method is deprecated');
    return null;
  }

  async getCurrentIdToken(): Promise<string | null> {
    console.warn('⚠️ FirebaseAuthService.getCurrentIdToken() called - This method is deprecated');
    return null;
  }

  async handleGoogleSignInCredentials(): Promise<User | null> {
    console.warn('⚠️ FirebaseAuthService.handleGoogleSignInCredentials() called - This method is deprecated');
    return null;
  }

  async isUserAuthenticated(): Promise<boolean> {
    console.warn('⚠️ FirebaseAuthService.isUserAuthenticated() called - This method is deprecated');
    return false;
  }

  async getAuthStatus(): Promise<any> {
    console.warn('⚠️ FirebaseAuthService.getAuthStatus() called - This method is deprecated');
    return { isAuthenticated: false, hasValidToken: false };
  }

  async reset(): Promise<void> {
    console.warn('⚠️ FirebaseAuthService.reset() called - This method is deprecated');
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();
