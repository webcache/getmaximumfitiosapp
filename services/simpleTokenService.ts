import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { store } from '../store';
import { clearTokens, setTokens } from '../store/authActions';
import CrashLogger from '../utils/crashLogger';

export interface TokenData {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  lastRefresh: number;
}

interface FirestoreTokenData extends TokenData {
  deviceId: string;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
}

/**
 * Simple Token Service using in-memory storage + Firestore
 * No SecureStore dependency - works in Expo Go simulator
 */
class SimpleTokenService {
  private static instance: SimpleTokenService;
  private deviceId: string | null = null;
  private inMemoryTokens: TokenData | null = null;

  static getInstance(): SimpleTokenService {
    if (!SimpleTokenService.instance) {
      SimpleTokenService.instance = new SimpleTokenService();
    }
    return SimpleTokenService.instance;
  }

  /**
   * Get or generate a unique device ID for token management
   */
  private async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    // Generate a session-based device ID
    this.deviceId = `expo_go_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('📱 Using session device ID for Expo Go:', this.deviceId);
    return this.deviceId;
  }

  /**
   * Save tokens to memory and Firestore
   */
  async saveTokens(userId: string, tokens: TokenData): Promise<void> {
    try {
      // 1. Save to memory
      this.inMemoryTokens = tokens;
      console.log('✅ Tokens saved to memory');
      
      // 2. Update Redux store immediately
      store.dispatch(setTokens(tokens));
      console.log('✅ Redux store updated with tokens');
      
      // 3. Save to Firestore for persistence
      await this.saveTokensToFirestore(userId, tokens);
      
      CrashLogger.logAuthStep('Tokens saved successfully', { 
        userId,
        tokenExpiry: new Date(tokens.tokenExpiry).toISOString(),
        storage: 'memory + firestore'
      });
      
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SAVE_TOKENS');
      console.error('Critical error saving tokens:', error);
      throw error;
    }
  }

  /**
   * Load tokens from memory or Firestore
   */
  async loadTokens(userId?: string): Promise<TokenData | null> {
    try {
      // 1. Check memory first
      if (this.inMemoryTokens) {
        const now = Date.now();
        if (this.inMemoryTokens.tokenExpiry && now < this.inMemoryTokens.tokenExpiry) {
          // Update Redux store
          store.dispatch(setTokens(this.inMemoryTokens));
          console.log('✅ Valid tokens restored from memory');
          
          CrashLogger.logAuthStep('Tokens loaded from memory', { 
            userId: userId || 'unknown',
            tokenExpiry: new Date(this.inMemoryTokens.tokenExpiry).toISOString()
          });
          
          return this.inMemoryTokens;
        } else {
          console.log('🚫 Memory tokens expired, clearing them');
          this.inMemoryTokens = null;
        }
      }
      
      // 2. Fallback to Firestore if userId provided
      if (userId) {
        console.log('🔄 Attempting to restore tokens from Firestore...');
        return await this.loadTokensFromFirestore(userId);
      }
      
      console.log('❌ No valid tokens found anywhere');
      return null;
      
    } catch (error) {
      CrashLogger.recordError(error as Error, 'LOAD_TOKENS');
      console.error('Error loading tokens:', error);
      return null;
    }
  }

  /**
   * Save tokens to Firestore for persistence
   */
  private async saveTokensToFirestore(userId: string, tokens: TokenData): Promise<void> {
    try {
      const deviceId = await this.getDeviceId();
      const tokenRef = doc(db, 'userTokens', userId);
      
      const firestoreData: FirestoreTokenData = {
        ...tokens,
        deviceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(tokenRef, firestoreData, { merge: true });
      
      CrashLogger.logAuthStep('Tokens synced to Firestore', { 
        userId, 
        deviceId,
        tokenExpiry: new Date(tokens.tokenExpiry).toISOString()
      });
      
      console.log('✅ Tokens synced to Firestore for persistence');
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SAVE_TOKENS_TO_FIRESTORE');
      console.warn('Firestore sync failed:', error);
      // Don't throw - this might be a network issue
    }
  }

  /**
   * Load tokens from Firestore
   */
  private async loadTokensFromFirestore(userId: string): Promise<TokenData | null> {
    try {
      const tokenRef = doc(db, 'userTokens', userId);
      const tokenDoc = await getDoc(tokenRef);
      
      if (tokenDoc.exists()) {
        const firestoreData = tokenDoc.data() as FirestoreTokenData;
        
        // Check if token is still valid
        const now = Date.now();
        if (firestoreData.tokenExpiry && now < firestoreData.tokenExpiry) {
          const tokens: TokenData = {
            idToken: firestoreData.idToken,
            accessToken: firestoreData.accessToken,
            refreshToken: firestoreData.refreshToken,
            tokenExpiry: firestoreData.tokenExpiry,
            lastRefresh: firestoreData.lastRefresh,
          };
          
          // Save to memory for faster access
          this.inMemoryTokens = tokens;
          
          // Update Redux store
          store.dispatch(setTokens(tokens));
          
          CrashLogger.logAuthStep('Tokens restored from Firestore', { 
            userId,
            tokenExpiry: new Date(tokens.tokenExpiry).toISOString()
          });
          
          console.log('✅ Tokens restored from Firestore backup');
          return tokens;
        } else {
          console.log('🚫 Firestore tokens expired, clearing them');
          await this.clearTokensFromFirestore(userId);
        }
      }
      
      return null;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'LOAD_TOKENS_FROM_FIRESTORE');
      console.warn('Could not load tokens from Firestore:', error);
      return null;
    }
  }

  /**
   * Clear tokens from memory
   */
  private clearLocalTokens(): void {
    this.inMemoryTokens = null;
    console.log('✅ Memory tokens cleared');
  }

  /**
   * Clear tokens from Firestore
   */
  private async clearTokensFromFirestore(userId: string): Promise<void> {
    try {
      const tokenRef = doc(db, 'userTokens', userId);
      await deleteDoc(tokenRef);
      console.log('✅ Firestore tokens cleared');
    } catch (error) {
      console.warn('Could not clear Firestore tokens:', error);
    }
  }

  /**
   * Clear all tokens (memory + Firestore) and Redux state
   */
  async clearAllTokens(userId?: string): Promise<void> {
    try {
      // Clear Redux state
      store.dispatch(clearTokens());
      
      // Clear memory
      this.clearLocalTokens();
      
      // Clear Firestore if userId provided
      if (userId) {
        await this.clearTokensFromFirestore(userId);
      }
      
      CrashLogger.logAuthStep('All tokens cleared', { userId: userId || 'unknown' });
      console.log('✅ All authentication tokens cleared');
    } catch (error) {
      CrashLogger.recordError(error as Error, 'CLEAR_ALL_TOKENS');
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Check if tokens exist and are valid
   */
  async hasValidTokens(): Promise<boolean> {
    try {
      const tokens = await this.loadTokens();
      return tokens !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh tokens if needed (placeholder for future implementation)
   */
  async refreshTokensIfNeeded(tokens: TokenData): Promise<TokenData | null> {
    // Check if tokens need refresh (e.g., expire in next 5 minutes)
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    
    if (tokens.tokenExpiry < fiveMinutesFromNow) {
      console.log('🔄 Tokens need refresh - implement refresh logic here');
      // TODO: Implement token refresh logic with your auth provider
      // For now, return null to indicate tokens need re-authentication
      return null;
    }
    
    return tokens;
  }
}

export default SimpleTokenService;
