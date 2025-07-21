import { ThemedText } from '@/components/ThemedText';
import {
    isAppleSignInAvailable,
    signInWithApple,
    signInWithGoogleCode,
} from '@/utils/socialAuth';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Google Auth - simplified to avoid ExpoCrypto dependency
  const getGoogleClientId = () => {
    const clientId = Platform.select({
      ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    if (!clientId) {
      throw new Error('Google client ID not found. Please configure your .env file with EXPO_PUBLIC_GOOGLE_*_CLIENT_ID variables.');
    }

    return clientId;
  };

  /**
   * Simple OAuth URL builder without crypto dependency
   */
  const buildGoogleOAuthUrl = () => {
    const clientId = getGoogleClientId();
    const redirectUri = `exp://192.168.1.1:8081`; // Simple redirect for custom dev
    const state = Math.random().toString(36).substring(2, 15);
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  // Check Apple availability on mount
  useEffect(() => {
    checkAppleAvailability();
  }, []);

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
      
      // Create OAuth URL
      const clientId = getGoogleClientId();
      const redirectUri = encodeURIComponent('https://auth.expo.io/@anonymous/getmaximumfitiosapp');
      const state = Math.random().toString(36).substring(7);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid profile email')}&` +
        `state=${state}&` +
        `prompt=select_account`;
      
      // Open browser
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        
        if (code) {
          await handleGoogleAuthCode(code);
        } else {
          throw new Error('No authorization code received');
        }
      } else if (result.type === 'cancel') {
        // User cancelled, no error needed
        setLoadingGoogle(false);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      setLoadingGoogle(false);
      onError?.('Failed to authenticate with Google');
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
