import * as AppleAuthentication from 'expo-apple-authentication';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';

interface SocialAuthButtonsProps {
  isAppleAvailable?: boolean;
}

export default function SocialAuthButtons({ isAppleAvailable = false }: SocialAuthButtonsProps) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState<{ google: boolean; apple: boolean }>({
    google: false,
    apple: false,
  });

  const handleGoogleSignIn = async () => {
    try {
      setLoading(prev => ({ ...prev, google: true }));
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      let errorMessage = 'Failed to sign in with Google. Please try again.';
      
      if (error.message?.includes('Client ID')) {
        errorMessage = 'Google authentication is not properly configured.';
      }
      
      Alert.alert('Sign In Error', errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, google: false }));
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(prev => ({ ...prev, apple: true }));
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = credential;
      if (identityToken) {
        const provider = new OAuthProvider('apple.com');
        const authCredential = provider.credential({
          idToken: identityToken,
        });
        await signInWithCredential(auth, authCredential);
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in flow
        return;
      }
      console.error('Apple sign-in error:', error);
      Alert.alert('Sign In Error', 'Failed to sign in with Apple. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, apple: false }));
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleGoogleSignIn}
        disabled={loading.google}
      >
        <Text style={styles.buttonText}>
          {loading.google ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>
      
      {isAppleAvailable && (
        <TouchableOpacity
          style={styles.button}
          onPress={handleAppleSignIn}
          disabled={loading.apple}
        >
          <Text style={styles.buttonText}>
            {loading.apple ? 'Signing in...' : 'Continue with Apple'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  button: {
    backgroundColor: '#2d2d2d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
