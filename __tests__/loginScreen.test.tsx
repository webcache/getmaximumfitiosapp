import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Provider } from 'react-redux';
import LoginScreen from '../app/login/loginScreen';
import { store } from '../store';

// Mock external dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/components/SocialAuthButtons', () => {
  return function MockSocialAuthButtons(props: any) {
    return null; // We'll test this component separately
  };
});

jest.mock('../hooks/useAuthFunctions', () => ({
  useAuthFunctions: jest.fn(),
}));

// Mock the auth functions
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockReplace = jest.fn();

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
    
    // Reset the mock implementations
    const { useAuthFunctions } = require('../hooks/useAuthFunctions');
    (useAuthFunctions as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
    });
  });

  describe('Rendering and UI', () => {
    it('should render login form by default', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText('Email')).toBeTruthy();
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();
      expect(screen.getByText('Sign In')).toBeTruthy();
      expect(screen.getByText("Don't have an account? Sign Up")).toBeTruthy();
    });

    it('should switch to sign up form when toggle is pressed', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const toggleButton = screen.getByText("Don't have an account? Sign Up");
      fireEvent.press(toggleButton);

      expect(screen.getByPlaceholderText('First Name')).toBeTruthy();
      expect(screen.getByPlaceholderText('Last Name')).toBeTruthy();
      expect(screen.getByText('Sign Up')).toBeTruthy();
      expect(screen.getByText('Already have an account? Sign In')).toBeTruthy();
    });

    it('should display all sign up fields when in sign up mode', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const toggleButton = screen.getByText("Don't have an account? Sign Up");
      fireEvent.press(toggleButton);

      expect(screen.getByPlaceholderText('First Name')).toBeTruthy();
      expect(screen.getByPlaceholderText('Last Name')).toBeTruthy();
      expect(screen.getByPlaceholderText('Email')).toBeTruthy();
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();
      expect(screen.getByPlaceholderText('Phone Number (optional)')).toBeTruthy();
      expect(screen.getByPlaceholderText('Height (optional)')).toBeTruthy();
      expect(screen.getByPlaceholderText('Weight (optional)')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should show error when email is empty on sign in', async () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const signInButton = screen.getByText('Sign In');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all required fields')).toBeTruthy();
      });
    });

    it('should show error when password is empty on sign in', async () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      fireEvent.changeText(emailInput, 'test@example.com');

      const signInButton = screen.getByText('Sign In');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all required fields')).toBeTruthy();
      });
    });

    it('should show error when required fields are empty on sign up', async () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const toggleButton = screen.getByText("Don't have an account? Sign Up");
      fireEvent.press(toggleButton);

      const signUpButton = screen.getByText('Sign Up');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all required fields')).toBeTruthy();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should call signIn with correct parameters on successful sign in', async () => {
      mockSignIn.mockResolvedValue({ uid: 'test-user', email: 'test@example.com' });

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should call signUp with correct parameters on successful sign up', async () => {
      mockSignUp.mockResolvedValue({ uid: 'test-user', email: 'test@example.com' });

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      // Switch to sign up mode
      const toggleButton = screen.getByText("Don't have an account? Sign Up");
      fireEvent.press(toggleButton);

      // Fill in form fields
      const firstNameInput = screen.getByPlaceholderText('First Name');
      const lastNameInput = screen.getByPlaceholderText('Last Name');
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const phoneInput = screen.getByPlaceholderText('Phone Number (optional)');
      const heightInput = screen.getByPlaceholderText('Height (optional)');
      const weightInput = screen.getByPlaceholderText('Weight (optional)');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'john.doe@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(phoneInput, '+1234567890');
      fireEvent.changeText(heightInput, '180cm');
      fireEvent.changeText(weightInput, '75kg');

      const signUpButton = screen.getByText('Sign Up');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'john.doe@example.com',
          'password123',
          {
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            height: '180cm',
            weight: '75kg',
            googleLinked: false,
          }
        );
      });
    });

    it('should show loading state during authentication', async () => {
      // Make signIn take some time to resolve
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ uid: 'test' }), 100)));

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      // Should show loading indicator
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display user-not-found error message', async () => {
      const error = { code: 'auth/user-not-found' };
      mockSignIn.mockRejectedValue(error);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'nonexistent@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByText('No account found with this email address')).toBeTruthy();
      });
    });

    it('should display wrong-password error message', async () => {
      const error = { code: 'auth/wrong-password' };
      mockSignIn.mockRejectedValue(error);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Incorrect password. Please try again.')).toBeTruthy();
      });
    });

    it('should display invalid-credential error message', async () => {
      const error = { code: 'auth/invalid-credential' };
      mockSignIn.mockRejectedValue(error);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'invalid@example.com');
      fireEvent.changeText(passwordInput, 'invalidpass');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password. Please check your credentials.')).toBeTruthy();
      });
    });

    it('should display email-already-in-use error for sign up', async () => {
      const error = { code: 'auth/email-already-in-use' };
      mockSignUp.mockRejectedValue(error);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      // Switch to sign up mode
      const toggleButton = screen.getByText("Don't have an account? Sign Up");
      fireEvent.press(toggleButton);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const signUpButton = screen.getByText('Sign Up');

      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(screen.getByText('An account with this email already exists')).toBeTruthy();
      });
    });

    it('should display weak-password error for sign up', async () => {
      const error = { code: 'auth/weak-password' };
      mockSignUp.mockRejectedValue(error);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      // Switch to sign up mode
      const toggleButton = screen.getByText("Don't have an account? Sign Up");
      fireEvent.press(toggleButton);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const signUpButton = screen.getByText('Sign Up');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '123');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(screen.getByText('Password should be at least 6 characters')).toBeTruthy();
      });
    });

    it('should display network error message', async () => {
      const error = { code: 'auth/network-request-failed' };
      mockSignIn.mockRejectedValue(error);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Network error. Please check your connection and try again.')).toBeTruthy();
      });
    });

    it('should display generic error message for unknown errors', async () => {
      const error = { code: 'auth/unknown-error', message: 'Something went wrong' };
      mockSignIn.mockRejectedValue(error);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByText('An error occurred during authentication')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to dashboard when user is authenticated', async () => {
      // Mock authenticated state in Redux store
      const { setUser } = require('../store/authSlice');
      store.dispatch(setUser({
        uid: 'test-user',
        email: 'test@example.com',
        displayName: 'Test User'
      }));

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dashboard');
      }, { timeout: 3000 });
    });

    it('should not navigate when user is not authenticated', () => {
      // Ensure user is not authenticated
      const { resetAuthState } = require('../store/authSlice');
      store.dispatch(resetAuthState());

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      // Should not navigate
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Input Handling', () => {
    it('should update email input correctly', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      fireEvent.changeText(emailInput, 'user@example.com');

      expect(emailInput.props.value).toBe('user@example.com');
    });

    it('should update password input correctly', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const passwordInput = screen.getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'mypassword');

      expect(passwordInput.props.value).toBe('mypassword');
    });

    it('should clear error message when starting new authentication attempt', async () => {
      // First set an error
      const error = { code: 'auth/wrong-password' };
      mockSignIn.mockRejectedValue(error);

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Incorrect password. Please try again.')).toBeTruthy();
      });

      // Now try again with different credentials (should clear error)
      mockSignIn.mockResolvedValue({ uid: 'test' });
      fireEvent.changeText(passwordInput, 'correctpassword');
      fireEvent.press(signInButton);

      // Error message should be cleared (not visible)
      await waitFor(() => {
        expect(screen.queryByText('Incorrect password. Please try again.')).toBeNull();
      });
    });
  });
});
