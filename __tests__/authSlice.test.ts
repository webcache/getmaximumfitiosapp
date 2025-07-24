import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import type { SerializableUser, UserProfile } from '../store/authSlice';
import authReducer, {
    clearError,
    clearTokens,
    persistAuthState,
    persistTokens,
    resetAuthState,
    restoreAuthState,
    setError,
    setInitialized,
    setLoading,
    setPersistenceRestored,
    setTokens,
    setUser,
    updateUserProfile
} from '../store/authSlice';

// Mock data
const mockUser: SerializableUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  providerId: 'firebase',
  providerData: [
    {
      providerId: 'password',
      uid: 'test@example.com',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
    },
  ],
};

const mockUserProfile: UserProfile = {
  id: 'test-uid',
  uid: 'test-uid',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '123-456-7890',
  height: '6ft',
  weight: '180lbs',
  googleLinked: false,
  appleLinked: false,
  displayName: 'Test User',
  photoURL: undefined,
  createdAt: '2023-01-01T00:00:00.000Z',
};

const mockTokens = {
  idToken: 'mock-id-token',
  refreshToken: 'mock-refresh-token',
  accessToken: 'mock-access-token',
  tokenExpiry: Date.now() + 3600000,
  lastRefresh: Date.now(),
};

// Helper function to create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
};

