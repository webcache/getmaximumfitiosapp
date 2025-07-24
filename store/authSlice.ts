import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import CrashLogger from '../utils/crashLogger';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  height?: string;
  weight?: string;
  googleLinked?: boolean;
  appleLinked?: boolean;
  uid: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}

// Serializable user data for Redux (Firebase User is not serializable)
export interface SerializableUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerId: string;
  providerData: Array<{
    providerId: string;
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }>;
}

// Token state for Firebase v11 persistence workaround
interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  tokenExpiry: number | null;
  lastRefresh: number | null;
}

interface AuthState {
  user: SerializableUser | null;
  userProfile: UserProfile | null;
  tokens: TokenState;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  persistenceRestored: boolean;
}

const initialState: AuthState = {
  user: null,
  userProfile: null,
  tokens: {
    accessToken: null,
    refreshToken: null,
    idToken: null,
    tokenExpiry: null,
    lastRefresh: null,
  },
  isAuthenticated: false,
  loading: true,
  error: null,
  initialized: false,
  persistenceRestored: false,
};

// Convert Firebase User to serializable format
const serializeUser = (user: User): SerializableUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
  emailVerified: user.emailVerified,
  providerId: user.providerId,
  providerData: user.providerData.map(provider => ({
    providerId: provider.providerId,
    uid: provider.uid,
    email: provider.email,
    displayName: provider.displayName,
    photoURL: provider.photoURL,
  })),
});

// Async thunk for loading user profile from Firestore
export const loadUserProfile = createAsyncThunk(
  'auth/loadUserProfile',
  async (userUid: string, { rejectWithValue }) => {
    try {
      CrashLogger.logAuthStep('Loading user profile from Firestore', { uid: userUid });
      
      const userDocRef = doc(db, 'users', userUid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile;
        CrashLogger.logAuthStep('User profile loaded successfully');
        return profileData;
      } else {
        CrashLogger.logAuthStep('No user profile found');
        return null;
      }
    } catch (error) {
      CrashLogger.recordError(error as Error, 'LOAD_USER_PROFILE');
      return rejectWithValue((error as Error).message);
    }
  }
);

// Async thunk for creating/updating user profile
export const saveUserProfile = createAsyncThunk(
  'auth/saveUserProfile',
  async ({ user, profileData }: { user: SerializableUser; profileData?: Partial<UserProfile> }, { rejectWithValue }) => {
    try {
      CrashLogger.logAuthStep('Saving user profile to Firestore', { uid: user.uid });
      
      const userDocRef = doc(db, 'users', user.uid);
      
      const profile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        ...profileData,
      };
      
      await setDoc(userDocRef, profile, { merge: true });
      CrashLogger.logAuthStep('User profile saved successfully');
      return profile;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SAVE_USER_PROFILE');
      return rejectWithValue((error as Error).message);
    }
  }
);

// Async thunk for restoring auth state from AsyncStorage
export const restoreAuthState = createAsyncThunk(
  'auth/restoreAuthState',
  async (_, { rejectWithValue }) => {
    try {
      CrashLogger.logAuthStep('Attempting to restore auth state from AsyncStorage');
      
      const storedUser = await AsyncStorage.getItem('@auth_user');
      const storedProfile = await AsyncStorage.getItem('@auth_profile');
      const storedTokens = await AsyncStorage.multiGet([
        '@firebase_id_token',
        '@firebase_refresh_token',
        '@firebase_access_token',
        '@firebase_token_expiry',
        '@last_token_refresh'
      ]);
      
      if (storedUser) {
        const user = JSON.parse(storedUser) as SerializableUser;
        const profile = storedProfile ? JSON.parse(storedProfile) as UserProfile : null;
        
        // Parse token data
        const tokens: TokenState = {
          idToken: storedTokens[0][1],
          refreshToken: storedTokens[1][1],
          accessToken: storedTokens[2][1],
          tokenExpiry: storedTokens[3][1] ? parseInt(storedTokens[3][1]) : null,
          lastRefresh: storedTokens[4][1] ? parseInt(storedTokens[4][1]) : null,
        };
        
        CrashLogger.logAuthStep('Auth state restored from AsyncStorage', { uid: user.uid });
        return { user, profile, tokens };
      }
      
      CrashLogger.logAuthStep('No stored auth state found');
      return null;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'RESTORE_AUTH_STATE');
      return rejectWithValue((error as Error).message);
    }
  }
);

