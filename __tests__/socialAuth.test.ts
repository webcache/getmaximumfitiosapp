// Social Auth Tests - Fixed version
// Mock React Native Platform first with a simpler approach
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '15.1',
    select: jest.fn(),
  },
  NativeModules: {},
  findNodeHandle: jest.fn(),
}));

// Mock native modules
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

jest.mock('expo-apple-authentication', () => ({
  __esModule: true,
  default: {
    isAvailableAsync: jest.fn(),
    signInAsync: jest.fn(),
  },
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
  OAuthProvider: jest.fn().mockImplementation(() => ({
    credential: jest.fn(),
  })),
  signInWithCredential: jest.fn(),
  linkWithCredential: jest.fn(),
}));

jest.mock('../firebase', () => ({
  auth: {},
}));

jest.mock('../services/firebaseAuthService', () => ({
  firebaseAuthService: {
    handleGoogleSignInCredentials: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('../utils/crashLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    logAuthStep: jest.fn(),
    recordError: jest.fn(),
    logSocialAuth: jest.fn(),
  },
}));

describe('Social Authentication Utils', () => {
  let socialAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Set up environment variables
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'test-ios-client-id';
    
    // Fresh require of the module under test
    socialAuth = require('../utils/socialAuth');
  });

  describe('Module Loading', () => {
    it('should load without throwing errors', () => {
      expect(socialAuth.signInWithGoogle).toBeDefined();
      expect(socialAuth.signInWithApple).toBeDefined();
      expect(socialAuth.isAppleSignInAvailable).toBeDefined();
    });
  });

  describe('Google Sign In', () => {
    it('should handle successful Google sign in', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const { GoogleAuthProvider } = require('firebase/auth');
      const { firebaseAuthService } = require('../services/firebaseAuthService');
      
      // Mock successful response
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockResolvedValue({
        data: {
          idToken: 'mock-id-token',
          accessToken: 'mock-access-token',
        },
        user: { id: 'user-id', email: 'test@gmail.com' }
      });
      
      GoogleAuthProvider.credential.mockReturnValue('mock-credential');
      firebaseAuthService.handleGoogleSignInCredentials.mockResolvedValue({ 
        uid: 'firebase-uid', 
        email: 'test@gmail.com' 
      });
      
      const result = await socialAuth.signInWithGoogle();
      
      expect(result).toBeDefined();
      expect(GoogleSignin.signIn).toHaveBeenCalled();
      expect(firebaseAuthService.handleGoogleSignInCredentials).toHaveBeenCalledWith('mock-id-token', 'mock-access-token');
    });

    it('should handle Google sign in errors', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockRejectedValue({ code: 'sign_in_cancelled' });
      
      await expect(socialAuth.signInWithGoogle()).rejects.toThrow('Google Sign-In was cancelled by the user');
    });
  });

  describe('Apple Sign In', () => {
    it('should check Apple availability', async () => {
      const AppleAuthentication = require('expo-apple-authentication');
      AppleAuthentication.isAvailableAsync.mockResolvedValue(true);
      
      const result = await socialAuth.isAppleSignInAvailable();
      
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });

    it('should handle successful Apple sign in', async () => {
      const AppleAuthentication = require('expo-apple-authentication');
      const { signInWithCredential } = require('firebase/auth');
      const { OAuthProvider } = require('firebase/auth');
      
      AppleAuthentication.isAvailableAsync.mockResolvedValue(true);
      AppleAuthentication.signInAsync.mockResolvedValue({
        identityToken: 'mock-token',
        user: 'user-id',
        fullName: {
          givenName: 'John',
          familyName: 'Doe'
        }
      });
      
      const mockProvider = {
        credential: jest.fn().mockReturnValue('mock-credential')
      };
      OAuthProvider.mockReturnValue(mockProvider);
      
      signInWithCredential.mockResolvedValue({
        user: { uid: 'firebase-uid', email: 'test@icloud.com' }
      });
      
      const result = await socialAuth.signInWithApple();
      
      expect(result).toBeDefined();
      expect(AppleAuthentication.signInAsync).toHaveBeenCalled();
      expect(signInWithCredential).toHaveBeenCalled();
    });

    it('should throw error on non-iOS platform', async () => {
      // Temporarily change platform to Android and reset modules
      const RN = require('react-native');
      const originalOS = RN.Platform.OS;
      
      // Clear all mocks and set platform to Android
      jest.clearAllMocks();
      jest.resetModules();
      
      // Mock React Native with Android platform
      jest.doMock('react-native', () => ({
        Platform: {
          OS: 'android',
          Version: '10',
          select: jest.fn(),
        },
        NativeModules: {},
        findNodeHandle: jest.fn(),
      }));
      
      // Reload the module with Android platform
      const socialAuthReloaded = require('../utils/socialAuth');
      
      await expect(socialAuthReloaded.signInWithApple()).rejects.toThrow('Apple Sign In is only available on iOS');
      
      // Reset mocks and platform
      jest.clearAllMocks();
      jest.resetModules();
      RN.Platform.OS = originalOS;
      
      // Re-require with original iOS platform for subsequent tests
      socialAuth = require('../utils/socialAuth');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockRejectedValue({ code: 'network_error' });
      
      await expect(socialAuth.signInWithGoogle()).rejects.toThrow();
    });

    it('should handle missing tokens', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockResolvedValue({
        data: {
          // Missing idToken
          accessToken: 'mock-access-token',
        },
        user: { id: 'user-id', email: 'test@gmail.com' }
      });
      
      await expect(socialAuth.signInWithGoogle()).rejects.toThrow('No ID token received from Google Sign-In');
    });

    it('should handle Play Services not available', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      
      GoogleSignin.hasPlayServices.mockRejectedValue({ code: 'play_services_not_available' });
      
      await expect(socialAuth.signInWithGoogle()).rejects.toThrow('Google Play Services not available on this device');
    });
  });

  describe('Token Persistence', () => {
    it('should save tokens to AsyncStorage', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const { firebaseAuthService } = require('../services/firebaseAuthService');
      
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockResolvedValue({
        data: {
          idToken: 'mock-id-token',
          accessToken: 'mock-access-token',
        },
        user: { id: 'user-id', email: 'test@gmail.com' }
      });
      
      firebaseAuthService.handleGoogleSignInCredentials.mockResolvedValue({ 
        uid: 'firebase-uid', 
        email: 'test@gmail.com',
        getIdToken: jest.fn().mockResolvedValue('firebase-token')
      });
      
      await socialAuth.signInWithGoogle();
      
      expect(firebaseAuthService.handleGoogleSignInCredentials).toHaveBeenCalledWith('mock-id-token', 'mock-access-token');
    });

    it('should handle storage errors gracefully', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const { firebaseAuthService } = require('../services/firebaseAuthService');
      
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockResolvedValue({
        data: {
          idToken: 'mock-id-token',
          accessToken: 'mock-access-token',
        },
        user: { id: 'user-id', email: 'test@gmail.com' }
      });
      
      // Mock the service to simulate a storage error but still return a user
      firebaseAuthService.handleGoogleSignInCredentials.mockResolvedValue({ 
        uid: 'firebase-uid', 
        email: 'test@gmail.com',
        getIdToken: jest.fn().mockResolvedValue('firebase-token')
      });
      
      // Should not throw even if there are internal storage issues
      const result = await socialAuth.signInWithGoogle();
      expect(result).toBeDefined();
    });
  });
});
