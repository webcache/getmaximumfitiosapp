import { GoogleSignin } from '@react-native-google-signin/google-signin';
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

// Configure Google Sign-In
const configureGoogleSignIn = () => {
  try {
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    
    if (!iosClientId) {
      throw new Error('Google iOS Client ID not found. Please check your environment variables.');
    }

    const config: any = {
      iosClientId: iosClientId,
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    };

    GoogleSignin.configure(config);
    
    console.log('Google Sign-In configured successfully for iOS', {
      iosClientId: iosClientId?.substring(0, 20) + '...',
      platform: Platform.OS
    });
  } catch (error) {
    console.error('Failed to configure Google Sign-In:', error);
  }
};

// Initialize Google Sign-In configuration
// NOTE: Google Sign-In is now configured in app/_layout.tsx
// This ensures it's configured early in the app lifecycle
// configureGoogleSignIn();

/**
 * Sign in with Google using the Google Sign-In SDK
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {
    console.log('Starting Google Sign-In process...');
    
    // Check if device supports Google Play Services
    await GoogleSignin.hasPlayServices();
    
    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();
    console.log('Google Sign-In successful:', userInfo);
    
    // Get the ID token and access token
    const idToken = userInfo.data?.idToken;
    // Note: Access token might not be available in all Google Sign-In configurations
    const accessToken = (userInfo as any).data?.accessToken || (userInfo as any).accessToken || '';
    
    if (!idToken) {
      throw new Error('No ID token received from Google Sign-In');
    }
    
    // DEPRECATED: Direct Firebase credential handling
    // This should be handled by TokenAuthService instead
    console.warn('⚠️ socialAuth.ts is using deprecated firebaseAuthService. Use TokenAuthService instead.');
    
    // Create credential and sign in directly with Firebase
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    
    console.log('Firebase authentication successful (legacy method)');
    
    return user;
  } catch (error: any) {
    console.error('Google Sign-In error:', error);
    
    // Handle specific error cases
    if (error.code === 'sign_in_cancelled') {
      throw new Error('Google Sign-In was cancelled by the user');
    } else if (error.code === 'in_progress') {
      throw new Error('Google Sign-In is already in progress');
    } else if (error.code === 'play_services_not_available') {
      throw new Error('Google Play Services not available on this device');
    } else {
      throw new Error(error.message || 'Google Sign-In failed');
    }
  }
};

/**
 * Link Google account to existing user using Google Sign-In SDK
 */
export const linkGoogleAccount = async (user: User): Promise<void> => {
  try {
    console.log('Starting Google account linking...');
    
    // Check if device supports Google Play Services
    await GoogleSignin.hasPlayServices();
    
    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();
    console.log('Google Sign-In for linking successful:', userInfo);
    
    // Get the ID token
    const idToken = userInfo.data?.idToken;
    if (!idToken) {
      throw new Error('No ID token received from Google Sign-In');
    }
    
    // Create a Google credential with the token
    const googleCredential = GoogleAuthProvider.credential(idToken);
    
    // Link the credential to the current user
    await linkWithCredential(user, googleCredential);
    console.log('Google account linked successfully');
  } catch (error: any) {
    console.error('Google account linking error:', error);
    
    // Handle specific error cases
    if (error.code === 'sign_in_cancelled') {
      throw new Error('Google Sign-In was cancelled by the user');
    } else if (error.code === 'in_progress') {
      throw new Error('Google Sign-In is already in progress');
    } else if (error.code === 'play_services_not_available') {
      throw new Error('Google Play Services not available on this device');
    } else {
      throw new Error(error.message || 'Failed to link Google account');
    }
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