// Async thunk for persisting auth state to AsyncStorage
export const persistAuthState = createAsyncThunk(
  'auth/persistAuthState',
  async ({ user, profile }: { user: SerializableUser | null; profile: UserProfile | null }) => {
    try {
      if (user) {
        await AsyncStorage.setItem('@auth_user', JSON.stringify(user));
        if (profile) {
          await AsyncStorage.setItem('@auth_profile', JSON.stringify(profile));
        }
        CrashLogger.logAuthStep('Auth state persisted to AsyncStorage');
      } else {
        await AsyncStorage.multiRemove(['@auth_user', '@auth_profile']);
        CrashLogger.logAuthStep('Auth state cleared from AsyncStorage');
      }
    } catch (error) {
      CrashLogger.recordError(error as Error, 'PERSIST_AUTH_STATE');
      throw error;
    }
  }
);

// Async thunk for persisting tokens to AsyncStorage
export const persistTokens = createAsyncThunk(
  'auth/persistTokens',
  async (tokens: Partial<TokenState>) => {
    try {
      const tokenEntries: [string, string][] = [];
      
      if (tokens.idToken) tokenEntries.push(['@firebase_id_token', tokens.idToken]);
      if (tokens.refreshToken) tokenEntries.push(['@firebase_refresh_token', tokens.refreshToken]);
      if (tokens.accessToken) tokenEntries.push(['@firebase_access_token', tokens.accessToken]);
      if (tokens.tokenExpiry) tokenEntries.push(['@firebase_token_expiry', tokens.tokenExpiry.toString()]);
      if (tokens.lastRefresh) tokenEntries.push(['@last_token_refresh', tokens.lastRefresh.toString()]);
      
      if (tokenEntries.length > 0) {
        await AsyncStorage.multiSet(tokenEntries);
        CrashLogger.logAuthStep('Tokens persisted to AsyncStorage');
      }
    } catch (error) {
      CrashLogger.recordError(error as Error, 'PERSIST_TOKENS');
      throw error;
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      if (action.payload) {
        state.user = serializeUser(action.payload);
        state.isAuthenticated = true;
        state.error = null;
      } else {
        state.user = null;
        state.userProfile = null;
        state.isAuthenticated = false;
        // Clear tokens when user is null
        state.tokens = {
          accessToken: null,
          refreshToken: null,
          idToken: null,
          tokenExpiry: null,
          lastRefresh: null,
        };
      }
    },
    
    setTokens: (state, action: PayloadAction<Partial<TokenState>>) => {
      state.tokens = { ...state.tokens, ...action.payload };
    },
    
    clearTokens: (state) => {
      state.tokens = {
        accessToken: null,
        refreshToken: null,
        idToken: null,
        tokenExpiry: null,
        lastRefresh: null,
      };
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },
    
    setPersistenceRestored: (state, action: PayloadAction<boolean>) => {
      state.persistenceRestored = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.userProfile) {
        state.userProfile = { ...state.userProfile, ...action.payload };
      }
    },
    
    resetAuthState: (state) => {
      state.user = null;
      state.userProfile = null;
      state.isAuthenticated = false;
      state.error = null;
      state.tokens = {
        accessToken: null,
        refreshToken: null,
        idToken: null,
        tokenExpiry: null,
        lastRefresh: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUserProfile.pending, (state) => {
        state.error = null;
      })
      .addCase(loadUserProfile.fulfilled, (state, action) => {
        state.userProfile = action.payload;
      })
      .addCase(loadUserProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(saveUserProfile.fulfilled, (state, action) => {
        state.userProfile = action.payload;
      })
      .addCase(saveUserProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(restoreAuthState.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.userProfile = action.payload.profile;
          state.tokens = action.payload.tokens;
          state.isAuthenticated = true;
        }
        state.persistenceRestored = true;
      })
      .addCase(restoreAuthState.rejected, (state, action) => {
        state.error = action.payload as string;
        state.persistenceRestored = true;
      })
      .addCase(persistTokens.fulfilled, (state, action) => {
        // Tokens persisted successfully - no state change needed
      })
      .addCase(persistTokens.rejected, (state, action) => {
        console.warn('Failed to persist tokens:', action.error);
      });
  },
});

export const {
  setUser,
  setTokens,
  clearTokens,
  setLoading,
  setInitialized,
  setPersistenceRestored,
  setError,
  clearError,
  updateUserProfile,
  resetAuthState,
} = authSlice.actions;

export default authSlice.reducer;
