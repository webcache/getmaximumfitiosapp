// Simple working version of social auth tests
jest.mock('@react-native-google-signin/google-signin');
jest.mock('expo-apple-authentication'); 
jest.mock('expo-web-browser');
jest.mock('firebase/auth');
jest.mock('../firebase');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../utils/crashLogger');

describe('Social Authentication Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Set up environment variables
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'test-ios-client-id';
  });

  describe('Module Loading', () => {
    it('should load without throwing errors', () => {
      expect(() => {
        require('../utils/socialAuth');
      }).not.toThrow();
    });
  });

  describe('Google Sign In', () => {
    it('should handle successful Google sign in', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const { GoogleAuthProvider, signInWithCredential } = require('firebase/auth');
      
      // Mock successful response
      GoogleSignin.signIn.mockResolvedValue({
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token',
        user: { id: 'user-id', email: 'test@gmail.com' }
      });
      
      GoogleAuthProvider.credential.mockReturnValue('mock-credential');
      signInWithCredential.mockResolvedValue({ 
        user: { uid: 'firebase-uid', email: 'test@gmail.com' }
      });
      
      const { signInWithGoogle } = require('../utils/socialAuth');
      const result = await signInWithGoogle();
      
      expect(result).toBeDefined();
      expect(GoogleSignin.signIn).toHaveBeenCalled();
    });

    it('should handle Google sign in errors', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      
      GoogleSignin.signIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
      
      const { signInWithGoogle } = require('../utils/socialAuth');
      await expect(signInWithGoogle()).rejects.toThrow();
    });
  });

  describe('Apple Sign In', () => {
    it('should check Apple availability', async () => {
      const AppleAuthentication = require('expo-apple-authentication');
      AppleAuthentication.isAvailableAsync.mockResolvedValue(true);
      
      const { isAppleSignInAvailable } = require('../utils/socialAuth');
      const result = await isAppleSignInAvailable();
      
      expect(typeof result).toBe('boolean');
    });

    it('should handle successful Apple sign in', async () => {
      const AppleAuthentication = require('expo-apple-authentication');
      const { signInWithCredential } = require('firebase/auth');
      
      AppleAuthentication.isAvailableAsync.mockResolvedValue(true);
      AppleAuthentication.signInAsync.mockResolvedValue({
        identityToken: 'mock-token',
        user: 'user-id'
      });
      
      signInWithCredential.mockResolvedValue({
        user: { uid: 'firebase-uid', email: 'test@icloud.com' }
      });
      
      const { signInWithApple } = require('../utils/socialAuth');
      const result = await signInWithApple();
      
      expect(result).toBeDefined();
      expect(AppleAuthentication.signInAsync).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      
      GoogleSignin.signIn.mockRejectedValue({ code: 'NETWORK_ERROR' });
      
      const { signInWithGoogle } = require('../utils/socialAuth');
      await expect(signInWithGoogle()).rejects.toThrow();
    });

    it('should handle missing tokens', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      
      GoogleSignin.signIn.mockResolvedValue({
        user: { id: 'user-id', email: 'test@gmail.com' }
        // Missing idToken
      });
      
      const { signInWithGoogle } = require('../utils/socialAuth');
      await expect(signInWithGoogle()).rejects.toThrow();
    });
  });

  describe('Token Persistence', () => {
    it('should save tokens to AsyncStorage', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const { GoogleAuthProvider, signInWithCredential } = require('firebase/auth');
      
      GoogleSignin.signIn.mockResolvedValue({
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token',
        user: { id: 'user-id', email: 'test@gmail.com' }
      });
      
      GoogleAuthProvider.credential.mockReturnValue('mock-credential');
      signInWithCredential.mockResolvedValue({ 
        user: { 
          uid: 'firebase-uid', 
          email: 'test@gmail.com',
          getIdToken: jest.fn().mockResolvedValue('firebase-token')
        }
      });
      
      const { signInWithGoogle } = require('../utils/socialAuth');
      await signInWithGoogle();
      
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const { GoogleAuthProvider, signInWithCredential } = require('firebase/auth');
      
      GoogleSignin.signIn.mockResolvedValue({
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token',
        user: { id: 'user-id', email: 'test@gmail.com' }
      });
      
      GoogleAuthProvider.credential.mockReturnValue('mock-credential');
      signInWithCredential.mockResolvedValue({ 
        user: { 
          uid: 'firebase-uid', 
          email: 'test@gmail.com',
          getIdToken: jest.fn().mockResolvedValue('firebase-token')
        }
      });
      
      const { signInWithGoogle } = require('../utils/socialAuth');
      
      // Should not throw even if storage fails
      const result = await signInWithGoogle();
      expect(result).toBeDefined();
    });
  });
});
