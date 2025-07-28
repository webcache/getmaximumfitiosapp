import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Provider } from 'react-redux';
import TokenAuthService from '../services/tokenAuthService';
import { store } from '../store';
import { setPersistenceRestored } from '../store/authSlice';
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
  const { initialized, loading, persistenceRestored } = useAppSelector((state) => state.auth);
  const [authServiceInitialized, setAuthServiceInitialized] = React.useState(false);
  const [initializationError, setInitializationError] = React.useState<string | null>(null);
  const [initializationAttempted, setInitializationAttempted] = React.useState(false);

  // Mark persistence as restored when component mounts (after PersistGate)
  useEffect(() => {
    if (!persistenceRestored) {
      store.dispatch(setPersistenceRestored(true));
    }
  }, [persistenceRestored]);

  useEffect(() => {
    // Only run initialization once per component mount and prevent multiple attempts
    if (authServiceInitialized || initializationAttempted) return;

    setInitializationAttempted(true);
    let isMounted = true;
    let initAttempt = 0;
    const maxAttempts = 2; // Reduced from 3 to prevent excessive retries
    
    const initializeAuth = async () => {
      while (initAttempt < maxAttempts && isMounted) {
        initAttempt++;
        
        try {
          CrashLogger.logAuthStep('Starting token auth service initialization', { attempt: initAttempt });
          
          // Add timeout to prevent hanging
          const tokenAuthService = TokenAuthService.getInstance();
          const initPromise = tokenAuthService.initialize();
          
          let timeoutId: any;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Initialization timeout')), 10000);
          });
          
          try {
            await Promise.race([initPromise, timeoutPromise]);
          } finally {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
          
          if (isMounted) {
            setAuthServiceInitialized(true);
            setInitializationError(null);
            CrashLogger.logAuthStep('Auth initialization successful', { attempt: initAttempt });
            return; // Success - exit the loop
          }
        } catch (error) {
          const errorMessage = (error as Error).message || 'Unknown error';
          console.warn(`Auth initialization attempt ${initAttempt} failed:`, errorMessage);
          CrashLogger.recordError(error as Error, 'AUTH_SERVICE_INIT_ERROR');
          
          if (initAttempt >= maxAttempts) {
            // Final attempt failed - continue with limited functionality
            if (isMounted) {
              console.warn('All auth initialization attempts failed. Continuing with limited functionality.');
              setAuthServiceInitialized(true);
              setInitializationError(errorMessage);
            }
            return;
          }
          
          // Wait before retry (exponential backoff but shorter delays)
          const delay = Math.min(100 * Math.pow(2, initAttempt - 1), 1000);
          if (isMounted) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    };

    // Start initialization with a small delay to let Redux settle
    const initTimer = setTimeout(() => {
      if (isMounted) {
        initializeAuth().catch(error => {
          console.error('Critical auth initialization error:', error);
          if (isMounted) {
            setAuthServiceInitialized(true);
            setInitializationError('Critical initialization failure');
          }
        });
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      isMounted = false;
      clearTimeout(initTimer);
    };
  }, []); // Empty dependency array - only run once on mount

  // Cleanup when component unmounts - TokenAuthService doesn't require cleanup
  // useEffect cleanup removed as TokenAuthService is stateless

  // Show loading screen until auth is initialized (but with timeout)
  if (!authServiceInitialized || (!initialized && loading && !initializationError)) {
    return <LoadingScreen />;
  }

  // Show error if initialization failed but allow app to continue
  if (initializationError) {
    console.warn('Authentication initialized with errors, continuing with limited functionality');
    // Don't block the app, just log the error and continue
  }

  return <>{children}</>;
};

// Main AuthProvider component
export const ReduxAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AuthInitializer>
          {children}
        </AuthInitializer>
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
