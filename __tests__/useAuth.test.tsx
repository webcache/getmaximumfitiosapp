import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { firebaseAuthService } from '../services/firebaseAuthService';
import type { SerializableUser, UserProfile } from '../store/authSlice';
import authReducer, { setError, setLoading, setUser } from '../store/authSlice';

// Get the mocked service from Jest setup
const mockFirebaseAuthService = firebaseAuthService as jest.Mocked<typeof firebaseAuthService>;

// Test data
const mockUser: SerializableUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  providerId: 'firebase',
  providerData: [],
};

const mockUserProfile: UserProfile = {
  id: 'test-uid',
  uid: 'test-uid',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  displayName: 'Test User',
  createdAt: '2023-01-01T00:00:00.000Z',
};

// Helper to create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
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
        ...initialState,
      },
    },
  });
};

// Helper to render hook with Redux store
const renderWithStore = (store: any) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  
  return renderHook(() => useAuth(), { wrapper });
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('State Access', () => {
    it('should return initial auth state', () => {
      const store = createTestStore();
      const { result } = renderWithStore(store);

      expect(result.current.user).toBe(null);
      expect(result.current.userProfile).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.initialized).toBe(false);
    });

    it('should return authenticated user state', () => {
      const store = createTestStore({
        user: mockUser,
        userProfile: mockUserProfile,
        isAuthenticated: true,
        loading: false,
        initialized: true,
      });
      const { result } = renderWithStore(store);

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.userProfile).toEqual(mockUserProfile);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.initialized).toBe(true);
    });

    it('should return error state', () => {
      const errorMessage = 'Authentication failed';
      const store = createTestStore({
        error: errorMessage,
        loading: false,
      });
      const { result } = renderWithStore(store);

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Actions', () => {
    it('should call firebaseAuthService.signOut on signOut', async () => {
      mockFirebaseAuthService.signOut.mockResolvedValue(undefined);
      
      const store = createTestStore({
        user: mockUser,
        isAuthenticated: true,
      });
      const { result } = renderWithStore(store);

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockFirebaseAuthService.signOut).toHaveBeenCalledTimes(1);
    });

    it('should fallback to Redux reset on signOut error', async () => {
      const signOutError = new Error('Sign out failed');
      mockFirebaseAuthService.signOut.mockRejectedValue(signOutError);
      
      const store = createTestStore({
        user: mockUser,
        isAuthenticated: true,
      });
      const { result } = renderWithStore(store);

      // Spy on console.error to check error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockFirebaseAuthService.signOut).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Sign out error:', signOutError);

      // Check if Redux state was reset
      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should refresh user profile when user exists', async () => {
      const store = createTestStore({
        user: mockUser,
        isAuthenticated: true,
      });
      const { result } = renderWithStore(store);

      // Clear any existing profile to ensure the test is working
      store.dispatch({ type: 'auth/setUserProfile', payload: null });

      await act(async () => {
        await result.current.refreshUserProfile();
      });

      // Check that the profile was loaded by verifying the state change
      const finalState = store.getState().auth;
      expect(finalState.userProfile).toBeDefined();
      expect(finalState.userProfile?.uid).toBe('test-uid');
    });

    it('should not refresh profile when no user', async () => {
      const store = createTestStore(); // No user
      const { result } = renderWithStore(store);

      const dispatchSpy = jest.spyOn(store, 'dispatch');

      await act(async () => {
        await result.current.refreshUserProfile();
      });

      // Should not dispatch loadUserProfile when no user
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth/loadUserProfile/pending',
        })
      );

      dispatchSpy.mockRestore();
    });

    it('should handle refresh profile error gracefully', async () => {
      const store = createTestStore({
        user: mockUser,
        isAuthenticated: true,
      });
      const { result } = renderWithStore(store);

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock getDoc to throw an error for this test
      const { getDoc } = require('firebase/firestore');
      getDoc.mockImplementationOnce(() => Promise.reject(new Error('Firestore error')));

      await act(async () => {
        await result.current.refreshUserProfile();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Refresh profile error:',
        expect.anything() // Accept either Error object or string
      );

      consoleSpy.mockRestore();
    });
  });

  describe('State Reactivity', () => {
    it('should update when Redux state changes', () => {
      const store = createTestStore();
      const { result } = renderWithStore(store);

      // Initial state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);

      // Update Redux state
      act(() => {
        store.dispatch(setUser(mockUser as any));
      });

      // Hook should reflect the change
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should update loading state', () => {
      const store = createTestStore();
      const { result } = renderWithStore(store);

      expect(result.current.loading).toBe(true);

      act(() => {
        store.dispatch(setLoading(false));
      });

      expect(result.current.loading).toBe(false);
    });

    it('should update error state', () => {
      const store = createTestStore();
      const { result } = renderWithStore(store);

      expect(result.current.error).toBe(null);

      const errorMessage = 'Test error';
      act(() => {
        store.dispatch(setError(errorMessage));
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', () => {
      const store = createTestStore();
      const { result } = renderWithStore(store);

      // Initial unauthenticated state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(true);

      // Simulate authentication
      act(() => {
        store.dispatch(setUser(mockUser as any));
        store.dispatch(setLoading(false));
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
    });

    it('should handle logout flow', async () => {
      mockFirebaseAuthService.signOut.mockResolvedValue(undefined);
      
      const store = createTestStore({
        user: mockUser,
        isAuthenticated: true,
        loading: false,
      });
      const { result } = renderWithStore(store);

      // Authenticated state
      expect(result.current.isAuthenticated).toBe(true);

      // Sign out
      await act(async () => {
        await result.current.signOut();
      });

      // Should call Firebase signOut
      expect(mockFirebaseAuthService.signOut).toHaveBeenCalled();
    });

    it('should maintain consistent API across re-renders', () => {
      const store = createTestStore();
      const { result } = renderWithStore(store);

      const initialSignOut = result.current.signOut;
      const initialRefreshProfile = result.current.refreshUserProfile;

      // Update state to trigger re-render
      act(() => {
        store.dispatch(setLoading(false));
      });

      // Functions should be the same reference (memoized)
      expect(result.current.signOut).toBe(initialSignOut);
      expect(result.current.refreshUserProfile).toBe(initialRefreshProfile);
    });
  });
});
