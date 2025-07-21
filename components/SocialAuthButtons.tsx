import { ThemedText } from '@/components/ThemedText';
import {
    isAppleSignInAvailable,
    signInWithApple,
    signInWithGoogleCode,
    useGoogleAuth,
} from '@/utils/socialAuth';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
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
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Google Auth Hook
  const { request, response, promptAsync } = useGoogleAuth();

  // Check Apple availability on mount
  useEffect(() => {
    checkAppleAvailability();
  }, []);

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleAuthCode(response.params.code);
    } else if (response?.type === 'error') {
      setLoadingGoogle(false);
      const errorMsg = response.params?.error_description || 'Google authentication failed';
      onError?.(errorMsg);
    } else if (response?.type === 'cancel') {
      setLoadingGoogle(false);
    }
  }, [response]);

  const checkAppleAvailability = async () => {
    try {
      const available = await isAppleSignInAvailable();
      setAppleAvailable(available);
    } catch (error) {
      console.error('Error checking Apple availability:', error);
      setAppleAvailable(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      if (!request) {
        throw new Error('Google auth request not ready');
      }
      await promptAsync();
    } catch (error) {
      console.error('Google sign in error:', error);
      setLoadingGoogle(false);
      onError?.('Failed to start Google authentication');
    }
  };

  const handleGoogleAuthCode = async (code: string) => {
    try {
      await signInWithGoogleCode(code);
      setLoadingGoogle(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Google auth code error:', error);
      setLoadingGoogle(false);
      
      let errorMessage = 'Google authentication failed';
      if (error.message.includes('account-exists-with-different-credential')) {
        errorMessage = 'An account already exists with the same email address but different sign-in credentials.';
      } else if (error.message.includes('credential-already-in-use')) {
        errorMessage = 'This Google account is already linked to another user.';
      }
      
      onError?.(errorMessage);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoadingApple(true);
      await signInWithApple();
      setLoadingApple(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Apple sign in error:', error);
      setLoadingApple(false);
      
      let errorMessage = 'Apple authentication failed';
      if (error.message.includes('user_cancelled_authorize')) {
        // User cancelled, don't show error
        return;
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
        disabled={loadingGoogle || !request}
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
