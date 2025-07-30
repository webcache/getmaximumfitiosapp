import { CrashBoundary } from '@/components/CrashBoundary';
import SocialAuthButtons from '@/components/SocialAuthButtons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { formatDiagnosticResults, runGoogleSignInDiagnostic } from '@/utils/googleSignInDiagnostic';
import { useRouter } from 'expo-router';
import { EmailAuthProvider } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

function LoginScreenContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [crashDetails, setCrashDetails] = useState<string | null>(null);
  const [showCrashDetails, setShowCrashDetails] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<string | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(__DEV__); // Show in dev by default
  const [appFullyReady, setAppFullyReady] = useState(false);
  const blinkAnimation = useRef(new Animated.Value(1)).current;
  const { isAuthenticated, signIn, signUp } = useAuth();
  const router = useRouter();

  // Global error handler for any unhandled promise rejections or errors
  useEffect(() => {
    const handleUnhandledRejection = (event: any) => {
      console.error('🚨 Unhandled promise rejection in login screen:', event);
      const errorDetails = {
        type: 'UNHANDLED_PROMISE_REJECTION',
        reason: event.reason?.message || event.reason || 'Unknown rejection',
        stack: event.reason?.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
        platform: Platform.OS
      };
      setCrashDetails(`Unhandled Promise Rejection: ${JSON.stringify(errorDetails, null, 2)}`);
      setShowCrashDetails(true);
      setLoading(false);
    };

    const handleError = (event: any) => {
      console.error('🚨 Unhandled error in login screen:', event);
      const errorDetails = {
        type: 'UNHANDLED_ERROR',
        message: event.error?.message || event.message || 'Unknown error',
        stack: event.error?.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
        platform: Platform.OS
      };
      setCrashDetails(`Unhandled Error: ${JSON.stringify(errorDetails, null, 2)}`);
      setShowCrashDetails(true);
      setLoading(false);
    };

    // Note: React Native doesn't have window.addEventListener for these events
    // but we can set up console error capturing
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('🚨')) {
        // This is one of our intentional error logs, don't capture it
        originalConsoleError(...args);
        return;
      }
      
      // Capture unexpected console errors
      const errorDetails = {
        type: 'CONSOLE_ERROR',
        arguments: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)),
        timestamp: new Date().toISOString(),
        platform: Platform.OS
      };
      setCrashDetails(`Console Error: ${JSON.stringify(errorDetails, null, 2)}`);
      setShowCrashDetails(true);
      
      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Check if app is fully ready for login
  useEffect(() => {
    const checkAppReadiness = async () => {
      try {
        // Wait a bit for all native modules to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Run our Google Sign-In diagnostic to ensure everything is configured
        const diagnostic = await runGoogleSignInDiagnostic();
        
        // App is ready if:
        // 1. Platform is supported
        // 2. Has valid client ID
        // 3. Google Sign-In module is accessible
        // 4. No fatal configuration errors
        const isReady = diagnostic.platformSupported && 
                       diagnostic.hasValidClientId && 
                       diagnostic.canCheckCurrentUser && 
                       !diagnostic.error?.includes('fatal') &&
                       !diagnostic.error?.includes('not properly configured');
        
        setAppFullyReady(isReady);
        
        if (isReady) {
          console.log('✅ App fully ready for login - all systems go!');
          // Start blinking animation
          const blink = () => {
            Animated.sequence([
              Animated.timing(blinkAnimation, {
                toValue: 0.2,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(blinkAnimation, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
            ]).start(() => blink());
          };
          blink();
        } else {
          console.warn('⚠️ App readiness check failed:', diagnostic);
        }
      } catch (error) {
        console.error('❌ App readiness check error:', error);
        setAppFullyReady(false);
      }
    };

    checkAppReadiness();
  }, []);

  // Enhanced crash-safe navigation handler
  const handlePostAuthNavigation = async () => {
    try {
      console.log('🚀 Starting post-auth navigation...');
      
      // Clear any previous crash details
      setCrashDetails(null);
      setShowCrashDetails(false);
      
      // Production-specific delay - longer on physical devices
      const NAVIGATION_DELAY = __DEV__ ? 100 : 800;
      console.log(`⏱️ Waiting ${NAVIGATION_DELAY}ms before navigation...`);
      
      await new Promise(resolve => setTimeout(resolve, NAVIGATION_DELAY));
      
      // Verify auth state before navigation
      if (!isAuthenticated) {
        throw new Error('User is not authenticated before navigation');
      }
      
      console.log('✅ Attempting navigation to dashboard...');
      router.replace('/(tabs)/dashboard');
      
    } catch (navError: any) {
      console.error('❌ Post-auth navigation error:', navError);
      
      // Capture detailed error info
      const errorDetails = {
        message: navError.message || 'Unknown navigation error',
        stack: navError.stack || 'No stack trace available',
        name: navError.name || 'Error',
        timestamp: new Date().toISOString(),
        isAuthenticated,
        platform: Platform.OS,
        dev: __DEV__
      };
      
      setCrashDetails(`Navigation Error: ${JSON.stringify(errorDetails, null, 2)}`);
      setShowCrashDetails(true);
      setLoading(false);
      
      // Fallback navigation attempt
      setTimeout(async () => {
        try {
          console.log('🔄 Attempting fallback navigation...');
          router.replace('/(tabs)/dashboard');
        } catch (retryError: any) {
          console.error('❌ Fallback navigation also failed:', retryError);
          const retryErrorDetails = {
            message: retryError.message || 'Unknown retry error',
            stack: retryError.stack || 'No stack trace available',
            attempt: 'fallback',
            timestamp: new Date().toISOString()
          };
          setCrashDetails(`Fallback Navigation Error: ${JSON.stringify(retryErrorDetails, null, 2)}`);
        }
      }, 2000);
    }
  };

  // This useEffect handles navigation after a successful login or signup.
  // It listens for the `isAuthenticated` state change from the `useAuth` hook
  useEffect(() => {
    if (isAuthenticated) {
      console.log('✅ LOGIN SCREEN: User authenticated, starting safe navigation...');
      handlePostAuthNavigation();
    }
  }, [isAuthenticated, router]);

  const handleAuth = async () => {
    if (!email || !password) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setErrorMessage(''); // Clear any previous errors
    setCrashDetails(null); // Clear any previous crash details
    setShowCrashDetails(false);

    try {
      console.log('🔄 LOGIN SCREEN: Starting authentication...');
      
      // Add bridge stabilization delay before auth operations
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (isSignUp) {
        // Sign up new user - wrapped in comprehensive error handling
        try {
          const profileData = {
            firstName: firstName || '',
            lastName: lastName || '',
            phone: phone || '',
            height: height || '',
            weight: weight || '',
          };
          
          console.log('📝 Starting sign up process...');
          await signUp(email, password, profileData);
          console.log('✅ Sign up successful, waiting for auth state change...');
          // Navigation is handled by the useEffect hook with crash protection
        } catch (signUpError: any) {
          console.error('❌ Sign up error:', signUpError);
          
          // Capture detailed sign up error
          const errorDetails = {
            type: 'SIGN_UP_ERROR',
            message: signUpError.message || 'Unknown sign up error',
            code: signUpError.code || 'NO_CODE',
            stack: signUpError.stack || 'No stack trace',
            timestamp: new Date().toISOString(),
            email: email.substring(0, 5) + '***', // Partial email for debugging
            platform: Platform.OS
          };
          
          setCrashDetails(`Sign Up Error: ${JSON.stringify(errorDetails, null, 2)}`);
          setShowCrashDetails(true);
          throw signUpError;
        }
      } else {
        // Sign in existing user - wrapped in comprehensive error handling
        try {
          console.log('🔑 Starting sign in process...');
          const credential = EmailAuthProvider.credential(email, password);
          
          // Add additional delay before sign-in to prevent bridge conflicts
          await new Promise(resolve => setTimeout(resolve, 100));
          
          await signIn(credential);
          console.log('✅ Sign in successful, waiting for auth state change...');
          // Navigation is handled by the useEffect hook with crash protection
        } catch (signInError: any) {
          console.error('❌ Sign in error:', signInError);
          
          // Capture detailed sign in error
          const errorDetails = {
            type: 'SIGN_IN_ERROR',
            message: signInError.message || 'Unknown sign in error',
            code: signInError.code || 'NO_CODE',
            stack: signInError.stack || 'No stack trace',
            timestamp: new Date().toISOString(),
            email: email.substring(0, 5) + '***', // Partial email for debugging
            platform: Platform.OS,
            credentialType: 'EmailAuthProvider'
          };
          
          setCrashDetails(`Sign In Error: ${JSON.stringify(errorDetails, null, 2)}`);
          setShowCrashDetails(true);
          throw signInError;
        }
      }
      
    } catch (error: any) {
      let errorMessage = 'An error occurred during authentication';
      
      // Use a more specific error code if available
      const code = error.code || (error.payload && error.payload.code);

      switch (code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please check your credentials.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        default:
          // Handle more generic Firebase error messages
          if (error.message.includes('password')) {
            errorMessage = 'Password is incorrect. Please try again.';
          } else if (error.message.includes('email')) {
            errorMessage = 'Please enter a valid email address.';
          } else if (error.message.includes('network')) {
            errorMessage = 'Network error. Please check your connection.';
          } else {
            errorMessage = 'Login failed. Please try again.';
          }
      }
      
      setErrorMessage(errorMessage);
    } finally {
      // Only set loading to false if we're not waiting for auth state change
      if (!isAuthenticated) {
        setLoading(false);
      }
    }
  };

  // Google Sign-In diagnostic function
  const runDiagnostic = async () => {
    try {
      setDiagnosticResults('Running diagnostic...');
      const diagnostic = await runGoogleSignInDiagnostic();
      const formatted = formatDiagnosticResults(diagnostic);
      setDiagnosticResults(formatted);
    } catch (error: any) {
      setDiagnosticResults(`Diagnostic failed: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* App Ready Indicator - Blinking Green Circle */}
      {appFullyReady && (
        <View style={styles.readyIndicator}>
          <Animated.View style={[styles.readyCircle, { opacity: blinkAnimation }]} />
          <ThemedText style={styles.readyText}>Ready</ThemedText>
        </View>
      )}
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView style={[styles.container, { backgroundColor: '#fff' }]}>
            <View style={styles.content}>
              <Image 
                source={require('../../assets/images/MF-logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
              <ThemedText style={styles.title}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </ThemedText>
              
              <View style={styles.form}>
        {isSignUp && (
          <>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Height (optional)"
              value={height}
              onChangeText={setHeight}
            />
            <TextInput
              style={styles.input}
              placeholder="Weight (optional)"
              value={weight}
              onChangeText={setWeight}
            />
          </>
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errorMessage) setErrorMessage(''); // Clear error when user starts typing
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errorMessage) setErrorMessage(''); // Clear error when user starts typing
          }}
          secureTextEntry
          autoCapitalize="none"
        />
        
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
          </View>
        ) : null}

        {/* Crash Details Display */}
        {crashDetails && showCrashDetails ? (
          <View style={styles.crashContainer}>
            <View style={styles.crashHeader}>
              <ThemedText style={styles.crashTitle}>🐛 Crash Details (Debug Info)</ThemedText>
              <TouchableOpacity 
                style={styles.crashToggle}
                onPress={() => setShowCrashDetails(!showCrashDetails)}
              >
                <ThemedText style={styles.crashToggleText}>
                  {showCrashDetails ? 'Hide' : 'Show'}
                </ThemedText>
              </TouchableOpacity>
            </View>
            {showCrashDetails && (
              <ScrollView style={styles.crashDetails} nestedScrollEnabled={true}>
                <ThemedText style={styles.crashText}>{crashDetails}</ThemedText>
              </ScrollView>
            )}
            <TouchableOpacity 
              style={styles.crashClearButton}
              onPress={() => {
                setCrashDetails(null);
                setShowCrashDetails(false);
              }}
            >
              <ThemedText style={styles.crashClearText}>Clear Debug Info</ThemedText>
            </TouchableOpacity>
          </View>
        ) : null}
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={styles.buttonText}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </ThemedText>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.switchButton} 
          onPress={() => {
            setIsSignUp(!isSignUp);
            setErrorMessage(''); // Clear error when switching modes
          }}
          disabled={loading}
        >
          <ThemedText style={styles.switchText}>
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"
            }
          </ThemedText>
        </TouchableOpacity>

        {/* Google Sign-In Diagnostic (Dev/Production Debug) */}
        {showDiagnostic && (
          <View style={styles.diagnosticContainer}>
            <View style={styles.diagnosticHeader}>
              <ThemedText style={styles.diagnosticTitle}>🔧 Google Sign-In Diagnostic</ThemedText>
              <TouchableOpacity 
                style={styles.diagnosticButton}
                onPress={runDiagnostic}
              >
                <ThemedText style={styles.diagnosticButtonText}>Run Check</ThemedText>
              </TouchableOpacity>
            </View>
            {diagnosticResults && (
              <View style={styles.diagnosticResults}>
                <ThemedText style={styles.diagnosticText}>{diagnosticResults}</ThemedText>
              </View>
            )}
            <TouchableOpacity 
              style={styles.diagnosticToggle}
              onPress={() => setShowDiagnostic(!showDiagnostic)}
            >
              <ThemedText style={styles.diagnosticToggleText}>Hide Diagnostic</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Show Diagnostic Button when hidden */}
        {!showDiagnostic && (
          <TouchableOpacity 
            style={styles.showDiagnosticButton}
            onPress={() => setShowDiagnostic(true)}
          >
            <ThemedText style={styles.showDiagnosticText}>🔧 Show Google Diagnostic</ThemedText>
          </TouchableOpacity>
        )}

        {/* Social Authentication Buttons */}
        <SocialAuthButtons
          mode={isSignUp ? 'signup' : 'signin'}
          onSuccess={() => {
            console.log('✅ Social auth success - navigation handled by auth state change');
            // Navigation will be handled by the useEffect hook with crash protection
          }}
          onError={(error) => {
            console.error('❌ Social auth error:', error);
            
            // Capture detailed social auth error
            const errorDetails = {
              type: 'SOCIAL_AUTH_ERROR',
              message: error || 'Unknown social auth error',
              timestamp: new Date().toISOString(),
              platform: Platform.OS,
              mode: isSignUp ? 'signup' : 'signin'
            };
            
            setCrashDetails(`Social Auth Error: ${JSON.stringify(errorDetails, null, 2)}`);
            setShowCrashDetails(true);
            setErrorMessage(error);
            setLoading(false);
          }}
        />
        </View>
      </View>
    </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    minHeight: 600,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 36,
    paddingHorizontal: 20, // Prevent title from touching edges
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
    alignSelf: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#202020',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#202020',
    fontSize: 16,
  },
  // Crash debugging styles
  crashContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    maxHeight: 300,
  },
  crashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  crashTitle: {
    color: '#856404',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  crashToggle: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  crashToggleText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: 'bold',
  },
  crashDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 8,
    maxHeight: 150,
    marginBottom: 8,
  },
  crashText: {
    color: '#495057',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  crashClearButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  crashClearText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Diagnostic styles
  diagnosticContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  diagnosticHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  diagnosticTitle: {
    color: '#1565c0',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  diagnosticButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  diagnosticButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  diagnosticResults: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  diagnosticText: {
    color: '#495057',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  diagnosticToggle: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  diagnosticToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  showDiagnosticButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 10,
    alignSelf: 'center',
  },
  showDiagnosticText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // App ready indicator styles
  readyIndicator: {
    position: 'absolute',
    top: 60, // Below status bar
    left: 20,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50', // Green color
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5,
    marginRight: 6,
  },
  readyText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

// Main export with crash boundary wrapper
export default function LoginScreen() {
  return (
    <CrashBoundary>
      <LoginScreenContent />
    </CrashBoundary>
  );
}