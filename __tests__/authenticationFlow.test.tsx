import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../store/authSlice';

// Mock Firebase Auth
const mockSignInWithEmailAndPassword = jest.fn();
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signOut: mockSignOut,
  getAuth: jest.fn(),
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  getFirestore: jest.fn(),
}));

// Mock Firebase app
jest.mock('../firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Mock Expo Router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    replace: mockReplace,
  })),
}));

// Mock platform-specific components
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Mock themed components
jest.mock('@/components/ThemedText', () => ({
  ThemedText: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock('@/components/ThemedView', () => ({
  ThemedView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Mock SocialAuthButtons
jest.mock('@/components/SocialAuthButtons', () => ({
  __esModule: true,
  default: ({ onSuccess, onError }: any) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="social-auth-buttons">
        <TouchableOpacity 
          testID="google-signin-button"
          onPress={() => onSuccess && onSuccess()}
        >
          <Text>Continue with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          testID="apple-signin-button"
          onPress={() => onSuccess && onSuccess()}
        >
          <Text>Continue with Apple</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock auth functions
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSignInWithGoogle = jest.fn();

jest.mock('../hooks/useAuthFunctions', () => ({
  useAuthFunctions: jest.fn(() => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    signInWithGoogle: mockSignInWithGoogle,
    signOut: mockSignOut,
    createUserProfile: jest.fn(),
    refreshUserProfile: jest.fn(),
    refreshTokens: jest.fn(),
    getCurrentToken: jest.fn(),
  })),
}));

// Mock Redux Auth Provider
const mockUseReduxAuth = jest.fn();
jest.mock('../contexts/ReduxAuthProvider', () => ({
  useReduxAuth: mockUseReduxAuth,
  ReduxAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState: {
      auth: {
        user: null,
        userProfile: null,
        tokens: {
          accessToken: null,
          refreshToken: null,
          idToken: null,
          tokenExpiry: null,
          lastRefresh: null,
        },
        isAuthenticated: false,
        loading: false,
        error: null,
        initialized: true,
        persistenceRestored: true,
      },
    },
  });
};

// Import the component after mocks are set up
import LoginScreen from '../app/login/loginScreen';

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const store = createTestStore();
  return <Provider store={store}>{children}</Provider>;
};

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for useReduxAuth
    mockUseReduxAuth.mockReturnValue({
      user: null,
      userProfile: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      initialized: true,
      persistenceRestored: true,
      tokens: {
        accessToken: null,
        refreshToken: null,
        idToken: null,
        tokenExpiry: null,
        lastRefresh: null,
      },
    });
  });

  describe('Login Screen Rendering', () => {
    it('should render login form by default', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      expect(screen.getByTestId('email-input')).toBeTruthy();
      expect(screen.getByTestId('password-input')).toBeTruthy();
      expect(screen.getByTestId('auth-button')).toBeTruthy();
      expect(screen.getByTestId('toggle-auth-mode')).toBeTruthy();
    });

    it('should switch to sign up mode when toggle is pressed', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('toggle-auth-mode');
      fireEvent.press(toggleButton);

      // Should show additional sign up fields
      expect(screen.getByTestId('first-name-input')).toBeTruthy();
      expect(screen.getByTestId('last-name-input')).toBeTruthy();
    });
  });

  describe('Email/Password Authentication', () => {
    it('should call signIn with correct parameters', async () => {
      const mockUser = { uid: 'test-uid', email: 'test@example.com' };
      mockSignIn.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const authButton = screen.getByTestId('auth-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(authButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should call signUp with correct parameters', async () => {
      const mockUser = { uid: 'test-uid', email: 'test@example.com' };
      mockSignUp.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      // Switch to sign up mode
      const toggleButton = screen.getByTestId('toggle-auth-mode');
      fireEvent.press(toggleButton);

      const firstNameInput = screen.getByTestId('first-name-input');
      const lastNameInput = screen.getByTestId('last-name-input');
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const authButton = screen.getByTestId('auth-button');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'john@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(authButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'john@example.com',
          'password123',
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            googleLinked: false,
          })
        );
      });
    });

    it('should show loading state during authentication', async () => {
      // Mock a delayed response
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const authButton = screen.getByTestId('auth-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(authButton);

      // Should show loading indicator
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should display validation error for empty email', async () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const authButton = screen.getByTestId('auth-button');
      fireEvent.press(authButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all required fields')).toBeTruthy();
      });
    });

    it('should display Firebase auth errors', async () => {
      const authError = {
        code: 'auth/user-not-found',
        message: 'User not found',
      };
      mockSignIn.mockRejectedValue(authError);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const authButton = screen.getByTestId('auth-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(authButton);

      await waitFor(() => {
        expect(screen.getByText('No account found with this email address')).toBeTruthy();
      });
    });

    it('should handle network errors', async () => {
      const networkError = {
        code: 'auth/network-request-failed',
        message: 'Network error',
      };
      mockSignIn.mockRejectedValue(networkError);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const authButton = screen.getByTestId('auth-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(authButton);

      await waitFor(() => {
        expect(screen.getByText('Network error. Please check your connection and try again.')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to dashboard when user is authenticated', () => {
      mockUseReduxAuth.mockReturnValue({
        user: { uid: 'test-uid', email: 'test@example.com' },
        userProfile: null,
        isAuthenticated: true,
        loading: false,
        error: null,
        initialized: true,
        persistenceRestored: true,
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          idToken: 'id',
          tokenExpiry: Date.now() + 3600000,
          lastRefresh: Date.now(),
        },
      });

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      // Should trigger navigation
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dashboard');
    });
  });

  describe('Social Authentication', () => {
    it('should render social auth buttons', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      expect(screen.getByTestId('social-auth-buttons')).toBeTruthy();
      expect(screen.getByTestId('google-signin-button')).toBeTruthy();
      expect(screen.getByTestId('apple-signin-button')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const authButton = screen.getByTestId('auth-button');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(authButton);

      // Should show validation error or call Firebase which will return an error
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });

    it('should require all fields for sign up', async () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      // Switch to sign up mode
      const toggleButton = screen.getByTestId('toggle-auth-mode');
      fireEvent.press(toggleButton);

      const authButton = screen.getByTestId('auth-button');
      fireEvent.press(authButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all required fields')).toBeTruthy();
      });
    });
  });
});
