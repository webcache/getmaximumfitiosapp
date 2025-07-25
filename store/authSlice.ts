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
  providerData: (user.providerData || []).map(provider => ({
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
      
      const userDocRef = doc(db, 'profiles', userUid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile;
        CrashLogger.logAuthStep('User profile loaded successfully');
        console.log('🔥 Redux loadUserProfile - loaded profile data:', {
          id: profileData.id,
          uid: profileData.uid,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          displayName: profileData.displayName,
          email: profileData.email,
          allFields: Object.keys(profileData)
        });
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
      
      const userDocRef = doc(db, 'profiles', user.uid);
      
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

// Auth slice (no AsyncStorage persistence - handled by SecureTokenService)
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      if (action.payload) {
        state.user = serializeUser(action.payload);
        state.isAuthenticated = true;
        state.error = null;
        if (__DEV__) {
          console.log('✅ User authenticated and state persisted via Redux AsyncStorage');
        }
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
        if (__DEV__) {
          console.log('✅ User signed out and state cleared from Redux AsyncStorage');
        }
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
