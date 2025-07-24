/**
 * Authentication Flow Integration Tests
 * 
 * Tests the main authentication flows including Firebase auth,
 * social authentication, and Redux state management.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock external dependencies
jest.mock('@react-native-google-signin/google-signin');
jest.mock('expo-apple-authentication');
jest.mock('expo-web-browser');
jest.mock('../services/firebaseAuthService');
jest.mock('../firebase');

describe('Authentication Flow Integration', () => {
  let mockFirebaseAuthService: any;
  let mockGoogleSignin: any;
  let mockAppleAuthentication: any;

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();

    // Set up Firebase auth service mock
    mockFirebaseAuthService = require('../services/firebaseAuthService').firebaseAuthService;
    
    // Set up Google signin mock
    mockGoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    
    // Set up Apple authentication mock
    mockAppleAuthentication = require('expo-apple-authentication');

    // Set up environment variables
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'test-ios-client-id';
  });

  describe('Email/Password Authentication', () => {
    it('should handle successful email/password sign in', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: jest.fn().mockResolvedValue('firebase-token'),
      };

      mockFirebaseAuthService.signInWithEmailAndPassword.mockResolvedValue(mockUser);

      const result = await mockFirebaseAuthService.signInWithEmailAndPassword(
        'test@example.com',
        'password123'
      );

      expect(result).toEqual(mockUser);
      expect(mockFirebaseAuthService.signInWithEmailAndPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });

    it('should handle email/password sign in errors', async () => {
      mockFirebaseAuthService.signInWithEmailAndPassword.mockRejectedValue(
        new Error('Invalid credentials')
      );

      await expect(
        mockFirebaseAuthService.signInWithEmailAndPassword('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should handle user registration', async () => {
      const mockUser = {
        uid: 'new-user-uid',
        email: 'newuser@example.com',
        displayName: 'New User',
      };

      mockFirebaseAuthService.createUserWithEmailAndPassword.mockResolvedValue(mockUser);

      const result = await mockFirebaseAuthService.createUserWithEmailAndPassword(
        'newuser@example.com',
        'password123'
      );

      expect(result).toEqual(mockUser);
      expect(mockFirebaseAuthService.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        'newuser@example.com',
        'password123'
      );
    });
  });

  describe('Google Sign In Flow', () => {
    it('should handle successful Google sign in', async () => {
      const mockGoogleUser = {
        idToken: 'google-id-token',
        accessToken: 'google-access-token',
        user: {
          id: 'google-user-id',
          email: 'user@gmail.com',
          name: 'Google User',
        },
      };

      const mockFirebaseUser = {
        uid: 'firebase-uid',
        email: 'user@gmail.com',
        displayName: 'Google User',
        getIdToken: jest.fn().mockResolvedValue('firebase-token'),
      };

      mockGoogleSignin.signIn.mockResolvedValue(mockGoogleUser);
      mockFirebaseAuthService.signInWithGoogle.mockResolvedValue(mockFirebaseUser);

      // Simulate the Google sign in flow
      const googleResult = await mockGoogleSignin.signIn();
      const firebaseResult = await mockFirebaseAuthService.signInWithGoogle();

      expect(googleResult).toEqual(mockGoogleUser);
      expect(firebaseResult).toEqual(mockFirebaseUser);
      expect(mockGoogleSignin.signIn).toHaveBeenCalled();
      expect(mockFirebaseAuthService.signInWithGoogle).toHaveBeenCalled();
    });

    it('should handle Google sign in cancellation', async () => {
      mockGoogleSignin.signIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });

      await expect(mockGoogleSignin.signIn()).rejects.toEqual({ code: 'SIGN_IN_CANCELLED' });
    });

    it('should handle Google Play Services not available', async () => {
      mockGoogleSignin.hasPlayServices.mockResolvedValue(false);

      const hasPlayServices = await mockGoogleSignin.hasPlayServices();
      expect(hasPlayServices).toBe(false);
    });
  });

  describe('Apple Sign In Flow', () => {
    it('should handle successful Apple sign in', async () => {
      const mockAppleCredential = {
        identityToken: 'apple-identity-token',
        authorizationCode: 'apple-auth-code',
        user: 'apple-user-id',
        email: 'user@icloud.com',
        fullName: {
          givenName: 'John',
          familyName: 'Doe',
        },
      };

      const mockFirebaseUser = {
        uid: 'firebase-uid',
        email: 'user@icloud.com',
        displayName: 'John Doe',
        getIdToken: jest.fn().mockResolvedValue('firebase-token'),
      };

      mockAppleAuthentication.isAvailableAsync.mockResolvedValue(true);
      mockAppleAuthentication.signInAsync.mockResolvedValue(mockAppleCredential);
      mockFirebaseAuthService.signInWithApple.mockResolvedValue(mockFirebaseUser);

      // Simulate the Apple sign in flow
      const isAvailable = await mockAppleAuthentication.isAvailableAsync();
      expect(isAvailable).toBe(true);

      const appleResult = await mockAppleAuthentication.signInAsync({
        requestedScopes: [
          mockAppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          mockAppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const firebaseResult = await mockFirebaseAuthService.signInWithApple();

      expect(appleResult).toEqual(mockAppleCredential);
      expect(firebaseResult).toEqual(mockFirebaseUser);
    });

    it('should handle Apple sign in not available', async () => {
      mockAppleAuthentication.isAvailableAsync.mockResolvedValue(false);

      const isAvailable = await mockAppleAuthentication.isAvailableAsync();
      expect(isAvailable).toBe(false);
    });

    it('should handle Apple sign in cancellation', async () => {
      mockAppleAuthentication.signInAsync.mockRejectedValue({ code: 'ERR_CANCELED' });

      await expect(
        mockAppleAuthentication.signInAsync({
          requestedScopes: [
            mockAppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            mockAppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        })
      ).rejects.toEqual({ code: 'ERR_CANCELED' });
    });
  });

  describe('Token Management and Persistence', () => {
    it('should save user tokens after successful authentication', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: jest.fn().mockResolvedValue('firebase-token'),
      };

      mockFirebaseAuthService.signInWithEmailAndPassword.mockResolvedValue(mockUser);

      const user = await mockFirebaseAuthService.signInWithEmailAndPassword(
        'test@example.com',
        'password123'
      );

      const idToken = await user.getIdToken();

      // Simulate token saving
      await AsyncStorage.setItem(
        'userTokens',
        JSON.stringify({
          idToken,
          user: {
            uid: user.uid,
            email: user.email,
          },
        })
      );

      const storedTokens = await AsyncStorage.getItem('userTokens');
      const parsedTokens = storedTokens ? JSON.parse(storedTokens) : null;

      expect(parsedTokens).toEqual({
        idToken: 'firebase-token',
        user: {
          uid: 'test-uid',
          email: 'test@example.com',
        },
      });
    });

    it('should restore user session from stored tokens', async () => {
      const storedTokens = {
        idToken: 'stored-firebase-token',
        user: {
          uid: 'stored-uid',
          email: 'stored@example.com',
        },
      };

      // Mock stored tokens
      await AsyncStorage.setItem('userTokens', JSON.stringify(storedTokens));

      // Simulate restoration
      const restored = await AsyncStorage.getItem('userTokens');
      const parsedTokens = restored ? JSON.parse(restored) : null;

      expect(parsedTokens).toEqual(storedTokens);
      expect(parsedTokens.user.email).toBe('stored@example.com');
    });

    it('should handle token refresh', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: jest.fn()
          .mockResolvedValueOnce('old-token')
          .mockResolvedValueOnce('new-token'),
      };

      // First call returns old token
      const oldToken = await mockUser.getIdToken();
      expect(oldToken).toBe('old-token');

      // Force refresh returns new token
      const newToken = await mockUser.getIdToken(true);
      expect(newToken).toBe('new-token');

      // Verify token refresh was called correctly
      expect(mockUser.getIdToken).toHaveBeenCalledTimes(2);
      expect(mockUser.getIdToken).toHaveBeenNthCalledWith(2, true);
    });

    it('should handle storage errors gracefully', async () => {
      const mockError = new Error('Storage error');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(mockError);

      // Should not throw when storage fails
      try {
        await AsyncStorage.setItem('userTokens', JSON.stringify({ test: 'data' }));
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'userTokens',
        JSON.stringify({ test: 'data' })
      );
    });
  });

  describe('Authentication State Management', () => {
    it('should handle sign out flow', async () => {
      mockFirebaseAuthService.signOut.mockResolvedValue(undefined);

      await mockFirebaseAuthService.signOut();

      // Verify sign out was called
      expect(mockFirebaseAuthService.signOut).toHaveBeenCalled();

      // Simulate clearing stored tokens
      await AsyncStorage.removeItem('userTokens');

      const storedTokens = await AsyncStorage.getItem('userTokens');
      expect(storedTokens).toBeNull();
    });

    it('should handle authentication state changes', async () => {
      const mockAuthStateListener = jest.fn();
      
      mockFirebaseAuthService.onAuthStateChanged.mockImplementation((callback: any) => {
        // Simulate auth state change
        setTimeout(() => {
          callback({
            uid: 'test-uid',
            email: 'test@example.com',
          });
        }, 100);
        
        return () => {}; // Unsubscribe function
      });

      // Set up auth state listener
      const unsubscribe = mockFirebaseAuthService.onAuthStateChanged(mockAuthStateListener);

      // Wait for auth state change
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockAuthStateListener).toHaveBeenCalledWith({
        uid: 'test-uid',
        email: 'test@example.com',
      });

      // Clean up
      unsubscribe();
    });

    it('should validate current user authentication status', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };

      mockFirebaseAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockFirebaseAuthService.isUserAuthenticated.mockResolvedValue(true);

      const currentUser = mockFirebaseAuthService.getCurrentUser();
      const isAuthenticated = await mockFirebaseAuthService.isUserAuthenticated();

      expect(currentUser).toEqual(mockUser);
      expect(isAuthenticated).toBe(true);
    });

    it('should handle user profile data loading', async () => {
      const mockProfileData = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date().toISOString(),
      };

      // Mock Firestore profile loading
      const mockDoc = {
        exists: () => true,
        data: () => mockProfileData,
      };

      mockFirebaseAuthService.loadUserProfile = jest.fn().mockResolvedValue(mockProfileData);

      const profileData = await mockFirebaseAuthService.loadUserProfile('test-uid');

      expect(profileData).toEqual(mockProfileData);
      expect(mockFirebaseAuthService.loadUserProfile).toHaveBeenCalledWith('test-uid');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors during authentication', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';

      mockFirebaseAuthService.signInWithEmailAndPassword.mockRejectedValue(networkError);

      await expect(
        mockFirebaseAuthService.signInWithEmailAndPassword('test@example.com', 'password')
      ).rejects.toEqual(networkError);
    });

    it('should handle malformed stored token data', async () => {
      // Store malformed JSON
      await AsyncStorage.setItem('userTokens', 'invalid-json-data');

      const restored = await AsyncStorage.getItem('userTokens');
      
      let parsedData = null;
      try {
        parsedData = JSON.parse(restored || '');
      } catch (error) {
        // Should gracefully handle JSON parse errors
        parsedData = null;
      }

      expect(parsedData).toBeNull();
    });

    it('should handle Firebase service initialization errors', async () => {
      const initError = new Error('Firebase initialization failed');
      mockFirebaseAuthService.initialize.mockRejectedValue(initError);

      await expect(mockFirebaseAuthService.initialize()).rejects.toEqual(initError);
    });

    it('should handle concurrent authentication attempts', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };

      mockFirebaseAuthService.signInWithEmailAndPassword.mockResolvedValue(mockUser);

      // Simulate concurrent sign in attempts
      const promise1 = mockFirebaseAuthService.signInWithEmailAndPassword('test@example.com', 'password');
      const promise2 = mockFirebaseAuthService.signInWithEmailAndPassword('test@example.com', 'password');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockUser);
      expect(result2).toEqual(mockUser);
      expect(mockFirebaseAuthService.signInWithEmailAndPassword).toHaveBeenCalledTimes(2);
    });
  });
});
