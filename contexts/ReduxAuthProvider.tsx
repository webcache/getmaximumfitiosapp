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
    // Setup error handling for React Native
    const originalConsoleError = console.error;
    
    const handleError = (...args: any[]) => {
      const errorMessage = args.join(' ');
      
      // Only catch Firebase/Auth related errors to avoid interfering with other error handling
      if (errorMessage.includes('Firebase') || errorMessage.includes('Auth') || errorMessage.includes('Maximum call stack')) {
        console.warn('Auth Provider caught error:', errorMessage);
        try {
          CrashLogger.recordError(new Error(errorMessage), 'AUTH_PROVIDER_ERROR');
        } catch (logError) {
          // Prevent recursive errors from CrashLogger
          console.warn('CrashLogger error:', logError);
        }
        setHasError(true);
        return; // Don't call original console.error for these specific errors
      }
      
      // For all other errors, call the original console.error
      originalConsoleError(...args);
    };
    
    // Override console.error temporarily but with safeguards
    console.error = handleError;
    
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
  const [isInitializing, setIsInitializing] = React.useState(false);

  useEffect(() => {
    // Prevent multiple initialization attempts
    if (authServiceInitialized || isInitializing) return;

    let isMounted = true;
    setIsInitializing(true);
    
    CrashLogger.logAuthStep('Starting Firebase auth service initialization');
    
    const initializeAuth = async () => {
      try {
        await firebaseAuthService.initialize();
        if (isMounted) {
          setAuthServiceInitialized(true);
          setIsInitializing(false);
        }
      } catch (error) {
        console.warn('Error initializing Firebase auth service:', error);
        CrashLogger.recordError(error as Error, 'AUTH_SERVICE_INIT_ERROR');
        if (isMounted) {
          // Still mark as initialized to prevent hanging
          setAuthServiceInitialized(true);
          setIsInitializing(false);
        }
      }
    };
    
    // Small delay to ensure component is fully mounted
    const timeoutId = setTimeout(initializeAuth, 50);

    // Cleanup on unmount
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      setIsInitializing(false);
    };
  }, []); // Empty dependency array to run only once

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (authServiceInitialized) {
        firebaseAuthService.cleanup?.();
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
