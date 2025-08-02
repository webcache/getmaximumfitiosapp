import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SocialAuthButtons from '../../components/SocialAuthButtons';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  return <LoginScreenContent />;
}

function LoginScreenContent() {
  const { signInWithEmail, createAccount, user, loading } = useAuth();
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const router = useRouter();

  // Check Apple availability
  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
  }, []);

    // Redirect to dashboard if user becomes authenticated
  useEffect(() => {
    if (user && !loading) {
      console.log('🔄 Login: User authenticated, redirecting to dashboard');
      router.replace('/(tabs)/dashboard');
    }
  }, [user, loading, router]);

  const handleEmailSignIn = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setFormLoading(true);
    try {
      await signInWithEmail(formData.email, formData.password);
    } catch (error: any) {
      let errorMessage = 'Failed to sign in';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      }
      Alert.alert('Sign In Failed', errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!formData.email || !formData.password || !formData.firstName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setFormLoading(true);
    try {
      await createAccount(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      Alert.alert('Account Creation Failed', errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Image 
                source={require('../../assets/images/MF-logo-small.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Welcome to GetMaximumFit</Text>
              <Text style={styles.subtitle}>
                {isCreatingAccount ? 'Create your account to get started' : 'Sign in to continue your fitness journey'}
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>
                {isCreatingAccount ? 'Create Account' : 'Sign In with Email'}
              </Text>

              {isCreatingAccount && (
                <>
                  <View style={styles.nameRow}>
                    <TextInput
                      style={[styles.input, styles.nameInput]}
                      placeholder="First Name*"
                      value={formData.firstName}
                      onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                    <TextInput
                      style={[styles.input, styles.nameInput]}
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                </>
              )}

              <TextInput
                style={styles.input}
                placeholder="Email*"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                style={styles.input}
                placeholder="Password*"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              {isCreatingAccount && (
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password*"
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}

              <TouchableOpacity
                style={[styles.primaryButton, formLoading && styles.buttonDisabled]}
                onPress={isCreatingAccount ? handleCreateAccount : handleEmailSignIn}
                disabled={formLoading}
              >
                {formLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isCreatingAccount ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchModeButton}
                onPress={() => setIsCreatingAccount(!isCreatingAccount)}
              >
                <Text style={styles.switchModeText}>
                  {isCreatingAccount 
                    ? 'Already have an account? Sign In' 
                    : "Don't have an account? Create one"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialSection}>
              <Text style={styles.sectionTitle}>Quick Sign In</Text>
              <SocialAuthButtons isAppleAvailable={isAppleAvailable} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  formSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  nameInput: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#2d2d2d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  switchModeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchModeText: {
    color: '#2d2d2d',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
  },
  socialSection: {
    marginBottom: 15,
  },
  authSection: {
    marginTop: 20,
  },
});