import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';

// Test store without Redux Persist to avoid open handles in Jest
export const testStore = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'auth/setUser',
        ],
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

export type TestRootState = ReturnType<typeof testStore.getState>;
export type TestAppDispatch = typeof testStore.dispatch;
