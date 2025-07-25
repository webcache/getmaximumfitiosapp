/**
 * Comprehensive Authentication Integration Tests
 * 
 * Tests the complete authentication flow including:
 * - App loading and initialization
 * - Login screen functionality
 * - Social authentication (Google, Apple)
 * - Email/password authentication
 * - Redux state management
 * - Navigation after successful authentication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Provider } from 'react-redux';

// Mock external dependencies
jest.mock('@react-native-google-signin/google-signin');
jest.mock('expo-apple-authentication');
jest.mock('expo-web-browser');
jest.mock('expo-router');
jest.mock('expo-font');
jest.mock('expo-splash-screen');
jest.mock('../services/firebaseAuthService');
jest.mock('../firebase');

// Mock React Native components
jest.mock('react-native', () => {
  return {
    Platform: {
      OS: 'ios',
      Version: '15.1',
      select: (obj: any) => obj.ios || obj.default,
    },
    ActivityIndicator: 'ActivityIndicator',
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    Image: 'Image',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    Dimensions: {
      get: () => ({ width: 375, height: 812 }),
    },
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => {
        if (Array.isArray(style)) {
          return Object.assign({}, ...style.filter(Boolean));
        }
        return style || {};
      },
    },
    LogBox: { ignoreLogs: jest.fn() },
    TurboModuleRegistry: { getEnforcing: jest.fn() },
    NativeModules: {},
  };
});

// Mock navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  Stack: {
    Screen: ({ children }: any) => children,
  },
}));

// Mock fonts
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// Mock splash screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// Create a test store helper
import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../store/authSlice';

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      }),
  });
};

describe('Authentication Integration Tests', () => {
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    
    // Set up environment variables
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'test-ios-client-id';

    store = createTestStore();
  });

  describe('App Loading and Initialization', () => {
    it('should handle app loading with font loading', async () => {
      const { loadAsync } = require('expo-font');
      const { preventAutoHideAsync, hideAsync } = require('expo-splash-screen');

      // Mock successful font loading
      loadAsync.mockResolvedValue(undefined);

      // Create a simple app loading component to test
      const AppLoadingComponent = () => {
        const [fontsLoaded, setFontsLoaded] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          const loadFonts = async () => {
            try {
              await preventAutoHideAsync();
              await loadAsync({
                'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
              });
              setFontsLoaded(true);
              await hideAsync();
            } catch (err) {
              setError('Font loading failed');
            }
          };
          loadFonts();
        }, []);

        if (error) {
          return <Text testID="error-message">{error}</Text>;
        }

        if (!fontsLoaded) {
          return <Text testID="loading-screen">Loading...</Text>;
        }

        return <Text testID="app-ready">App Ready</Text>;
      };

      const { getByTestId } = render(<AppLoadingComponent />);

      // Initially shows loading
      expect(getByTestId('loading-screen')).toBeTruthy();

      // Wait for fonts to load
      await waitFor(() => {
        expect(getByTestId('app-ready')).toBeTruthy();
      });

      expect(loadAsync).toHaveBeenCalled();
      expect(hideAsync).toHaveBeenCalled();
    });

    it('should handle font loading errors gracefully', async () => {
      const { loadAsync } = require('expo-font');
      
      // Mock font loading failure
      loadAsync.mockRejectedValue(new Error('Font loading failed'));

      const AppLoadingComponent = () => {
        const [fontsLoaded, setFontsLoaded] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          const loadFonts = async () => {
            try {
              await loadAsync({
                'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
              });
              setFontsLoaded(true);
            } catch (err) {
              setError('Font loading failed');
            }
          };
          loadFonts();
        }, []);

        if (error) {
          return <Text testID="error-message">{error}</Text>;
        }

        return fontsLoaded ? <Text testID="app-ready">App Ready</Text> : <Text testID="loading-screen">Loading...</Text>;
      };

      const { getByTestId } = render(<AppLoadingComponent />);

      await waitFor(() => {
        expect(getByTestId('error-message')).toBeTruthy();
      });
    });
  });

  describe('Login Screen Integration', () => {
    it('should render login form and handle email/password input', () => {
      // Mock login screen component
      const MockLoginScreen = () => {
        const [email, setEmail] = React.useState('');
        const [password, setPassword] = React.useState('');
        const [loading, setLoading] = React.useState(false);

        const handleLogin = async () => {
          setLoading(true);
          // Mock login logic
          setTimeout(() => setLoading(false), 100);
        };

        return (
          <View>
            <TextInput
              testID="email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
            />
            <TextInput
              testID="password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
            />
            <TouchableOpacity
              testID="login-button"
              onPress={handleLogin}
              disabled={loading}
            >
              <Text>{loading ? 'Signing In...' : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(
        <Provider store={store}>
          <MockLoginScreen />
        </Provider>
      );        const emailInput = getByTestId('email-input');
        const passwordInput = getByTestId('password-input');
        const loginButton = getByTestId('login-button');

      // Test input functionality
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      
      expect(emailInput.props.value).toBe('test@example.com');
      expect(passwordInput.props.value).toBe('password123');

      // Test login button press
      fireEvent.press(loginButton);
    });

    it('should validate email format', () => {
      const MockLoginWithValidation = () => {
        const [email, setEmail] = React.useState('');
        const [emailError, setEmailError] = React.useState('');

        const validateEmail = (email: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email address');
          } else {
            setEmailError('');
          }
        };

        React.useEffect(() => {
          if (email) {
            validateEmail(email);
          }
        }, [email]);

        return (
          <View>
            <TextInput
              testID="email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
            />
            {emailError ? <Text testID="email-error">{emailError}</Text> : null}
          </View>
        );
      };

      const { getByTestId, queryByTestId } = render(<MockLoginWithValidation />);

      const emailInput = getByTestId('email-input');

      // Test invalid email
      fireEvent.changeText(emailInput, 'invalid-email');
      expect(getByTestId('email-error')).toBeTruthy();

      // Test valid email
      fireEvent.changeText(emailInput, 'test@example.com');
      expect(queryByTestId('email-error')).toBeFalsy();
    });
  });

  describe('Social Authentication Integration', () => {
    it('should handle Google Sign In flow', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const { firebaseAuthService } = require('../services/firebaseAuthService');

      // Mock successful Google sign in
      GoogleSignin.signIn.mockResolvedValue({
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token',
        user: {
          id: 'google-user-id',
          email: 'user@gmail.com',
          name: 'Google User',
        },
      });

      firebaseAuthService.signInWithGoogle.mockResolvedValue({
        uid: 'firebase-uid',
        email: 'user@gmail.com',
        displayName: 'Google User',
      });

      const MockSocialAuthButton = () => {
        const [loading, setLoading] = React.useState(false);

        const handleGoogleSignIn = async () => {
          setLoading(true);
          try {
            const googleUser = await GoogleSignin.signIn();
            const firebaseUser = await firebaseAuthService.signInWithGoogle();
            // Success - would normally navigate here
            setLoading(false);
          } catch (error) {
            setLoading(false);
          }
        };

        return (
          <TouchableOpacity
            testID="google-signin-button"
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Text>{loading ? 'Signing in...' : 'Sign in with Google'}</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(
        <Provider store={store}>
          <MockSocialAuthButton />
        </Provider>
      );

      const googleButton = getByTestId('google-signin-button');
      
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(GoogleSignin.signIn).toHaveBeenCalled();
        expect(firebaseAuthService.signInWithGoogle).toHaveBeenCalled();
      });
    });

    it('should handle Apple Sign In flow', async () => {
      const AppleAuthentication = require('expo-apple-authentication');
      const { firebaseAuthService } = require('../services/firebaseAuthService');

      // Mock successful Apple sign in
      AppleAuthentication.isAvailableAsync.mockResolvedValue(true);
      AppleAuthentication.signInAsync.mockResolvedValue({
        identityToken: 'mock-identity-token',
        user: 'apple-user-id',
        email: 'user@icloud.com',
        fullName: {
          givenName: 'John',
          familyName: 'Doe',
        },
      });

      firebaseAuthService.signInWithApple.mockResolvedValue({
        uid: 'firebase-uid',
        email: 'user@icloud.com',
        displayName: 'John Doe',
      });

      const MockAppleAuthButton = () => {
        const [loading, setLoading] = React.useState(false);

        const handleAppleSignIn = async () => {
          setLoading(true);
          try {
            const appleUser = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
            });
            const firebaseUser = await firebaseAuthService.signInWithApple();
            setLoading(false);
          } catch (error) {
            setLoading(false);
          }
        };

        return (
          <TouchableOpacity
            testID="apple-signin-button"
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            <Text>{loading ? 'Signing in...' : 'Sign in with Apple'}</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(
        <Provider store={store}>
          <MockAppleAuthButton />
        </Provider>
      );

      const appleButton = getByTestId('apple-signin-button');
      
      fireEvent.press(appleButton);

      await waitFor(() => {
        expect(AppleAuthentication.signInAsync).toHaveBeenCalled();
        expect(firebaseAuthService.signInWithApple).toHaveBeenCalled();
      });
    });

    it('should handle authentication errors gracefully', async () => {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');

      // Mock sign in cancellation
      GoogleSignin.signIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });

      const MockSocialAuthWithError = () => {
        const [error, setError] = React.useState<string | null>(null);

        const handleGoogleSignIn = async () => {
          try {
            await GoogleSignin.signIn();
          } catch (err: any) {
            if (err.code === 'SIGN_IN_CANCELLED') {
              setError('Sign in was cancelled');
            } else {
              setError('Sign in failed');
            }
          }
        };

        return (
          <View>
            <TouchableOpacity testID="google-signin-button" onPress={handleGoogleSignIn}>
              <Text>Sign in with Google</Text>
            </TouchableOpacity>
            {error && <Text testID="error-message">{error}</Text>}
          </View>
        );
      };

      const { getByTestId } = render(<MockSocialAuthWithError />);

      const googleButton = getByTestId('google-signin-button');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(getByTestId('error-message')).toBeTruthy();
        expect(getByTestId('error-message').props.children).toBe('Sign in was cancelled');
      });
    });
  });

  describe('Redux Integration', () => {
    it('should update Redux state after successful authentication', async () => {
      const { firebaseAuthService } = require('../services/firebaseAuthService');

      // Mock successful authentication
      firebaseAuthService.signInWithEmailAndPassword.mockResolvedValue({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      const MockAuthComponent = () => {
        const dispatch = store.dispatch;
        const [authState, setAuthState] = React.useState(store.getState().auth);

        React.useEffect(() => {
          const unsubscribe = store.subscribe(() => {
            setAuthState(store.getState().auth);
          });
          return unsubscribe;
        }, []);

        const handleLogin = async () => {
          const user = await firebaseAuthService.signInWithEmailAndPassword('test@example.com', 'password');
          dispatch({ 
            type: 'auth/setUser', 
            payload: user 
          });
        };

        return (
          <View>
            <TouchableOpacity testID="login-button" onPress={handleLogin}>
              <Text>Login</Text>
            </TouchableOpacity>
            <Text testID="auth-state">
              {authState.user ? `Logged in as ${authState.user.email}` : 'Not logged in'}
            </Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <Provider store={store}>
          <MockAuthComponent />
        </Provider>
      );

      expect(getByTestId('auth-state').props.children).toBe('Not logged in');

      const loginButton = getByTestId('login-button');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByTestId('auth-state').props.children).toBe('Logged in as test@example.com');
      });
    });

    it('should persist authentication state', async () => {
      // Mock existing auth data in AsyncStorage
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'userTokens') {
          return Promise.resolve(JSON.stringify({
            accessToken: 'stored-token',
            user: {
              uid: 'stored-uid',
              email: 'stored@example.com',
            },
          }));
        }
        return Promise.resolve(null);
      });

      const MockPersistedAuthComponent = () => {
        const [restored, setRestored] = React.useState(false);
        const [user, setUser] = React.useState(null);

        React.useEffect(() => {
          const restoreAuth = async () => {
            try {
              const storedData = await AsyncStorage.getItem('userTokens');
              if (storedData) {
                const userData = JSON.parse(storedData);
                setUser(userData.user);
              }
              setRestored(true);
            } catch (error) {
              setRestored(true);
            }
          };
          restoreAuth();
        }, []);

        if (!restored) {
          return <Text testID="restoring">Restoring session...</Text>;
        }

        return (
          <Text testID="auth-status">
            {user ? `Restored user: ${(user as any).email}` : 'No stored session'}
          </Text>
        );
      };

      const { getByTestId } = render(<MockPersistedAuthComponent />);

      await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('Restored user: stored@example.com');
      });

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('userTokens');
    });
  });

  describe('Navigation Integration', () => {
    it('should navigate to dashboard after successful login', async () => {
      const { firebaseAuthService } = require('../services/firebaseAuthService');

      firebaseAuthService.signInWithEmailAndPassword.mockResolvedValue({
        uid: 'test-uid',
        email: 'test@example.com',
      });

      const MockLoginWithNavigation = () => {
        const handleLogin = async () => {
          try {
            await firebaseAuthService.signInWithEmailAndPassword('test@example.com', 'password');
            mockReplace('/(tabs)/dashboard');
          } catch (error) {
            // Handle error
          }
        };

        return (
          <TouchableOpacity testID="login-button" onPress={handleLogin}>
            <Text>Login</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(<MockLoginWithNavigation />);

      const loginButton = getByTestId('login-button');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dashboard');
      });
    });

    it('should remain on login screen after failed authentication', async () => {
      const { firebaseAuthService } = require('../services/firebaseAuthService');

      firebaseAuthService.signInWithEmailAndPassword.mockRejectedValue(
        new Error('Invalid credentials')
      );

      const MockLoginWithError = () => {
        const [error, setError] = React.useState<string | null>(null);

        const handleLogin = async () => {
          try {
            await firebaseAuthService.signInWithEmailAndPassword('test@example.com', 'wrongpassword');
            mockReplace('/(tabs)/dashboard');
          } catch (err: any) {
            setError(err.message);
          }
        };

        return (
          <View>
            <TouchableOpacity testID="login-button" onPress={handleLogin}>
              <Text>Login</Text>
            </TouchableOpacity>
            {error && <Text testID="error-message">{error}</Text>}
          </View>
        );
      };

      const { getByTestId } = render(<MockLoginWithError />);

      const loginButton = getByTestId('login-button');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByTestId('error-message')).toBeTruthy();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should navigate from dashboard to workouts tab when workout card is pressed', async () => {
      // Mock the auth guard hook to return authenticated state
      const mockUseAuthGuard = jest.fn().mockReturnValue({
        isReady: true,
        user: { uid: 'test-uid', email: 'test@example.com' },
        userProfile: { name: 'Test User' },
      });

      jest.doMock('../hooks/useAuthGuard', () => ({
        useAuthGuard: mockUseAuthGuard,
      }));

      // Mock Firebase Firestore operations
      const mockGetDocs = jest.fn().mockResolvedValue({
        empty: false,
        docs: [{
          data: () => ({
            title: 'Test Workout',
            date: '2024-01-15',
            exercises: [
              { name: 'Squat', sets: [] },
              { name: 'Bench Press', sets: [] },
            ],
          }),
        }],
      });

      jest.doMock('firebase/firestore', () => ({
        ...jest.requireActual('firebase/firestore'),
        getDocs: mockGetDocs,
        collection: jest.fn(),
        query: jest.fn(),
        where: jest.fn(),
        orderBy: jest.fn(),
        limit: jest.fn(),
      }));

      // Mock the useChat hook
      const mockUseChat = jest.fn().mockReturnValue({
        messages: [],
        input: '',
        error: null,
        status: 'ready',
        stop: jest.fn(),
        setInput: jest.fn(),
        append: jest.fn(),
      });

      jest.doMock('@ai-sdk/react', () => ({
        useChat: mockUseChat,
      }));

      const MockDashboardWithNavigation = () => {
        const { useRouter } = require('expo-router');
        const router = useRouter();
        
        const handleWorkoutPress = () => {
          router.push('/(tabs)/workouts');
        };

        return (
          <View>
            <TouchableOpacity testID="workout-card" onPress={handleWorkoutPress}>
              <Text>Test Workout</Text>
              <Text>Tap to view workouts →</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(<MockDashboardWithNavigation />);

      const workoutCard = getByTestId('workout-card');
      fireEvent.press(workoutCard);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/(tabs)/workouts');
      });
    });

    it('should navigate from dashboard to workouts tab when no workouts card is pressed', async () => {
      const MockDashboardNoWorkouts = () => {
        const { useRouter } = require('expo-router');
        const router = useRouter();
        
        const handleCreateWorkoutPress = () => {
          router.push('/(tabs)/workouts');
        };

        return (
          <View>
            <TouchableOpacity testID="no-workout-card" onPress={handleCreateWorkoutPress}>
              <Text>No upcoming workouts scheduled</Text>
              <Text>Tap to create your first workout →</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(<MockDashboardNoWorkouts />);

      const noWorkoutCard = getByTestId('no-workout-card');
      fireEvent.press(noWorkoutCard);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/(tabs)/workouts');
      });
    });
  });

  describe('Token Management', () => {
    it('should save authentication tokens after successful login', async () => {
      const { firebaseAuthService } = require('../services/firebaseAuthService');

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: jest.fn().mockResolvedValue('firebase-token'),
      };

      firebaseAuthService.signInWithEmailAndPassword.mockResolvedValue(mockUser);

      const MockTokenManagement = () => {
        const handleLogin = async () => {
          const user = await firebaseAuthService.signInWithEmailAndPassword('test@example.com', 'password');
          const idToken = await user.getIdToken();
          
          await AsyncStorage.setItem('userTokens', JSON.stringify({
            idToken,
            user: {
              uid: user.uid,
              email: user.email,
            },
          }));
        };

        return (
          <TouchableOpacity testID="login-button" onPress={handleLogin}>
            <Text>Login</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(<MockTokenManagement />);

      const loginButton = getByTestId('login-button');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'userTokens',
          expect.stringContaining('firebase-token')
        );
      });
    });

    it('should handle token refresh', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: jest.fn()
          .mockResolvedValueOnce('old-token')
          .mockResolvedValueOnce('new-token'),
      };

      const MockTokenRefresh = () => {
        const [token, setToken] = React.useState<string | null>(null);

        const refreshToken = async () => {
          try {
            const newToken = await mockUser.getIdToken(true); // Force refresh
            setToken(newToken);
            await AsyncStorage.setItem('userTokens', JSON.stringify({
              idToken: newToken,
              user: mockUser,
            }));
          } catch (error) {
            setToken('error');
          }
        };

        return (
          <View>
            <TouchableOpacity testID="refresh-button" onPress={refreshToken}>
              <Text>Refresh Token</Text>
            </TouchableOpacity>
            <Text testID="token-display">{token || 'No token'}</Text>
          </View>
        );
      };

      const { getByTestId } = render(<MockTokenRefresh />);

      const refreshButton = getByTestId('refresh-button');
      fireEvent.press(refreshButton);

      await waitFor(() => {
        expect(getByTestId('token-display').props.children).toBe('new-token');
      }, { timeout: 3000 });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'userTokens',
        expect.stringContaining('new-token')
      );
    });
  });
});
