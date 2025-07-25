import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Provider } from 'react-redux';
import SocialAuthButtons from '../components/SocialAuthButtons';
import { store } from '../store';

// Mock external dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../hooks/useAuthFunctions', () => ({
  useAuthFunctions: () => ({
    signInWithGoogle: jest.fn(),
  }),
}));

jest.mock('../utils/socialAuth', () => ({
  isAppleSignInAvailable: jest.fn(),
  signInWithApple: jest.fn(),
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

// Mock FontAwesome5 icons
jest.mock('@expo/vector-icons/FontAwesome5', () => 'FontAwesome5');

// Test data
const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
};

// Mock functions
const mockSignInWithGoogle = jest.fn();
const mockSignInWithApple = jest.fn();
const mockIsAppleSignInAvailable = jest.fn();
const mockReplace = jest.fn();
const mockOnSuccess = jest.fn();
const mockOnError = jest.fn();

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

describe('SocialAuthButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
    
    // Mock hook returns
    const { useAuthFunctions } = require('../hooks/useAuthFunctions');
    useAuthFunctions.mockReturnValue({
      signInWithGoogle: mockSignInWithGoogle,
    });

    const { isAppleSignInAvailable, signInWithApple } = require('../utils/socialAuth');
    isAppleSignInAvailable.mockImplementation(mockIsAppleSignInAvailable);
    signInWithApple.mockImplementation(mockSignInWithApple);

    // Reset store state
    const { resetAuthState } = require('../store/authSlice');
    store.dispatch(resetAuthState());
  });

  describe('Rendering', () => {
    it('should render Google sign in button', () => {
      render(
        <TestWrapper>
          <SocialAuthButtons />
        </TestWrapper>
      );

      expect(screen.getByText('Sign in with Google')).toBeTruthy();
    });

    it('should show Apple sign in button when available on iOS', async () => {
      // Mock iOS platform
      Platform.OS = 'ios';
      mockIsAppleSignInAvailable.mockResolvedValue(true);

      render(
        <TestWrapper>
          <SocialAuthButtons />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in with Apple (Simulator)')).toBeTruthy();
      });
    });

    it('should not show Apple sign in button when not available', async () => {
      mockIsAppleSignInAvailable.mockResolvedValue(false);

      render(
        <TestWrapper>
          <SocialAuthButtons />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Sign in with Apple (Simulator)')).toBeNull();
      });
    });

    it('should not show Apple sign in button on Android', () => {
      // Mock Android platform
      Platform.OS = 'android';

      render(
        <TestWrapper>
          <SocialAuthButtons />
        </TestWrapper>
      );

      expect(screen.queryByText('Sign in with Apple (Simulator)')).toBeNull();
    });
  });

  describe('Google Sign In', () => {
    it('should call signInWithGoogle when Google button is pressed', async () => {
      mockSignInWithGoogle.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <SocialAuthButtons onSuccess={mockOnSuccess} />
        </TestWrapper>
      );

      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it('should show loading state during Google sign in', async () => {
      // Mock a delayed response
      mockSignInWithGoogle.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockUser), 100))
      );

      render(
        <TestWrapper>
          <SocialAuthButtons />
        </TestWrapper>
      );

      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.press(googleButton);

      // Should show loading indicator
      expect(screen.getByTestId('google-loading')).toBeTruthy();

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it('should call onSuccess callback after successful Google sign in', async () => {
      mockSignInWithGoogle.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <SocialAuthButtons onSuccess={mockOnSuccess} />
        </TestWrapper>
      );

      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should call onError callback when Google sign in fails', async () => {
      const error = new Error('Google sign in failed');
      mockSignInWithGoogle.mockRejectedValue(error);

      render(
        <TestWrapper>
          <SocialAuthButtons onError={mockOnError} />
        </TestWrapper>
      );

      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to sign in with Google. Please try again.');
      });
    });

    it('should handle Google sign in cancellation gracefully', async () => {
      const cancelError = { code: 'SIGN_IN_CANCELLED' };
      mockSignInWithGoogle.mockRejectedValue(cancelError);

      render(
        <TestWrapper>
          <SocialAuthButtons onError={mockOnError} />
        </TestWrapper>
      );

      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        // Should not call onError for cancellation
        expect(mockOnError).not.toHaveBeenCalled();
      });
    });

    it('should handle network errors during Google sign in', async () => {
      const networkError = { code: 'NETWORK_ERROR' };
      mockSignInWithGoogle.mockRejectedValue(networkError);

      render(
        <TestWrapper>
          <SocialAuthButtons onError={mockOnError} />
        </TestWrapper>
      );

      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Network error. Please check your connection and try again.');
      });
    });
  });

  describe('Apple Sign In', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
      mockIsAppleSignInAvailable.mockResolvedValue(true);
    });

    it('should call signInWithApple when Apple button is pressed', async () => {
      mockSignInWithApple.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <SocialAuthButtons onSuccess={mockOnSuccess} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in with Apple (Simulator)')).toBeTruthy();
      });

      const appleButton = screen.getByText('Sign in with Apple (Simulator)');
      fireEvent.press(appleButton);

      await waitFor(() => {
        expect(mockSignInWithApple).toHaveBeenCalled();
      });
    });

    it('should show loading state during Apple sign in', async () => {
      mockSignInWithApple.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockUser), 100))
      );

      render(
        <TestWrapper>
          <SocialAuthButtons />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in with Apple (Simulator)')).toBeTruthy();
      });

      const appleButton = screen.getByText('Sign in with Apple (Simulator)');
      fireEvent.press(appleButton);

      // Should show loading indicator
      expect(screen.getByTestId('apple-loading')).toBeTruthy();

      await waitFor(() => {
        expect(mockSignInWithApple).toHaveBeenCalled();
      });
    });

    it('should call onSuccess callback after successful Apple sign in', async () => {
      mockSignInWithApple.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <SocialAuthButtons onSuccess={mockOnSuccess} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in with Apple (Simulator)')).toBeTruthy();
      });

      const appleButton = screen.getByText('Sign in with Apple (Simulator)');
      fireEvent.press(appleButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should call onError callback when Apple sign in fails', async () => {
      const error = new Error('Apple sign in failed');
      mockSignInWithApple.mockRejectedValue(error);

      render(
        <TestWrapper>
          <SocialAuthButtons onError={mockOnError} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in with Apple (Simulator)')).toBeTruthy();
      });

      const appleButton = screen.getByText('Sign in with Apple (Simulator)');
      fireEvent.press(appleButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to sign in with Apple. Please try again.');
      });
    });

    it('should handle Apple sign in cancellation gracefully', async () => {
      const cancelError = { code: 'ERR_CANCELED' };
      mockSignInWithApple.mockRejectedValue(cancelError);

      render(
        <TestWrapper>
          <SocialAuthButtons onError={mockOnError} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in with Apple (Simulator)')).toBeTruthy();
      });

      const appleButton = screen.getByText('Sign in with Apple (Simulator)');
      fireEvent.press(appleButton);

      await waitFor(() => {
        // Should not call onError for cancellation
        expect(mockOnError).not.toHaveBeenCalled();
      });
    });
  });

  describe('Navigation After Authentication', () => {
    it('should navigate to dashboard after successful authentication when authenticated state changes', async () => {
      mockSignInWithGoogle.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <SocialAuthButtons />
        </TestWrapper>
      );

      // Simulate user authentication by dispatching to store
      const { setUser } = require('../store/authSlice');
      store.dispatch(setUser(mockUser));

      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dashboard');
      }, { timeout: 3000 });
    });

    it('should not navigate multiple times for same authentication session', async () => {
      mockSignInWithGoogle.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <SocialAuthButtons />
        </TestWrapper>
      );

      // Simulate user authentication
      const { setUser } = require('../store/authSlice');
      store.dispatch(setUser(mockUser));

      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledTimes(1);
      });

      // Try to press button again
      fireEvent.press(googleButton);

      // Should not navigate again
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });
  });

  describe('Props and Modes', () => {
    it('should work in signin mode', () => {
      render(
        <TestWrapper>
          <SocialAuthButtons mode="signin" />
        </TestWrapper>
      );

      expect(screen.getByText('Sign in with Google')).toBeTruthy();
    });

    it('should work in signup mode', () => {
      render(
        <TestWrapper>
          <SocialAuthButtons mode="signup" />
        </TestWrapper>
      );

      expect(screen.getByText('Sign in with Google')).toBeTruthy();
    });

    it('should call provided callbacks', async () => {
      mockSignInWithGoogle.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <SocialAuthButtons 
            mode="signin"
            onSuccess={mockOnSuccess}
            onError={mockOnError}
          />
        </TestWrapper>
      );

      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle unexpected errors gracefully', async () => {
      const unexpectedError = { message: 'Unexpected error' };
      mockSignInWithGoogle.mockRejectedValue(unexpectedError);

      render(
        <TestWrapper>
          <SocialAuthButtons onError={mockOnError} />
        </TestWrapper>
      );

      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to sign in with Google. Please try again.');
      });
    });

    it('should prevent multiple simultaneous sign in attempts', async () => {
      // Mock a slow sign in process
      mockSignInWithGoogle.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockUser), 500))
      );

      render(
        <TestWrapper>
          <SocialAuthButtons />
        </TestWrapper>
      );

      const googleButton = screen.getByText('Sign in with Google');
      
      // Press button multiple times quickly
      fireEvent.press(googleButton);
      fireEvent.press(googleButton);
      fireEvent.press(googleButton);

      await waitFor(() => {
        // Should only call signInWithGoogle once
        expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle Apple availability check failure', async () => {
      Platform.OS = 'ios';
      mockIsAppleSignInAvailable.mockRejectedValue(new Error('Availability check failed'));

      render(
        <TestWrapper>
          <SocialAuthButtons />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should not show Apple button if availability check fails
        expect(screen.queryByText('Sign in with Apple (Simulator)')).toBeNull();
      });
    });
  });
});
