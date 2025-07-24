import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { persistor, store } from '../store';
import { useAppSelector } from '../store/hooks';
import CrashLogger from '../utils/crashLogger';

// Loading component shown during Redux persistence rehydration
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Error boundary component
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const errorHandler = (error: any) => {
      console.error('Auth Provider Error:', error);
      CrashLogger.recordError(error, 'AUTH_PROVIDER_ERROR');
      setHasError(true);
    };

    // Add global error listeners
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('Firebase') || args[0]?.includes?.('Auth')) {
        errorHandler(new Error(args.join(' ')));
      }
      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Authentication Error</Text>
        <Text style={styles.errorSubtext}>Please restart the app</Text>
      </View>
    );
  }

  return <>{children}</>;
};

// Inner component that uses Redux hooks
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized, loading } = useAppSelector((state) => state.auth);
  const [authServiceInitialized, setAuthServiceInitialized] = React.useState(false);

  useEffect(() => {
    if (authServiceInitialized) return;

    // Initialize Firebase auth service when component mounts
    CrashLogger.logAuthStep('Starting Firebase auth service initialization');
    
    // Use a timeout to prevent blocking the main thread
    const timeoutId = setTimeout(() => {
      try {
        firebaseAuthService.initialize();
        setAuthServiceInitialized(true);
      } catch (error) {
        console.error('Error initializing Firebase auth service:', error);
        CrashLogger.recordError(error as Error, 'AUTH_SERVICE_INIT_ERROR');
        setAuthServiceInitialized(true); // Still mark as initialized to prevent hanging
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      if (authServiceInitialized) {
        firebaseAuthService.cleanup();
      }
    };
  }, [authServiceInitialized]);

  // Show loading screen until auth is initialized
  if (!authServiceInitialized || !initialized || loading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
};

// Main AuthProvider component
export const ReduxAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <AuthInitializer>
            {children}
          </AuthInitializer>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

// Hook for using auth state in components
export const useReduxAuth = () => {
  const auth = useAppSelector((state) => state.auth);
  return auth;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
