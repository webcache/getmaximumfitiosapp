import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { store } from '../store';
import { setTokens, clearTokens } from '../store/authSlice';
import CrashLogger from '../utils/crashLogger';

interface FirestoreTokenData {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  lastRefresh: number;
  deviceId: string;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
}

interface TokenData {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  lastRefresh: number;
}

class FirestoreTokenService {
  private static instance: FirestoreTokenService;
  private deviceId: string | null = null;

  static getInstance(): FirestoreTokenService {
    if (!FirestoreTokenService.instance) {
      FirestoreTokenService.instance = new FirestoreTokenService();
    }
    return FirestoreTokenService.instance;
  }

  /**
   * Get or generate a unique device ID for token management
   */
  private async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    try {
      let deviceId = await AsyncStorage.getItem('@device_id');
      if (!deviceId) {
        // Generate a unique device ID
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('@device_id', deviceId);
        CrashLogger.logAuthStep('Generated new device ID', { deviceId });
      }
      
      this.deviceId = deviceId;
      return deviceId;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'GET_DEVICE_ID');
      // Fallback device ID
      this.deviceId = `fallback_${Date.now()}`;
      return this.deviceId;
    }
  }

  /**
   * Save auth tokens to Firestore for cross-device access
   */
  async saveTokensToFirestore(userId: string, tokens: TokenData): Promise<void> {
    try {
      const deviceId = await this.getDeviceId();
      const tokenRef = doc(db, 'userTokens', userId);
      
      const tokenData: FirestoreTokenData = {
        ...tokens,
        deviceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(tokenRef, tokenData, { merge: true });
      
      // Also save to AsyncStorage as backup
      await this.saveTokensToAsyncStorage(tokens);
      
      // Update Redux store
      store.dispatch(setTokens(tokens));
      
      CrashLogger.logAuthStep('Tokens saved to Firestore and AsyncStorage', { 
        userId, 
        deviceId,
        tokenExpiry: new Date(tokens.tokenExpiry).toISOString()
      });
      
      console.log('✅ Auth tokens persisted to Firestore and local storage');
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SAVE_TOKENS_TO_FIRESTORE');
      console.error('Error saving tokens to Firestore:', error);
      
      // Fallback to AsyncStorage only
      try {
        await this.saveTokensToAsyncStorage(tokens);
        store.dispatch(setTokens(tokens));
        console.log('✅ Auth tokens saved to AsyncStorage (Firestore fallback)');
      } catch (fallbackError) {
        console.error('Failed to save tokens to AsyncStorage fallback:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Load auth tokens from Firestore (with AsyncStorage fallback)
   */
  async loadTokensFromFirestore(userId: string): Promise<TokenData | null> {
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
          
          // Save to AsyncStorage for faster access
          await this.saveTokensToAsyncStorage(tokens);
          
          // Update Redux store
          store.dispatch(setTokens(tokens));
          
          CrashLogger.logAuthStep('Tokens loaded from Firestore', { 
            userId,
            tokenExpiry: new Date(tokens.tokenExpiry).toISOString()
          });
          
          console.log('✅ Auth tokens restored from Firestore');
          return tokens;
        } else {
          CrashLogger.logAuthStep('Firestore tokens expired, clearing them', { userId });
          await this.clearTokensFromFirestore(userId);
        }
      } else {
        CrashLogger.logAuthStep('No tokens found in Firestore, trying AsyncStorage', { userId });
        // Fallback to AsyncStorage
        return await this.loadTokensFromAsyncStorage();
      }
      
      return null;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'LOAD_TOKENS_FROM_FIRESTORE');
      console.warn('Error loading tokens from Firestore, falling back to AsyncStorage:', error);
      
      // Fallback to AsyncStorage
      return await this.loadTokensFromAsyncStorage();
    }
  }

  /**
   * Clear auth tokens from both Firestore and AsyncStorage
   */
  async clearTokensFromFirestore(userId: string): Promise<void> {
    try {
      const tokenRef = doc(db, 'userTokens', userId);
      await deleteDoc(tokenRef);
      
      CrashLogger.logAuthStep('Tokens cleared from Firestore', { userId });
    } catch (error) {
      CrashLogger.recordError(error as Error, 'CLEAR_TOKENS_FROM_FIRESTORE');
      console.warn('Error clearing tokens from Firestore:', error);
    }
    
    // Always clear AsyncStorage and Redux regardless of Firestore result
    await this.clearTokensFromAsyncStorage();
    store.dispatch(clearTokens());
    
    console.log('✅ Auth tokens cleared from all storage locations');
  }

  /**
   * Save tokens to AsyncStorage only
   */
  private async saveTokensToAsyncStorage(tokens: TokenData): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        ['@firebase_id_token', tokens.idToken],
        ['@firebase_access_token', tokens.accessToken],
        ['@firebase_refresh_token', tokens.refreshToken],
        ['@firebase_token_expiry', tokens.tokenExpiry.toString()],
        ['@last_token_refresh', tokens.lastRefresh.toString()],
      ]);
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SAVE_TOKENS_TO_ASYNC_STORAGE');
      throw error;
    }
  }

  /**
   * Load tokens from AsyncStorage only
   */
  private async loadTokensFromAsyncStorage(): Promise<TokenData | null> {
    try {
      const storedTokens = await AsyncStorage.multiGet([
        '@firebase_id_token',
        '@firebase_access_token',
        '@firebase_refresh_token',
        '@firebase_token_expiry',
        '@last_token_refresh',
      ]);

      const idToken = storedTokens[0][1];
      const accessToken = storedTokens[1][1];
      const refreshToken = storedTokens[2][1];
      const tokenExpiry = storedTokens[3][1] ? parseInt(storedTokens[3][1]) : null;
      const lastRefresh = storedTokens[4][1] ? parseInt(storedTokens[4][1]) : null;

      if (idToken && refreshToken && tokenExpiry) {
        // Check if token is still valid
        const now = Date.now();
        if (now < tokenExpiry) {
          const tokens: TokenData = {
            idToken,
            accessToken: accessToken || '',
            refreshToken,
            tokenExpiry,
            lastRefresh: lastRefresh || Date.now(),
          };
          
          // Update Redux store
          store.dispatch(setTokens(tokens));
          
          CrashLogger.logAuthStep('Tokens loaded from AsyncStorage');
          console.log('✅ Auth tokens restored from AsyncStorage');
          return tokens;
        } else {
          CrashLogger.logAuthStep('AsyncStorage tokens expired, clearing them');
          await this.clearTokensFromAsyncStorage();
        }
      }
      
      return null;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'LOAD_TOKENS_FROM_ASYNC_STORAGE');
      console.error('Error loading tokens from AsyncStorage:', error);
      return null;
    }
  }

  /**
   * Clear tokens from AsyncStorage only
   */
  private async clearTokensFromAsyncStorage(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        '@firebase_id_token',
        '@firebase_access_token',
        '@firebase_refresh_token',
        '@firebase_token_expiry',
        '@last_token_refresh',
      ]);
    } catch (error) {
      CrashLogger.recordError(error as Error, 'CLEAR_TOKENS_FROM_ASYNC_STORAGE');
      console.warn('Error clearing tokens from AsyncStorage:', error);
    }
  }

  /**
   * Check if we have valid tokens (from any source)
   */
  async hasValidTokens(userId?: string): Promise<boolean> {
    try {
      // First check Redux state
      const reduxState = store.getState();
      const reduxTokens = reduxState.auth.tokens;
      
      if (reduxTokens.idToken && reduxTokens.tokenExpiry) {
        const now = Date.now();
        if (now < reduxTokens.tokenExpiry) {
          return true;
        }
      }
      
      // If Redux doesn't have valid tokens, try loading from storage
      if (userId) {
        const tokens = await this.loadTokensFromFirestore(userId);
        return tokens !== null;
      } else {
        const tokens = await this.loadTokensFromAsyncStorage();
        return tokens !== null;
      }
    } catch (error) {
      CrashLogger.recordError(error as Error, 'HAS_VALID_TOKENS');
      return false;
    }
  }
}

export const firestoreTokenService = FirestoreTokenService.getInstance();
