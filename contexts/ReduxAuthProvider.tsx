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
  const [errorCount, setErrorCount] = React.useState(0);
  const [lastErrorTime, setLastErrorTime] = React.useState(0);

  React.useEffect(() => {
    // Setup error handling for React Native
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    const handleError = (...args: any[]) => {
      const errorMessage = args.join(' ');
      const currentTime = Date.now();
      
      // Check for rapid-fire errors (error loop detection)
      if (currentTime - lastErrorTime < 1000) { // Less than 1 second since last error
        setErrorCount(prev => prev + 1);
        if (errorCount > 5) { // More than 5 errors in quick succession
          console.warn('Error loop detected, triggering error boundary');
          setHasError(true);
          return;
        }
      } else {
        setErrorCount(0); // Reset counter if enough time has passed
      }
      setLastErrorTime(currentTime);
      
      // Only catch Firebase/Auth/Google Sign-In related errors to avoid interfering with other error handling
      if (errorMessage.includes('Firebase') || 
          errorMessage.includes('Auth') || 
          errorMessage.includes('Maximum call stack') ||
          errorMessage.includes('GoogleSignin') ||
          errorMessage.includes('google-signin') ||
          errorMessage.includes('ERR_MODULE_NOT_FOUND') ||
          errorMessage.includes('loop') ||
          errorMessage.includes('recursive') ||
          errorMessage.includes('stack overflow')) {
        console.warn('Auth Provider caught error:', errorMessage);
        try {
          CrashLogger.recordError(new Error(errorMessage), 'AUTH_PROVIDER_ERROR');
        } catch (logError) {
          // Prevent recursive errors from CrashLogger
          console.warn('CrashLogger error:', logError);
        }
        
        // Don't immediately trigger error state for single occurrences
        if (errorCount > 2 || errorMessage.includes('Maximum call stack') || errorMessage.includes('loop')) {
          setHasError(true);
        }
        return; // Don't call original console.error for these specific errors
      }
      
      // For all other errors, call the original console.error
      originalConsoleError(...args);
    };

    const handleWarn = (...args: any[]) => {
      const warnMessage = args.join(' ');
      
      // Also monitor warnings for loop indicators
      if (warnMessage.includes('loop') || warnMessage.includes('recursive') || warnMessage.includes('Maximum call stack')) {
        console.warn('Potential loop detected in warning:', warnMessage);
        setErrorCount(prev => prev + 1);
        if (errorCount > 3) {
          setHasError(true);
          return;
        }
      }
      
      originalConsoleWarn(...args);
    };
    
    // Override console methods temporarily but with safeguards
    console.error = handleError;
    console.warn = handleWarn;
    
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, [errorCount, lastErrorTime]);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Authentication Error Loop Detected</Text>
        <Text style={styles.errorSubtext}>The authentication system encountered repeated errors.</Text>
        <Text style={styles.errorSubtext}>Please restart the app to recover.</Text>
        <Text style={styles.errorDetail}>Error count: {errorCount}</Text>
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
  const [initAttempts, setInitAttempts] = React.useState(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = React.useState(false);

  useEffect(() => {
    // Prevent multiple initialization attempts and circuit breaker
    if (authServiceInitialized || isInitializing || maxAttemptsReached) return;

    // Circuit breaker: max 3 initialization attempts
    if (initAttempts >= 3) {
      console.warn('Maximum auth initialization attempts reached. Stopping retries.');
      setMaxAttemptsReached(true);
      setAuthServiceInitialized(true); // Mark as initialized to prevent hanging
      return;
    }

    let isMounted = true;
    setIsInitializing(true);
    setInitAttempts(prev => prev + 1);
    
    CrashLogger.logAuthStep('Starting Firebase auth service initialization', { attempt: initAttempts + 1 });
    
    const initializeAuth = async () => {
      try {
        await firebaseAuthService.initialize();
        if (isMounted) {
          setAuthServiceInitialized(true);
          setIsInitializing(false);
          CrashLogger.logAuthStep('Auth initialization successful', { attempt: initAttempts + 1 });
        }
      } catch (error) {
        console.warn('Error initializing Firebase auth service:', error);
        CrashLogger.recordError(error as Error, 'AUTH_SERVICE_INIT_ERROR');
        if (isMounted) {
          setIsInitializing(false);
          
          // If this was the final attempt, mark as initialized to prevent hanging
          if (initAttempts >= 2) {
            console.warn('Final auth initialization attempt failed. Marking as initialized to prevent hanging.');
            setAuthServiceInitialized(true);
            setMaxAttemptsReached(true);
          }
        }
      }
    };
    
    // Exponential backoff: delay increases with each attempt
    const delay = Math.min(50 * Math.pow(2, initAttempts), 1000);
    const timeoutId = setTimeout(initializeAuth, delay);

    // Cleanup on unmount
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      setIsInitializing(false);
    };
  }, [authServiceInitialized, isInitializing, initAttempts, maxAttemptsReached]); // Include dependencies to allow retries

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
  errorDetail: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 8,
  },
});
