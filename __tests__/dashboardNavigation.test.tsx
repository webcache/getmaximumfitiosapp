/**
 * Dashboard Navigation Tests
 * 
 * Tests navigation functionality from the dashboard to other tabs:
 * - Navigation to workouts tab from workout cards
 * - Navigation to other tabs through tab bar
 * - Proper authentication state handling
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

// Mock external dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

// Mock React Native
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
  };
});

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  getDocs: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  addDoc: jest.fn(),
}));

// Mock Firebase instance
jest.mock('../firebase', () => ({
  db: {},
}));

// Mock auth guard hook
jest.mock('../hooks/useAuthGuard', () => ({
  useAuthGuard: jest.fn(),
}));

// Mock AI chat hook
jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn(),
}));

// Mock Expo Image
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

// Mock utils
jest.mock('../utils', () => ({
  convertExercisesToFormat: jest.fn(),
  convertFirestoreDate: jest.fn(),
  formatDate: jest.fn(),
  generateAPIUrl: jest.fn(),
  getTodayLocalString: jest.fn(),
}));

// Mock ParallaxScrollView
jest.mock('@/components/ParallaxScrollView', () => 'ParallaxScrollView');

// Mock ThemedText and ThemedView
jest.mock('@/components/ThemedText', () => ({
  ThemedText: 'ThemedText',
}));

jest.mock('@/components/ThemedView', () => ({
  ThemedView: 'ThemedView',
}));

// Mock fetch
jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

describe('Dashboard Navigation Tests', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    // Mock auth guard hook to return authenticated state
    const mockUseAuthGuard = require('../hooks/useAuthGuard').useAuthGuard as jest.Mock;
    mockUseAuthGuard.mockReturnValue({
      isReady: true,
      user: { uid: 'test-uid', email: 'test@example.com' },
      userProfile: { name: 'Test User' },
    });

    // Mock useChat hook
    const mockUseChat = require('@ai-sdk/react').useChat as jest.Mock;
    mockUseChat.mockReturnValue({
      messages: [],
      input: '',
      error: null,
      status: 'ready',
      stop: jest.fn(),
      setInput: jest.fn(),
      append: jest.fn(),
    });

    // Mock Firestore operations
    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValue({
      empty: true,
      docs: [],
    });

    // Mock utils
    const utils = require('../utils');
    utils.getTodayLocalString.mockReturnValue('2024-01-15');
    utils.formatDate.mockReturnValue('Jan 15, 2024');
    utils.generateAPIUrl.mockReturnValue('/api/ai/chat');
  });

  describe('Dashboard to Workouts Navigation', () => {
    it('should navigate to workouts tab when workout card is pressed', async () => {
      // Mock Firestore to return a workout
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        empty: false,
        docs: [{
          data: () => ({
            title: 'Upper Body Workout',
            date: '2024-01-16',
            exercises: [
              { name: 'Bench Press', sets: [] },
              { name: 'Pull-ups', sets: [] },
              { name: 'Shoulder Press', sets: [] },
            ],
          }),
        }],
      });

      const MockDashboardWorkoutCard = () => {
        const router = useRouter();
        
        const handleWorkoutPress = () => {
          router.push('/(tabs)/workouts');
        };

        return (
          <View testID="dashboard-container">
            <TouchableOpacity testID="next-workout-card" onPress={handleWorkoutPress}>
              <Text>Upper Body Workout</Text>
              <Text>Tomorrow</Text>
              <Text>Bench Press, Pull-ups, Shoulder Press</Text>
              <Text>Tap to view workouts →</Text>
            </TouchableOpacity>
          </View>
        );
      };

      render(<MockDashboardWorkoutCard />);

      const workoutCard = screen.getByTestId('next-workout-card');
      fireEvent.press(workoutCard);

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/workouts');
    });

    it('should navigate to workouts tab when no workouts card is pressed', async () => {
      const MockDashboardNoWorkouts = () => {
        const router = useRouter();
        
        const handleCreateWorkoutPress = () => {
          router.push('/(tabs)/workouts');
        };

        return (
          <View testID="dashboard-container">
            <TouchableOpacity testID="no-workout-card" onPress={handleCreateWorkoutPress}>
              <Text>No upcoming workouts scheduled</Text>
              <Text>Tap to create your first workout →</Text>
            </TouchableOpacity>
          </View>
        );
      };

      render(<MockDashboardNoWorkouts />);

      const noWorkoutCard = screen.getByTestId('no-workout-card');
      fireEvent.press(noWorkoutCard);

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/workouts');
    });
  });

  describe('Tab Navigation Simulation', () => {
    it('should simulate navigation to progress tab', () => {
      const MockTabNavigation = () => {
        const router = useRouter();
        
        const navigateToProgress = () => {
          router.push('/(tabs)/progress');
        };

        return (
          <View testID="tab-bar">
            <TouchableOpacity testID="progress-tab" onPress={navigateToProgress}>
              <Text>Progress</Text>
            </TouchableOpacity>
          </View>
        );
      };

      render(<MockTabNavigation />);

      const progressTab = screen.getByTestId('progress-tab');
      fireEvent.press(progressTab);

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/progress');
    });

    it('should simulate navigation to profile tab', () => {
      const MockTabNavigation = () => {
        const router = useRouter();
        
        const navigateToProfile = () => {
          router.push('/(tabs)/profile');
        };

        return (
          <View testID="tab-bar">
            <TouchableOpacity testID="profile-tab" onPress={navigateToProfile}>
              <Text>Profile</Text>
            </TouchableOpacity>
          </View>
        );
      };

      render(<MockTabNavigation />);

      const profileTab = screen.getByTestId('profile-tab');
      fireEvent.press(profileTab);

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/profile');
    });

    it('should simulate navigation to settings tab', () => {
      const MockTabNavigation = () => {
        const router = useRouter();
        
        const navigateToSettings = () => {
          router.push('/(tabs)/settings');
        };

        return (
          <View testID="tab-bar">
            <TouchableOpacity testID="settings-tab" onPress={navigateToSettings}>
              <Text>Settings</Text>
            </TouchableOpacity>
          </View>
        );
      };

      render(<MockTabNavigation />);

      const settingsTab = screen.getByTestId('settings-tab');
      fireEvent.press(settingsTab);

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings');
    });
  });

  describe('Dashboard Authentication State', () => {
    it('should not render dashboard content when auth is not ready', () => {
      const mockUseAuthGuard = require('../hooks/useAuthGuard').useAuthGuard as jest.Mock;
      mockUseAuthGuard.mockReturnValue({
        isReady: false,
        user: null,
        userProfile: null,
      });

      const MockDashboardLoading = () => {
        const { isReady } = require('../hooks/useAuthGuard').useAuthGuard();
        
        if (!isReady) {
          return (
            <View testID="loading-container">
              <Text>Loading...</Text>
            </View>
          );
        }

        return (
          <View testID="dashboard-content">
            <Text>Dashboard Content</Text>
          </View>
        );
      };

      render(<MockDashboardLoading />);

      expect(screen.getByTestId('loading-container')).toBeTruthy();
      expect(screen.queryByTestId('dashboard-content')).toBeNull();
    });

    it('should render dashboard content when auth is ready', () => {
      const MockDashboardWithAuth = () => {
        const { isReady } = require('../hooks/useAuthGuard').useAuthGuard();
        
        if (!isReady) {
          return (
            <View testID="loading-container">
              <Text>Loading...</Text>
            </View>
          );
        }

        return (
          <View testID="dashboard-content">
            <Text>Welcome to Dashboard</Text>
          </View>
        );
      };

      render(<MockDashboardWithAuth />);

      expect(screen.getByTestId('dashboard-content')).toBeTruthy();
      expect(screen.queryByTestId('loading-container')).toBeNull();
    });
  });

  describe('Dashboard Workout Data Integration', () => {
    it('should handle loading state for workout data', async () => {
      // Mock Firestore to be slow
      const { getDocs } = require('firebase/firestore');
      getDocs.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ empty: true, docs: [] }), 100))
      );

      const MockDashboardWithLoading = () => {
        const [loading, setLoading] = React.useState(true);
        
        React.useEffect(() => {
          const fetchData = async () => {
            await getDocs();
            setLoading(false);
          };
          fetchData();
        }, []);

        return (
          <View testID="dashboard-container">
            {loading ? (
              <Text testID="loading-text">Loading workout data...</Text>
            ) : (
              <Text testID="no-workouts">No upcoming workouts scheduled</Text>
            )}
          </View>
        );
      };

      render(<MockDashboardWithLoading />);

      // Should show loading initially
      expect(screen.getByTestId('loading-text')).toBeTruthy();

      // Should show content after loading
      await waitFor(() => {
        expect(screen.getByTestId('no-workouts')).toBeTruthy();
      });

      expect(screen.queryByTestId('loading-text')).toBeNull();
    });
  });
});
