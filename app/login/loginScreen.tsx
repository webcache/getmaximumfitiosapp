import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import SocialAuthButtons from '@/components/SocialAuthButtons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../firebase';

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
  const { user, saveUserToken } = useAuth();
  const router = useRouter();

  // Navigate to dashboard if user is already authenticated
  useEffect(() => {
    if (user) {
      console.log('User authenticated, navigating to dashboard');
      router.replace('/(tabs)/dashboard');
    }
  }, [user, router]);

  const handleAuth = async () => {
    if (!email || !password) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setErrorMessage(''); // Clear any previous errors

    try {
      if (isSignUp) {
        // Sign up new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User signed up:', userCredential.user.uid);
        
        // Create profile document in Firestore
        await setDoc(doc(db, 'profiles', userCredential.user.uid), {
          email: email.toLowerCase(),
          firstName: firstName || '',
          lastName: lastName || '',
          phone: phone || '',
          height: height || '',
          weight: weight || '',
          googleLinked: false,
          displayName: `${firstName} ${lastName}`.trim() || '',
          photoURL: '',
          createdAt: new Date().toISOString(),
          uid: userCredential.user.uid
        });
        
        console.log('Profile created successfully');
        
        // Save the ID token for persistence (Firebase 11+ workaround)
        const idToken = await userCredential.user.getIdToken();
        await saveUserToken(idToken);
      } else {
        // Sign in existing user
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('User signed in:', userCredential.user.uid);
        
        // Save the ID token for persistence (Firebase 11+ workaround)
        const idToken = await userCredential.user.getIdToken();
        await saveUserToken(idToken);
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
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
            // Navigation will be handled by AuthContext
            console.log('Social auth successful');
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
    paddingTop: 20,
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