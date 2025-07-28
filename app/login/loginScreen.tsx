import SocialAuthButtons from '@/components/SocialAuthButtons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReduxAuth } from '../../contexts/ReduxAuthProvider';
import { useAuthFunctions } from '../../hooks/useAuthFunctions';

export default function LoginScreen() {
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
  const [hasNavigated, setHasNavigated] = useState(false);
  const { user, isAuthenticated, initialized, persistenceRestored } = useReduxAuth();
  const { signIn, signUp, getAuthState } = useAuthFunctions();
  const router = useRouter();
  const lastStateKeyRef = useRef('');

  // Debug the Redux state (reduced logging to prevent spam)
  useEffect(() => {
    // Only log state changes, not every render
    const stateKey = `${isAuthenticated}-${!!user}-${initialized}-${persistenceRestored}-${hasNavigated}`;
    
    if (stateKey !== lastStateKeyRef.current) {
      console.log('🔍 LOGIN SCREEN: State changed:', {
        user: user ? { uid: user.uid, email: user.email } : null,
        isAuthenticated,
        initialized,
        persistenceRestored,
        hasNavigated,
        timestamp: new Date().toISOString()
      });
      lastStateKeyRef.current = stateKey;
    }
  }, [user, isAuthenticated, initialized, persistenceRestored, hasNavigated]);

  // Watch for authentication state changes and navigate when user is authenticated
  useEffect(() => {
    // Only log when conditions are met for navigation
    if (isAuthenticated && user && initialized && persistenceRestored && !hasNavigated) {
      console.log('✅ LOGIN SCREEN: User authenticated, navigating to dashboard...', {
        userEmail: user.email,
        uid: user.uid
      });
      setHasNavigated(true);
      
      // Use a small delay to ensure all state updates are complete
      const timer = setTimeout(() => {
        try {
          // Primary navigation attempt
          router.replace('/(tabs)/dashboard');
          console.log('🚀 LOGIN SCREEN: Navigation executed');
        } catch (error) {
          console.error('❌ LOGIN SCREEN: Navigation failed:', error);
          setHasNavigated(false); // Reset on failure
        }
      }, 200);

      return () => clearTimeout(timer);
    }
    
    // Reset navigation flag if user becomes unauthenticated (but don't log every time)
    if (!isAuthenticated && hasNavigated) {
      setHasNavigated(false);
    }
  }, [isAuthenticated, user, initialized, persistenceRestored, router]);
  // Removed hasNavigated from dependencies to prevent re-triggering on navigation state change

  // Navigation is handled by app/index.tsx - no navigation logic needed here
  // This prevents conflicts between multiple navigation systems

  const handleAuth = async () => {
    if (!email || !password) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setErrorMessage(''); // Clear any previous errors

    try {
      console.log('🔄 LOGIN SCREEN: Starting authentication...');
      
      let authenticatedUser: any = null;
      
      if (isSignUp) {
        // Sign up new user
        const profileData = {
          firstName: firstName || '',
          lastName: lastName || '',
          phone: phone || '',
          height: height || '',
          weight: weight || '',
          googleLinked: false,
        };
        
        authenticatedUser = await signUp(email, password, profileData);
        console.log('✅ LOGIN SCREEN: Sign-up successful, user:', authenticatedUser?.email);
      } else {
        // Sign in existing user
        authenticatedUser = await signIn(email, password);
        console.log('✅ LOGIN SCREEN: Sign-in successful, user:', authenticatedUser?.email);
      }
      
      console.log('✅ LOGIN SCREEN: Authentication completed successfully');
      
      // Check if navigation should happen immediately (fallback mechanism)
      setTimeout(() => {
        const updatedState = getAuthState();
        if (updatedState.isAuthenticated && updatedState.user && !hasNavigated) {
          console.log('🚀 LOGIN SCREEN: Fallback navigation triggered');
          setHasNavigated(true);
          router.replace('/(tabs)/dashboard');
        }
      }, 500);
      
      // Don't use local state for navigation - the useEffect will handle it
      // when Redux state updates trigger a re-render
      
    } catch (error: any) {
      let errorMessage = 'An error occurred during authentication';
      
      switch (error.code) {
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
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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

        {/* Social Authentication Buttons */}
        <SocialAuthButtons
          mode={isSignUp ? 'signup' : 'signin'}
          onSuccess={() => {
            // Navigation will be handled by app/index.tsx
          }}
          onError={(error) => {
            setErrorMessage(error);
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
});