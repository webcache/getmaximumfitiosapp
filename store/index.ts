import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist';
import authReducer from './authSlice';

// Redux Persist configuration optimized for Firebase v11
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: [], // Don't use redux-persist for auth - we'll handle it manually with AsyncStorage
  blacklist: ['auth'], // Exclude auth from redux-persist to avoid conflicts
  // Custom serialization for better performance
  serialize: true,
  timeout: 10000, // 10 second timeout
};

const rootReducer = combineReducers({
  auth: authReducer,
  // Add other reducers here as needed
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH, 
          REHYDRATE, 
          PAUSE, 
          PERSIST, 
          PURGE, 
          REGISTER,
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
      // Disable immutability check in production for better performance
      immutableCheck: __DEV__ ? true : false,
    }),
  devTools: __DEV__, // Enable Redux DevTools in development
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
