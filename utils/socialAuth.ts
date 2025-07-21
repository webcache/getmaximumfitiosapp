import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, linkWithCredential, OAuthProvider, signInWithCredential, User } from 'firebase/auth';
import { Platform } from 'react-native';
import { auth } from '../firebase';

// Import Apple Authentication for iOS
let AppleAuthentication: any = null;
if (Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (error) {
    console.warn('Apple Authentication module not available:', error);
  }
}

// Complete the auth session when the page loads
WebBrowser.maybeCompleteAuthSession();

/**
 * Simple crypto-free state generation for OAuth
 */
const generateSimpleState = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Create redirect URI for OAuth
 */
const createRedirectUri = (): string => {
  return `exp://192.168.1.1:8081`; // Simple redirect for custom dev environment
};

/**
 * Get Google client ID for current platform from environment variables
 */
const getGoogleClientId = () => {
  const clientId = Platform.select({
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  if (!clientId) {
    throw new Error('Google client ID not found in environment variables. Please check your .env file.');
  }

  return clientId;
};

/**
 * Exchange Google auth code for ID token
 */
export const exchangeGoogleCodeForToken = async (code: string): Promise<string> => {
  try {
    const clientId = getGoogleClientId();
    const redirectUri = createRedirectUri();

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to exchange code for token');
    }

    return data.id_token;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

/**
 * Sign in with Google using auth code
 */
export const signInWithGoogleCode = async (code: string): Promise<User> => {
  try {
    const idToken = await exchangeGoogleCodeForToken(code);
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

/**
 * Link Google account using auth code
 */
export const linkGoogleAccountWithCode = async (user: User, code: string): Promise<void> => {
  try {
    const idToken = await exchangeGoogleCodeForToken(code);
    const credential = GoogleAuthProvider.credential(idToken);
    await linkWithCredential(user, credential);
  } catch (error) {
    console.error('Google account linking error:', error);
    throw error;
  }
};

/**
 * Sign in with Apple (iOS only)
 */
export const signInWithApple = async (): Promise<User> => {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS');
    }
    
    if (!AppleAuthentication) {
      throw new Error('Apple Authentication module not available');
    }
    
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple authentication is not available on this device');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple sign in failed - no identity token received');
    }

    // Create Firebase credential
    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: credential.identityToken,
    });

    const userCredential = await signInWithCredential(auth, firebaseCredential);
    
    // Store Apple name data if available for new users
    if (credential.fullName) {
      console.log('Apple user name data:', credential.fullName);
      // This will be handled in AuthContext when creating/updating the profile
    }

    return userCredential.user;
  } catch (error) {
    console.error('Apple sign in error:', error);
    throw error;
  }
};

/**
 * Link Apple account to existing user (iOS only)
 */
export const linkAppleAccount = async (user: User): Promise<void> => {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS');
    }

    if (!AppleAuthentication) {
      throw new Error('Apple Authentication module not available');
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple authentication is not available on this device');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple sign in failed - no identity token received');
    }

    // Create Firebase credential
    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: credential.identityToken,
    });

    await linkWithCredential(user, firebaseCredential);
  } catch (error) {
    console.error('Apple account linking error:', error);
    throw error;
  }
};

/**
 * Check if Apple Sign In is available
 * NOTE: Apple Sign In is NOT available in iOS Simulator - only on physical devices with iOS 13+
 */
export const isAppleSignInAvailable = async (): Promise<boolean> => {
  console.log('Checking Apple Sign In availability...');
  console.log('Platform.OS:', Platform.OS);
  
  if (Platform.OS !== 'ios') {
    console.log('Not iOS platform, Apple Sign In not available');
    return false;
  }
  
  try {
    if (!AppleAuthentication) {
      console.log('AppleAuthentication module not loaded');
      return false;
    }
    
    console.log('AppleAuthentication module available, checking async...');
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    console.log('Apple Sign In isAvailableAsync result:', isAvailable);
    
    // Additional context for developers
    if (!isAvailable) {
      console.log('Apple Sign In not available - this is normal in iOS Simulator.');
      console.log('To test Apple Sign In, you need:');
      console.log('1. Physical iOS device with iOS 13+');
      console.log('2. Device signed into iCloud');
      console.log('3. Two-factor authentication enabled on Apple ID');
    }
    
    return isAvailable;
  } catch (error) {
    console.error('Error checking Apple Sign In availability:', error);
    return false;
  }
};

/**
 * Get user's linked providers
 */
export const getUserProviders = (user: User): string[] => {
  return user.providerData.map(provider => provider.providerId) || [];
};

/**
 * Check if user has specific provider linked
 */
export const hasProviderLinked = (user: User, providerId: string): boolean => {
  return getUserProviders(user).includes(providerId);
};
