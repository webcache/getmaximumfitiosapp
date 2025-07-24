import { ThemedText } from '@/components/ThemedText';
import { useReduxAuth } from '@/contexts/ReduxAuthProvider';
import { useAuthFunctions } from '@/hooks/useAuthFunctions';
import CrashLogger from '@/utils/crashLogger';
import {
    isAppleSignInAvailable,
    signInWithApple,
} from '@/utils/socialAuth';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Platform, StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

interface SocialAuthButtonsProps {
  mode?: 'signin' | 'signup';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function SocialAuthButtons({
  mode = 'signin',
  onSuccess,
  onError,
}: SocialAuthButtonsProps) {
  const router = useRouter();
  const { signInWithGoogle } = useAuthFunctions();
  const { isAuthenticated, user } = useReduxAuth();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [waitingForAuth, setWaitingForAuth] = useState(false);

  // Check Apple availability on mount
  useEffect(() => {
    checkAppleAvailability();
  }, []);

  // Monitor authentication state during Google Sign-In
  useEffect(() => {
    if (waitingForAuth && isAuthenticated && user) {
      console.log('Authentication state updated, user is now authenticated');
      setWaitingForAuth(false);
      setLoadingGoogle(false);
      onSuccess?.();
    }
  }, [isAuthenticated, user, waitingForAuth, onSuccess]);

  // Safety timeout for Google Sign-In
  useEffect(() => {
    if (waitingForAuth) {
      const timeout = setTimeout(() => {
        console.warn('Google Sign-In timeout - forcing success callback');
        setWaitingForAuth(false);
        setLoadingGoogle(false);
        onSuccess?.();
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [waitingForAuth, onSuccess]);

  const checkAppleAvailability = async () => {
    try {
      CrashLogger.logAuthStep('Checking Apple Sign-In availability');
      const available = await isAppleSignInAvailable();
      setAppleAvailable(available);
      console.log('Apple availability check result:', available);
      CrashLogger.logAuthStep('Apple availability check completed', { available });
    } catch (error) {
      console.error('Error checking Apple availability:', error);
      CrashLogger.recordError(error as Error, 'APPLE_AVAILABILITY_CHECK');
      setAppleAvailable(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      setWaitingForAuth(true);
      console.log('Starting Google Sign-In...');
      CrashLogger.logGoogleSignInStep('Starting Google Sign-In process');
      
      const user = await signInWithGoogle();
      console.log('Google Sign-In completed, user:', user.uid);
      CrashLogger.logGoogleSignInStep('Google Sign-In completed successfully', { uid: user.uid });
      
      // The useEffect will handle calling onSuccess when authentication state updates
      // If already authenticated, call onSuccess immediately
      if (isAuthenticated) {
        console.log('User already authenticated, calling onSuccess immediately');
        setWaitingForAuth(false);
        setLoadingGoogle(false);
        onSuccess?.();
      }
      // Otherwise, the useEffect will handle it when the state updates
      
    } catch (error: any) {
      console.error('Google sign in error:', error);
      CrashLogger.recordError(error, 'GOOGLE_SIGNIN');
      setLoadingGoogle(false);
      setWaitingForAuth(false);
      
      // Don't show error if user cancelled
      if (error.message && error.message.includes('cancelled')) {
        CrashLogger.logGoogleSignInStep('Google Sign-In cancelled by user');
        return;
      }
      
      let errorMessage = 'Google authentication failed';
      if (error.message.includes('account-exists-with-different-credential')) {
        errorMessage = 'An account already exists with the same email address but different sign-in credentials.';
      } else if (error.message.includes('credential-already-in-use')) {
        errorMessage = 'This Google account is already linked to another user.';
      } else if (error.message.includes('play_services_not_available')) {
        errorMessage = 'Google Play Services not available. Please update Google Play Services and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      CrashLogger.logGoogleSignInStep('Google Sign-In failed', { errorMessage });
      onError?.(errorMessage);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoadingApple(true);
      CrashLogger.logAuthStep('Starting Apple Sign-In process');
      await signInWithApple();
      setLoadingApple(false);
      CrashLogger.logAuthStep('Apple Sign-In completed successfully');
      onSuccess?.();
    } catch (error: any) {
      console.error('Apple sign in error:', error);
      CrashLogger.recordError(error, 'APPLE_SIGNIN');
      setLoadingApple(false);
      
      if (error.message.includes('user_cancelled_authorize')) {
        // User cancelled, don't show error
        CrashLogger.logAuthStep('Apple Sign-In cancelled by user');
        return;
      }
      
      let errorMessage = 'Apple authentication failed';
      if (error.message.includes('not available on this device')) {
        errorMessage = 'Apple Sign In is not available in iOS Simulator. Please test on a physical iOS device with iOS 13+ and iCloud signed in.';
      } else if (error.message.includes('account-exists-with-different-credential')) {
        errorMessage = 'An account already exists with the same email address but different sign-in credentials.';
      } else if (error.message.includes('credential-already-in-use')) {
        errorMessage = 'This Apple account is already linked to another user.';
      }
      
      onError?.(errorMessage);
    }
  };

  const actionText = mode === 'signup' ? 'Sign up' : 'Sign in';

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <ThemedText style={styles.dividerText}>or {actionText.toLowerCase()} with</ThemedText>
        <View style={styles.dividerLine} />
      </View>

      {/* Google Sign In Button */}
      <TouchableOpacity
        style={[styles.socialButton, styles.googleButton]}
        onPress={handleGoogleSignIn}
        disabled={loadingGoogle}
      >
        {loadingGoogle ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <FontAwesome5 name="google" size={20} color="#4285F4" />
        )}
        <ThemedText style={[styles.socialButtonText, styles.googleButtonText]}>
          {actionText} with Google
        </ThemedText>
      </TouchableOpacity>

      {/* Apple Sign In Button (iOS only) */}
      {appleAvailable && (
        <TouchableOpacity
          style={[styles.socialButton, styles.appleButton]}
          onPress={handleAppleSignIn}
          disabled={loadingApple}
        >
          {loadingApple ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <FontAwesome5 name="apple" size={20} color="#FFFFFF" />
          )}
          <ThemedText style={[styles.socialButtonText, styles.appleButtonText]}>
            {actionText} with Apple
          </ThemedText>
        </TouchableOpacity>
      )}

      {/* Debug: Force Apple Button (for simulator testing) */}
      {!appleAvailable && Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.socialButton, styles.appleButton, { opacity: 0.7 }]}
          onPress={handleAppleSignIn}
          disabled={loadingApple}
        >
          {loadingApple ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <FontAwesome5 name="apple" size={20} color="#FFFFFF" />
          )}
          <ThemedText style={[styles.socialButtonText, styles.appleButtonText]}>
            {actionText} with Apple (Simulator)
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#666',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    minHeight: 50,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  googleButtonText: {
    color: '#333333',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleButtonText: {
    color: '#FFFFFF',
  },
});
