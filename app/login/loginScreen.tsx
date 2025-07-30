import SocialAuthButtons from '@/components/SocialAuthButtons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { EmailAuthProvider } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

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
  const { isAuthenticated, signIn, signUp } = useAuth();
  const router = useRouter();

  // This useEffect handles navigation after a successful login or signup.
  // It listens for the `isAuthenticated` state change from the `useAuth` hook
  useEffect(() => {
    if (isAuthenticated) {
      console.log('✅ LOGIN SCREEN: User authenticated, navigating to dashboard...');
      
      // Add production-specific delay before navigation
      const NAVIGATION_DELAY = __DEV__ ? 100 : 500;
      
      setTimeout(() => {
        try {
          router.replace('/(tabs)/dashboard');
        } catch (navError) {
          console.error('Navigation error from login screen:', navError);
          // Fallback navigation attempt
          setTimeout(() => {
            try {
              router.replace('/(tabs)/dashboard');
            } catch (retryError) {
              console.error('Navigation retry failed from login screen:', retryError);
            }
          }, 1000);
        }
      }, NAVIGATION_DELAY);
    }
  }, [isAuthenticated, router]);

  const handleAuth = async () => {
    if (!email || !password) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setErrorMessage(''); // Clear any previous errors

    try {
      console.log('🔄 LOGIN SCREEN: Starting authentication...');
      
      // Add bridge stabilization delay before auth operations
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (isSignUp) {
        // Sign up new user - wrapped in try-catch for bridge safety
        try {
          const profileData = {
            firstName: firstName || '',
            lastName: lastName || '',
            phone: phone || '',
            height: height || '',
            weight: weight || '',
          };
          
          await signUp(email, password, profileData);
          console.log('✅ Sign up successful, waiting for auth state change...');
          // Navigation is handled by the useEffect hook with delays
        } catch (signUpError) {
          console.error('❌ Sign up error:', signUpError);
          throw signUpError;
        }
      } else {
        // Sign in existing user - wrapped in try-catch for bridge safety
        try {
          const credential = EmailAuthProvider.credential(email, password);
          
          // Add additional delay before sign-in to prevent bridge conflicts
          await new Promise(resolve => setTimeout(resolve, 100));
          
          await signIn(credential);
          console.log('✅ Sign in successful, waiting for auth state change...');
          // Navigation is handled by the useEffect hook with delays
        } catch (signInError) {
          console.error('❌ Sign in error:', signInError);
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