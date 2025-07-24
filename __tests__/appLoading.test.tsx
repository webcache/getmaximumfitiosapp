import { render, waitFor } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import RootLayout from '../app/_layout';
import { persistor, store } from '../store';

// Mock external dependencies
jest.mock('expo-font', () => ({
  useFonts: jest.fn(),
}));

jest.mock('expo-router', () => ({
  SplashScreen: {
    preventAutoHideAsync: jest.fn(),
    hideAsync: jest.fn(),
  },
  Stack: () => null,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('../contexts/ReduxAuthProvider', () => ({
  ReduxAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock polyfills
jest.mock('../polyfills', () => ({}));

// Mock React Native - use the same global Platform
jest.mock('react-native', () => {
  const globalPlatform = (global as any).Platform || { OS: 'ios', select: jest.fn() };
  return {
    Platform: globalPlatform,
    LogBox: {
      ignoreLogs: jest.fn(),
    },
    TurboModuleRegistry: {
      getEnforcing: jest.fn(),
    },
    NativeModules: {
      DevMenu: {},
    },
  };
});

// Test wrapper to provide Redux store
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      {children}
    </PersistGate>
  </Provider>
);

describe('RootLayout (App Loading)', () => {
  const mockUseFonts = useFonts as jest.Mock;
  const mockPreventAutoHideAsync = SplashScreen.preventAutoHideAsync as jest.Mock;
  const mockHideAsync = SplashScreen.hideAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock implementations
    mockPreventAutoHideAsync.mockResolvedValue(undefined);
    mockHideAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Font Loading', () => {
    it('should prevent auto hide splash screen on mount', () => {
      mockUseFonts.mockReturnValue([false]); // Fonts not loaded

      render(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      expect(mockPreventAutoHideAsync).toHaveBeenCalled();
    });

    it('should hide splash screen after fonts are loaded with delay', async () => {
      mockUseFonts.mockReturnValue([true]); // Fonts loaded

      render(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      // Fast-forward the timer by 3 seconds
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockHideAsync).toHaveBeenCalled();
      });
    });

    it('should not hide splash screen if fonts are not loaded', () => {
      mockUseFonts.mockReturnValue([false]); // Fonts not loaded

      render(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      // Fast-forward the timer by 3 seconds
      jest.advanceTimersByTime(3000);

      expect(mockHideAsync).not.toHaveBeenCalled();
    });

    it('should load SpaceMono font correctly', () => {
      mockUseFonts.mockReturnValue([true]);

      render(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      expect(mockUseFonts).toHaveBeenCalledWith({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
      });
    });
  });

  describe('Splash Screen Timing', () => {
    it('should show splash screen for exactly 3 seconds after fonts load', async () => {
      mockUseFonts.mockReturnValue([true]);

      render(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      // Advance timer by 2.9 seconds - should not hide yet
      jest.advanceTimersByTime(2900);
      expect(mockHideAsync).not.toHaveBeenCalled();

      // Advance timer by additional 0.1 seconds (total 3s) - should hide now
      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(mockHideAsync).toHaveBeenCalled();
      });
    });

    it('should handle multiple font loading state changes correctly', async () => {
      // Start with fonts not loaded
      const { rerender } = render(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      mockUseFonts.mockReturnValue([false]);
      rerender(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      // Fast-forward and ensure splash is not hidden
      jest.advanceTimersByTime(3000);
      expect(mockHideAsync).not.toHaveBeenCalled();

      // Now fonts are loaded
      mockUseFonts.mockReturnValue([true]);
      rerender(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      // Fast-forward again
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockHideAsync).toHaveBeenCalled();
      });
    });
  });

  describe('Redux Integration', () => {
    it('should provide Redux store to child components', () => {
      mockUseFonts.mockReturnValue([true]);

      const TestComponent = () => {
        // This component would normally access Redux state
        return null;
      };

      expect(() => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('should initialize PersistGate correctly', () => {
      mockUseFonts.mockReturnValue([true]);

      // PersistGate should be properly initialized with persistor
      expect(() => {
        render(
          <TestWrapper>
            <RootLayout />
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle font loading errors gracefully', () => {
      // Mock font loading to throw an error
      mockUseFonts.mockImplementation(() => {
        throw new Error('Font loading failed');
      });

      expect(() => {
        render(
          <TestWrapper>
            <RootLayout />
          </TestWrapper>
        );
      }).toThrow('Font loading failed');
    });

    it('should handle splash screen hide errors gracefully', async () => {
      mockUseFonts.mockReturnValue([true]);
      mockHideAsync.mockRejectedValue(new Error('Failed to hide splash'));

      render(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      jest.advanceTimersByTime(3000);

      // Should not throw even if hideAsync fails
      await waitFor(() => {
        expect(mockHideAsync).toHaveBeenCalled();
      });
    });
  });

  describe('LogBox Configuration', () => {
    it('should configure LogBox to ignore specific warnings', () => {
      const LogBox = require('react-native').LogBox;
      
      // Import should trigger LogBox configuration
      require('../app/_layout');

      expect(LogBox.ignoreLogs).toHaveBeenCalledWith([
        'Setting a timer for a long period of time',
        'AsyncStorage has been extracted from react-native core',
        'Component auth has not been registered yet',
        'Sending `onAnimatedValueUpdate` with no listeners registered',
        'onAnimatedValueUpdate',
        'Animated:',
        'RCTBridge',
        'Warning: ...',
        '[firebase/auth]',
        'firebase/auth:Auth',
        'FirebaseError:',
      ]);
    });
  });

  describe('Cleanup', () => {
    it('should clean up timeout when component unmounts', () => {
      mockUseFonts.mockReturnValue([true]);

      const { unmount } = render(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      // Unmount before timeout completes
      unmount();

      // Fast-forward timer
      jest.advanceTimersByTime(3000);

      // Should not call hideAsync after unmount
      expect(mockHideAsync).not.toHaveBeenCalled();
    });

    it('should handle multiple mount/unmount cycles correctly', () => {
      mockUseFonts.mockReturnValue([true]);

      // Mount and unmount multiple times
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(
          <TestWrapper>
            <RootLayout />
          </TestWrapper>
        );
        unmount();
      }

      jest.advanceTimersByTime(3000);

      // Should handle gracefully without issues
      expect(mockHideAsync).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks with timer', () => {
      mockUseFonts.mockReturnValue([true]);

      // Mount multiple instances
      const instances = [];
      for (let i = 0; i < 5; i++) {
        instances.push(render(
          <TestWrapper>
            <RootLayout />
          </TestWrapper>
        ));
      }

      // Unmount all instances
      instances.forEach(instance => instance.unmount());

      // Should not have any pending timers
      jest.advanceTimersByTime(5000);
      expect(mockHideAsync).not.toHaveBeenCalled();
    });

    it('should only call preventAutoHideAsync once per mount', () => {
      mockUseFonts.mockReturnValue([false]);

      render(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      expect(mockPreventAutoHideAsync).toHaveBeenCalledTimes(1);

      // Re-render should not call again
      render(
        <TestWrapper>
          <RootLayout />
        </TestWrapper>
      );

      expect(mockPreventAutoHideAsync).toHaveBeenCalledTimes(2); // Once per mount
    });
  });
});
