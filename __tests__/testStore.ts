import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';

// Create a test store without redux-persist to avoid timer issues
export const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      }),
  });
};

export type TestStore = ReturnType<typeof createTestStore>;
export type TestRootState = ReturnType<TestStore['getState']>;
export type TestAppDispatch = TestStore['dispatch'];
