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
  const { isAuthenticated, user, initialized, persistenceRestored } = useReduxAuth();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [authCompleted, setAuthCompleted] = useState(false);

  // Check Apple availability on mount
  useEffect(() => {
    checkAppleAvailability();
  }, []);

  // Monitor authentication state changes for success handling
  useEffect(() => {
    // Only handle success if auth system is fully initialized
    if (!initialized || !persistenceRestored) {
      return;
    }

    if (isAuthenticated && user && !authCompleted) {
      CrashLogger.logGoogleSignInStep('Setting auth completed and checking onSuccess callback');
      setAuthCompleted(true);
      setLoadingGoogle(false);
      setLoadingApple(false);
      
      // Call success callback only if it's not an empty function
      // This prevents race conditions when parent component handles navigation via useEffect
      const onSuccessStr = onSuccess?.toString() || '';
      const shouldCallOnSuccess = onSuccess && !onSuccessStr.includes('Navigation will be handled by AuthContext');
      
      CrashLogger.logGoogleSignInStep('OnSuccess callback decision', { 
        hasCallback: !!onSuccess, 
        shouldCall: shouldCallOnSuccess,
        callbackContent: onSuccessStr.slice(0, 100)
      });
      
      if (shouldCallOnSuccess) {
        onSuccess();
      }
    }
  }, [isAuthenticated, user, authCompleted, onSuccess, initialized, persistenceRestored]);

  const checkAppleAvailability = async () => {
    try {
      CrashLogger.logAuthStep('Checking Apple Sign-In availability');
      const available = await isAppleSignInAvailable();
      setAppleAvailable(available);
      CrashLogger.logAuthStep('Apple availability check completed', { available });
    } catch (error) {
      CrashLogger.recordError(error as Error, 'APPLE_AVAILABILITY_CHECK');
      setAppleAvailable(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      setAuthCompleted(false); // Reset auth completion state
      CrashLogger.logGoogleSignInStep('Starting Google Sign-In process');
      
      const user = await signInWithGoogle();
      CrashLogger.logGoogleSignInStep('Google Sign-In completed successfully', { uid: user.uid });
      
      // Let the useEffect handle success callback when state updates
      
    } catch (error: any) {
      CrashLogger.recordError(error, 'GOOGLE_SIGNIN');
      setLoadingGoogle(false);
      setAuthCompleted(false);
      
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
