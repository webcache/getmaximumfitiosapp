import * as SecureStore from 'expo-secure-store';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { store } from '../store';
import { clearTokens, setTokens } from '../store/authSlice';
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
 * Secure Token Service using expo-secure-store as primary storage
 * and Firestore as backup/sync for cross-device access
 * Gracefully handles when SecureStore is unavailable (e.g., in Expo Go simulator)
 */
class SecureTokenService {
  private static instance: SecureTokenService;
  private deviceId: string | null = null;
  private isSecureStoreAvailable: boolean | null = null;

  // Storage keys for SecureStore only
  private static readonly SECURE_TOKEN_KEY = 'auth_tokens';
  private static readonly DEVICE_ID_KEY = 'device_id';

  static getInstance(): SecureTokenService {
    if (!SecureTokenService.instance) {
      SecureTokenService.instance = new SecureTokenService();
    }
    return SecureTokenService.instance;
  }

  /**
   * Check if SecureStore is available (not available in Expo Go)
   */
  private async checkSecureStoreAvailability(): Promise<boolean> {
    if (this.isSecureStoreAvailable !== null) {
      return this.isSecureStoreAvailable;
    }

    try {
      // Try a simple operation to test availability
      await SecureStore.getItemAsync('__test__');
      this.isSecureStoreAvailable = true;
      console.log('✅ SecureStore is available');
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('ExpoSecureStore') || errorMessage.includes('native module')) {
        this.isSecureStoreAvailable = false;
        console.warn('⚠️ SecureStore not available (using Expo Go?) - falling back to Firestore only');
      } else {
        this.isSecureStoreAvailable = true; // Other errors might be recoverable
      }
    }

    return this.isSecureStoreAvailable;
  }

  /**
   * Get or generate a unique device ID for token management
   */
  private async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    try {
      const isSecureStoreAvailable = await this.checkSecureStoreAvailability();
      
      if (isSecureStoreAvailable) {
        // Try SecureStore
        let deviceId = await SecureStore.getItemAsync(SecureTokenService.DEVICE_ID_KEY);
        
        if (!deviceId) {
          // Generate a new device ID
          deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          CrashLogger.logAuthStep('Generated new device ID', { deviceId });
          
          // Save to SecureStore
          await SecureStore.setItemAsync(SecureTokenService.DEVICE_ID_KEY, deviceId);
        }
        
        this.deviceId = deviceId;
        return deviceId;
      } else {
        // SecureStore not available - generate a session-only device ID
        this.deviceId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('📱 Using session device ID (SecureStore unavailable):', this.deviceId);
        return this.deviceId;
      }
    } catch (error) {
      CrashLogger.recordError(error as Error, 'GET_DEVICE_ID');
      console.warn('Error getting device ID:', error);
      
      // Ultimate fallback
      this.deviceId = `fallback_${Date.now()}`;
      return this.deviceId;
    }
  }

  /**
   * Save tokens to SecureStore (primary) and Firestore (sync)
   */
  async saveTokens(userId: string, tokens: TokenData): Promise<void> {
    try {
      const tokenString = JSON.stringify(tokens);
      const isSecureStoreAvailable = await this.checkSecureStoreAvailability();
      
      // 1. Save to SecureStore if available
      if (isSecureStoreAvailable) {
        try {
          await SecureStore.setItemAsync(SecureTokenService.SECURE_TOKEN_KEY, tokenString);
          console.log('✅ Tokens saved to SecureStore');
        } catch (secureStoreError) {
          console.warn('SecureStore save failed:', secureStoreError);
        }
      } else {
        console.log('📱 SecureStore unavailable - relying on Firestore and Redux only');
      }
      
      // 2. Update Redux store immediately
      store.dispatch(setTokens(tokens));
      console.log('✅ Redux store updated with tokens');
      
      // 3. Save to Firestore for persistence and cross-device sync
      await this.saveTokensToFirestore(userId, tokens);
      
      CrashLogger.logAuthStep('Tokens saved successfully', { 
        userId,
        tokenExpiry: new Date(tokens.tokenExpiry).toISOString(),
        hasSecureStore: isSecureStoreAvailable
      });
      
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SAVE_TOKENS');
      console.error('Critical error saving tokens:', error);
      throw error;
    }
  }

  /**
   * Load tokens from local storage (SecureStore -> Firestore)
   */
  async loadTokens(userId?: string): Promise<TokenData | null> {
    try {
      const isSecureStoreAvailable = await this.checkSecureStoreAvailability();
      
      // 1. Try SecureStore first if available
      let tokenString: string | null = null;
      
      if (isSecureStoreAvailable) {
        try {
          tokenString = await SecureStore.getItemAsync(SecureTokenService.SECURE_TOKEN_KEY);
          if (tokenString) {
            console.log('✅ Tokens found in SecureStore');
          }
        } catch (secureStoreError) {
          console.warn('SecureStore read failed:', secureStoreError);
        }
      }
      
      // 2. Parse and validate local tokens
      if (tokenString) {
        const tokens: TokenData = JSON.parse(tokenString);
        
        // Check if tokens are still valid
        const now = Date.now();
        if (tokens.tokenExpiry && now < tokens.tokenExpiry) {
          // Update Redux store
          store.dispatch(setTokens(tokens));
          console.log('✅ Valid tokens restored from SecureStore');
          
          CrashLogger.logAuthStep('Tokens loaded from SecureStore', { 
            userId: userId || 'unknown',
            tokenExpiry: new Date(tokens.tokenExpiry).toISOString()
          });
          
          return tokens;
        } else {
          console.log('🚫 SecureStore tokens expired, clearing them');
          await this.clearLocalTokens();
        }
      }
      
      // 3. Fallback to Firestore if userId provided
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
   * Save tokens to Firestore for cross-device access (background operation)
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
      
      console.log('✅ Tokens synced to Firestore for cross-device access');
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SAVE_TOKENS_TO_FIRESTORE');
      console.warn('Firestore sync failed (non-critical):', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Load tokens from Firestore (fallback when SecureStore is unavailable)
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
          
          // Save to SecureStore for faster access next time (if available)
          const tokenString = JSON.stringify(tokens);
          try {
            await SecureStore.setItemAsync(SecureTokenService.SECURE_TOKEN_KEY, tokenString);
          } catch (secureStoreError) {
            console.warn('Could not save to SecureStore (probably simulator):', secureStoreError);
          }
          
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
   * Clear tokens from SecureStore
   */
  private async clearLocalTokens(): Promise<void> {
    try {
      const isSecureStoreAvailable = await this.checkSecureStoreAvailability();
      
      if (isSecureStoreAvailable) {
        try {
          await SecureStore.deleteItemAsync(SecureTokenService.SECURE_TOKEN_KEY);
          console.log('✅ SecureStore tokens cleared');
        } catch (secureStoreError) {
          console.warn('Could not clear SecureStore:', secureStoreError);
        }
      } else {
        console.log('📱 SecureStore not available - tokens only in memory/Firestore');
      }
      
    } catch (error) {
      console.warn('Error clearing local tokens:', error);
    }
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
   * Clear all tokens (local + Firestore) and Redux state
   */
  async clearAllTokens(userId?: string): Promise<void> {
    try {
      // Clear Redux state
      store.dispatch(clearTokens());
      
      // Clear local storage
      await this.clearLocalTokens();
      
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

export default SecureTokenService;