describe('authSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth;
      expect(state).toEqual({
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
      });
    });
  });

  describe('Synchronous Actions', () => {
    it('should handle setUser', () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        emailVerified: true,
        providerId: 'firebase',
        providerData: [
          {
            providerId: 'password',
            uid: 'test@example.com',
            email: 'test@example.com',
            displayName: 'Test User',
            photoURL: null,
          },
        ],
      } as any;

      store.dispatch(setUser(mockFirebaseUser));
      const state = store.getState().auth;

      expect(state.user).toBeDefined();
      expect(state.user?.uid).toBe('test-uid');
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should handle setUser with null (logout)', () => {
      // First set a user
      store.dispatch(setUser(mockUser as any));
      
      // Then set to null
      store.dispatch(setUser(null));
      const state = store.getState().auth;

      expect(state.user).toBe(null);
      expect(state.userProfile).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens.idToken).toBe(null);
    });

    it('should handle setTokens', () => {
      store.dispatch(setTokens(mockTokens));
      const state = store.getState().auth;

      expect(state.tokens.idToken).toBe('mock-id-token');
      expect(state.tokens.refreshToken).toBe('mock-refresh-token');
      expect(state.tokens.accessToken).toBe('mock-access-token');
    });

    it('should handle clearTokens', () => {
      store.dispatch(setTokens(mockTokens));
      store.dispatch(clearTokens());
      const state = store.getState().auth;

      expect(state.tokens.idToken).toBe(null);
      expect(state.tokens.refreshToken).toBe(null);
      expect(state.tokens.accessToken).toBe(null);
    });

    it('should handle setLoading', () => {
      store.dispatch(setLoading(false));
      expect(store.getState().auth.loading).toBe(false);
    });

    it('should handle setInitialized', () => {
      store.dispatch(setInitialized(true));
      expect(store.getState().auth.initialized).toBe(true);
    });

    it('should handle setPersistenceRestored', () => {
      store.dispatch(setPersistenceRestored(true));
      expect(store.getState().auth.persistenceRestored).toBe(true);
    });

    it('should handle setError', () => {
      const errorMessage = 'Test error';
      store.dispatch(setError(errorMessage));
      expect(store.getState().auth.error).toBe(errorMessage);
    });

    it('should handle clearError', () => {
      store.dispatch(setError('Test error'));
      store.dispatch(clearError());
      expect(store.getState().auth.error).toBe(null);
    });

    it('should handle updateUserProfile', () => {
      // First set a user profile
      store.dispatch(setUser(mockUser as any));
      const action = { type: 'auth/loadUserProfile/fulfilled', payload: mockUserProfile };
      store.dispatch(action);

      // Then update it
      const updates = { firstName: 'Updated', lastName: 'Name' };
      store.dispatch(updateUserProfile(updates));
      const state = store.getState().auth;

      expect(state.userProfile?.firstName).toBe('Updated');
      expect(state.userProfile?.lastName).toBe('Name');
      expect(state.userProfile?.email).toBe('test@example.com'); // Should retain other fields
    });

    it('should handle resetAuthState', () => {
      // Set some state
      store.dispatch(setUser(mockUser as any));
      store.dispatch(setTokens(mockTokens));
      store.dispatch(setError('Some error'));

      // Reset
      store.dispatch(resetAuthState());
      const state = store.getState().auth;

      expect(state.user).toBe(null);
      expect(state.userProfile).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(null);
      expect(state.tokens.idToken).toBe(null);
    });
  });

  describe('Async Thunks', () => {
    beforeEach(() => {
      // Mock Firestore functions
      const mockGetDoc = jest.fn();
      const mockSetDoc = jest.fn();
      
      jest.doMock('firebase/firestore', () => ({
        doc: jest.fn(),
        getDoc: mockGetDoc,
        setDoc: mockSetDoc,
      }));
    });

    it('should handle loadUserProfile.fulfilled', async () => {
      const action = { type: 'auth/loadUserProfile/fulfilled', payload: mockUserProfile };
      store.dispatch(action);
      
      const state = store.getState().auth;
      expect(state.userProfile).toEqual(mockUserProfile);
    });

    it('should handle loadUserProfile.rejected', async () => {
      const action = { 
        type: 'auth/loadUserProfile/rejected', 
        payload: 'Failed to load profile' 
      };
      store.dispatch(action);
      
      const state = store.getState().auth;
      expect(state.error).toBe('Failed to load profile');
    });

    it('should handle saveUserProfile.fulfilled', async () => {
      const action = { type: 'auth/saveUserProfile/fulfilled', payload: mockUserProfile };
      store.dispatch(action);
      
      const state = store.getState().auth;
      expect(state.userProfile).toEqual(mockUserProfile);
    });

    it('should handle restoreAuthState.fulfilled', async () => {
      const restoredData = {
        user: mockUser,
        profile: mockUserProfile,
        tokens: mockTokens,
      };
      
      const action = { type: 'auth/restoreAuthState/fulfilled', payload: restoredData };
      store.dispatch(action);
      
      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.userProfile).toEqual(mockUserProfile);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.isAuthenticated).toBe(true);
      expect(state.persistenceRestored).toBe(true);
    });

    it('should handle restoreAuthState.rejected', async () => {
      const action = { 
        type: 'auth/restoreAuthState/rejected', 
        payload: 'Failed to restore state' 
      };
      store.dispatch(action);
      
      const state = store.getState().auth;
      expect(state.error).toBe('Failed to restore state');
      expect(state.persistenceRestored).toBe(true);
    });
  });

  describe('AsyncStorage Integration', () => {
    it('should save and restore auth state from AsyncStorage', async () => {
      // Mock AsyncStorage data
      const mockStoredData = {
        user: JSON.stringify(mockUser),
        profile: JSON.stringify(mockUserProfile),
        tokens: [
          ['@firebase_id_token', 'stored-id-token'],
          ['@firebase_refresh_token', 'stored-refresh-token'],
          ['@firebase_access_token', 'stored-access-token'],
          ['@firebase_token_expiry', '1234567890'],
          ['@last_token_refresh', '1234567890'],
        ],
      };

      // Mock AsyncStorage methods
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(mockStoredData.user)
        .mockResolvedValueOnce(mockStoredData.profile);
      
      (AsyncStorage.multiGet as jest.Mock)
        .mockResolvedValueOnce(mockStoredData.tokens);

      // Test restoreAuthState thunk
      const result = await store.dispatch(restoreAuthState() as any);
      
      expect(result.type).toBe('auth/restoreAuthState/fulfilled');
      expect(result.payload.user).toEqual(mockUser);
      expect(result.payload.profile).toEqual(mockUserProfile);
    });

    it('should handle empty AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([]);

      const result = await store.dispatch(restoreAuthState() as any);
      
      expect(result.type).toBe('auth/restoreAuthState/fulfilled');
      expect(result.payload).toBe(null);
    });

    it('should persist tokens to AsyncStorage', async () => {
      const result = await store.dispatch(persistTokens(mockTokens) as any);
      
      expect(result.type).toBe('auth/persistTokens/fulfilled');
      expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
        ['@firebase_id_token', mockTokens.idToken],
        ['@firebase_refresh_token', mockTokens.refreshToken],
        ['@firebase_access_token', mockTokens.accessToken],
        ['@firebase_token_expiry', mockTokens.tokenExpiry.toString()],
        ['@last_token_refresh', mockTokens.lastRefresh.toString()],
      ]);
    });

    it('should persist auth state to AsyncStorage', async () => {
      const result = await store.dispatch(
        persistAuthState({ user: mockUser, profile: mockUserProfile }) as any
      );
      
      expect(result.type).toBe('auth/persistAuthState/fulfilled');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@auth_user', 
        JSON.stringify(mockUser)
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@auth_profile', 
        JSON.stringify(mockUserProfile)
      );
    });

    it('should clear auth state from AsyncStorage on logout', async () => {
      const result = await store.dispatch(
        persistAuthState({ user: null, profile: null }) as any
      );
      
      expect(result.type).toBe('auth/persistAuthState/fulfilled');
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@auth_user', 
        '@auth_profile'
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await store.dispatch(restoreAuthState() as any);
      
      expect(result.type).toBe('auth/restoreAuthState/rejected');
      expect(result.payload).toBe('Storage error');
    });

    it('should handle token persistence errors', async () => {
      (AsyncStorage.multiSet as jest.Mock).mockRejectedValue(new Error('Persist error'));

      const result = await store.dispatch(persistTokens(mockTokens) as any);
      
      expect(result.type).toBe('auth/persistTokens/rejected');
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across multiple actions', () => {
      // Simulate a complete auth flow
      store.dispatch(setLoading(true));
      store.dispatch(setUser(mockUser as any));
      
      const action = { type: 'auth/loadUserProfile/fulfilled', payload: mockUserProfile };
      store.dispatch(action);
      
      store.dispatch(setTokens(mockTokens));
      store.dispatch(setInitialized(true));
      store.dispatch(setPersistenceRestored(true));
      store.dispatch(setLoading(false));

      const state = store.getState().auth;
      
      expect(state.user).toBeDefined();
      expect(state.userProfile).toBeDefined();
      expect(state.isAuthenticated).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(true);
      expect(state.persistenceRestored).toBe(true);
      expect(state.tokens.idToken).toBe('mock-id-token');
    });

    it('should properly reset state on logout', () => {
      // Set authenticated state
      store.dispatch(setUser(mockUser as any));
      store.dispatch(setTokens(mockTokens));
      
      // Logout
      store.dispatch(setUser(null));

      const state = store.getState().auth;
      
      expect(state.user).toBe(null);
      expect(state.userProfile).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens.idToken).toBe(null);
    });
  });
});
