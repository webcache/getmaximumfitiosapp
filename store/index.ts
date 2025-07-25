import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore, Middleware } from '@reduxjs/toolkit';
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist';
import authReducer from './authSlice';

// Custom middleware to provide positive feedback for auth operations
const authFeedbackMiddleware: Middleware = () => (next) => (action: any) => {
  if (__DEV__ && action.type?.startsWith('auth/')) {
    switch (action.type) {
      case 'auth/setUser':
        if (action.payload) {
          console.log('✅ Redux Store: User authentication state updated successfully');
        }
        break;
      case 'auth/clearUser':
        console.log('✅ Redux Store: User session cleared successfully');
        break;
      case 'auth/setLoading':
        if (!action.payload) {
          console.log('✅ Redux Store: Auth operation completed');
        }
        break;
    }
  }
  return next(action);
};

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
    }).concat(authFeedbackMiddleware), // Add our custom middleware here
  devTools: __DEV__, // Enable Redux DevTools in development
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export persistConfig for testing
export { persistConfig };
