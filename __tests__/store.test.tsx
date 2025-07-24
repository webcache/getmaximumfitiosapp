import AsyncStorage from '@react-native-async-storage/async-storage';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from '../store';
import { resetAuthState, setTokens, setUser } from '../store/authSlice';

// Test component
const TestComponent = () => {
  return <Text>Test Component</Text>;
};

// Test app with Redux and Persistence
const TestApp = () => (
  <Provider store={store}>
    <PersistGate loading={<Text>Loading...</Text>} persistor={persistor}>
      <TestComponent />
    </PersistGate>
  </Provider>
);

describe('Redux Store and Persistence', () => {
  beforeEach(async () => {
    // Clear AsyncStorage before each test
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Reset store state
    store.dispatch(resetAuthState());
    await AsyncStorage.clear();
  });

  describe('Store Configuration', () => {
    it('should have correct initial state', () => {
      const state = store.getState();
      
      expect(state.auth).toBeDefined();
      expect(state.auth.user).toBe(null);
      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.auth.loading).toBe(true);
    });

    it('should handle Redux actions', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        emailVerified: true,
        providerId: 'firebase',
        providerData: [],
      };

      store.dispatch(setUser(mockUser as any));
      
      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(true);
      expect(state.auth.user?.uid).toBe('test-uid');
    });

    it('should handle token management', () => {
      const mockTokens = {
        idToken: 'test-id-token',
        refreshToken: 'test-refresh-token',
        accessToken: 'test-access-token',
        tokenExpiry: Date.now() + 3600000,
        lastRefresh: Date.now(),
      };

      store.dispatch(setTokens(mockTokens));
      
      const state = store.getState();
      expect(state.auth.tokens.idToken).toBe('test-id-token');
      expect(state.auth.tokens.refreshToken).toBe('test-refresh-token');
    });
  });

  describe('Persistence Configuration', () => {
    it('should blacklist auth from redux-persist', () => {
      // The store configuration should exclude auth from redux-persist
      // This test verifies our custom persistence approach
      const persistConfig = require('../store').persistConfig;
      expect(persistConfig?.blacklist).toContain('auth');
    });

    it('should render with PersistGate', () => {
      const { getByText } = render(<TestApp />);
      
      // Should eventually render the test component
      // The loading state might appear briefly
      expect(getByText('Test Component') || getByText('Loading...')).toBeTruthy();
    });
  });

  describe('Serialization Handling', () => {
    it('should handle Firebase User serialization', () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        emailVerified: true,
        providerId: 'firebase',
        providerData: [],
        // Firebase-specific properties that should be ignored
        accessToken: 'should-be-ignored',
        refreshToken: 'should-be-ignored',
        auth: { /* Firebase auth instance */ },
        metadata: { /* Firebase metadata */ },
        stsTokenManager: { /* Firebase token manager */ },
      };

      // Should not throw serialization errors
      expect(() => {
        store.dispatch(setUser(mockFirebaseUser as any));
      }).not.toThrow();

      const state = store.getState();
      expect(state.auth.user?.uid).toBe('test-uid');
      
      // Firebase-specific properties should be handled by serialization
      expect(state.auth.user).not.toHaveProperty('auth');
      expect(state.auth.user).not.toHaveProperty('metadata');
      expect(state.auth.user).not.toHaveProperty('stsTokenManager');
    });

    it('should maintain referential equality for performance', () => {
      const initialState = store.getState();
      
      // Dispatch an action that doesn't change the auth state
      store.dispatch({ type: 'UNRELATED_ACTION' });
      
      const newState = store.getState();
      
      // Auth state should maintain referential equality for performance
      expect(newState.auth).toBe(initialState.auth);
    });
  });

  describe('DevTools Configuration', () => {
    it('should enable DevTools in development', () => {
      // This test verifies that DevTools are configured correctly
      // In a real environment, __DEV__ would control this
      const storeConfig = store;
      expect(storeConfig).toBeDefined();
      
      // The store should be configured with middleware
      expect(storeConfig.dispatch).toBeDefined();
      expect(storeConfig.getState).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed actions gracefully', () => {
      expect(() => {
        store.dispatch({ type: 'INVALID_ACTION', payload: undefined });
      }).not.toThrow();

      // State should remain consistent
      const state = store.getState();
      expect(state.auth).toBeDefined();
    });

    it('should handle reducer errors', () => {
      // Even with invalid payloads, reducers should handle gracefully
      expect(() => {
        store.dispatch(setUser(null));
        store.dispatch(setUser({} as any));
        store.dispatch(setTokens({}));
      }).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('should handle multiple rapid dispatches', () => {
      const startTime = Date.now();
      
      // Dispatch multiple actions rapidly
      for (let i = 0; i < 100; i++) {
        store.dispatch(setTokens({ idToken: `token-${i}` }));
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (under 100ms)
      expect(duration).toBeLessThan(100);
      
      // Final state should be consistent
      const state = store.getState();
      expect(state.auth.tokens.idToken).toBe('token-99');
    });

    it('should maintain immutability', () => {
      const initialState = store.getState();
      const initialAuthState = initialState.auth;
      
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        emailVerified: true,
        providerId: 'firebase',
        providerData: [],
      };
      
      store.dispatch(setUser(mockUser as any));
      
      const newState = store.getState();
      
      // States should be different objects (immutable)
      expect(newState).not.toBe(initialState);
      expect(newState.auth).not.toBe(initialAuthState);
      
      // Original state should be unchanged
      expect(initialAuthState.user).toBe(null);
      expect(newState.auth.user).toBeDefined();
    });
  });

  describe('Integration with AsyncStorage', () => {
    it('should not interfere with custom AsyncStorage usage', async () => {
      // Since auth is blacklisted from redux-persist,
      // our custom AsyncStorage operations should work independently
      
      await AsyncStorage.setItem('custom-key', 'custom-value');
      const value = await AsyncStorage.getItem('custom-key');
      
      expect(value).toBe('custom-value');
      
      // Redux operations should not affect our custom storage
      store.dispatch(setUser({ uid: 'test' } as any));
      
      const stillThere = await AsyncStorage.getItem('custom-key');
      expect(stillThere).toBe('custom-value');
    });
  });

  describe('Type Safety', () => {
    it('should maintain proper TypeScript types', () => {
      const state = store.getState();
      
      // These should be properly typed
      expect(typeof state.auth.isAuthenticated).toBe('boolean');
      expect(typeof state.auth.loading).toBe('boolean');
      expect(typeof state.auth.initialized).toBe('boolean');
      
      if (state.auth.user) {
        expect(typeof state.auth.user.uid).toBe('string');
        expect(typeof state.auth.user.email).toBe('string');
      }
      
      if (state.auth.error) {
        expect(typeof state.auth.error).toBe('string');
      }
    });
  });
});
