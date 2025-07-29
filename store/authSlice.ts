import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthCredential, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as secureTokenStorage from '../services/secureTokenStorage';
import * as authService from '../services/tokenAuthService';
import CrashLogger from '../utils/crashLogger';
import { AppDispatch } from './index';
import { serializeTimestamp } from './utils';

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
  lastLogin?: string;
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
        const profileData = userDoc.data();
        
        // Convert any Firestore timestamps to ISO strings for Redux serialization
        const serializedProfile: UserProfile = {
          id: profileData.id || profileData.uid,
          uid: profileData.uid,
          email: profileData.email || '',
          displayName: profileData.displayName || '',
          photoURL: profileData.photoURL || '',
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          height: profileData.height,
          weight: profileData.weight,
          googleLinked: profileData.googleLinked,
          appleLinked: profileData.appleLinked,
          createdAt: serializeTimestamp(profileData.createdAt, true)!,
          lastLogin: serializeTimestamp(profileData.lastLogin) || undefined,
        };
        
        CrashLogger.logAuthStep('User profile loaded successfully');
        console.log('🔥 Redux loadUserProfile - loaded profile data:', {
          id: serializedProfile.id,
          uid: serializedProfile.uid,
          firstName: serializedProfile.firstName,
          lastName: serializedProfile.lastName,
          displayName: serializedProfile.displayName,
          email: serializedProfile.email,
          allFields: Object.keys(serializedProfile)
        });
        return serializedProfile;
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
      
      const existingProfileData = (await getDoc(userDocRef)).data();

      const profile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        // Use existing createdAt if it exists, otherwise set a new one
        createdAt: serializeTimestamp(existingProfileData?.createdAt, true)!,
        // Update lastLogin to now
        lastLogin: new Date().toISOString(),
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

// Async Thunk for app initialization
export const initializeApp = createAsyncThunk<void, void, { dispatch: AppDispatch }>(
  'auth/initializeApp',
  async (_, { dispatch }) => {
    CrashLogger.logAuthStep('Auth: Setting up auth listener...');
    authService.onAuthStateChanged(async (user) => {
      CrashLogger.logAuthStep('Auth: State changed', { uid: user?.uid });
      if (user) {
        // The user object from onAuthStateChanged contains the necessary info.
        // Our service will handle extracting and storing the tokens.
        await secureTokenStorage.storeTokens(user);
        dispatch(setUser(user));
        dispatch(loadUserProfile(user.uid));
      } else {
        await secureTokenStorage.clearTokens();
        dispatch(setUser(null));
      }
      dispatch(setInitialized(true));
    });
  }
);

// Async Thunk for signing in
export const signInWithCredential = createAsyncThunk<SerializableUser, AuthCredential, { dispatch: AppDispatch }>(
  'auth/signInWithCredential',
  async (credential, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));
    try {
      CrashLogger.logAuthStep('Signing in with credential...');
      const user = await authService.signInWithCredential(credential);
      const serializableUser = serializeUser(user);
      await dispatch(saveUserProfile({ user: serializableUser }));
      CrashLogger.logAuthStep('Sign-in successful', { uid: user.uid });
      // The onAuthStateChanged listener will handle setting the user state
      return serializableUser;
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SIGN_IN_WITH_CREDENTIAL');
      return rejectWithValue((error as Error).message);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// Async Thunk for signing out
export const signOutUser = createAsyncThunk<void, void, { dispatch: AppDispatch }>(
  'auth/signOutUser',
  async (_, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));
    try {
      CrashLogger.logAuthStep('Signing out...');
      await authService.signOut();
      // The onAuthStateChanged listener will handle clearing user state.
      // We can also dispatch resetAuthState for immediate UI feedback.
      dispatch(resetAuthState());
      CrashLogger.logAuthStep('Sign-out successful.');
    } catch (error) {
      CrashLogger.recordError(error as Error, 'SIGN_OUT');
      return rejectWithValue((error as Error).message);
    } finally {
      dispatch(setLoading(false));
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
    
    clearAuthTokens: (state) => {
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
      .addCase(signInWithCredential.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signInWithCredential.fulfilled, (state, action) => {
        // User state is set by the listener, but we can stop loading.
        state.loading = false;
      })
      .addCase(signInWithCredential.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(signOutUser.fulfilled, (state) => {
        // State is reset in the thunk and by the listener.
        state.loading = false;
      })
      .addCase(signOutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setUser,
  setTokens,
  clearAuthTokens,
  setLoading,
  setInitialized,
  setPersistenceRestored,
  setError,
  clearError,
  updateUserProfile,
  resetAuthState,
} = authSlice.actions;

export default authSlice.reducer;
