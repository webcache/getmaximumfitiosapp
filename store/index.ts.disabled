// Import polyfills FIRST before any other imports
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import '../polyfills';
import authReducer from './authSlice';

// No Redux Persist needed - we handle auth persistence manually with SecureStore + Firestore
const rootReducer = combineReducers({
  auth: authReducer,
  // Add other reducers here as needed
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Ignore our custom auth actions that might contain Firebase objects
          'auth/setUser',
        ],
        // Ignore Firebase User objects and other non-serializable data
        ignoredPaths: [
          'auth.user.accessToken',
          'auth.user.refreshToken',
          'auth.user.auth',
          'auth.user.metadata',
          'auth.user.stsTokenManager',
        ],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {auth: AuthState}
export type AppDispatch = typeof store.dispatch;

// Mock persistor for tests that still reference it
export const persistor = {
  purge: () => Promise.resolve(),
  flush: () => Promise.resolve(),
  pause: () => {},
  persist: () => {},
};

// Log successful Redux auth state management setup
if (__DEV__) {
  console.log('✅ Redux Store configured - Auth persistence handled via SecureStore + Firestore');
}
