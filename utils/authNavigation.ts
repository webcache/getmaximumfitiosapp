import { router } from 'expo-router';

export const AuthNavigator = {
  // Navigate to login screen (only for unauthenticated users)
  toLogin: () => {
    console.log('🧭 AuthNavigator: Navigating to login');
    router.replace('/login/loginScreen');
  },

  // Navigate to dashboard (only for authenticated users)
  toDashboard: () => {
    console.log('🧭 AuthNavigator: Navigating to dashboard');
    router.replace('/(tabs)/dashboard');
  },

  // Handle sign-out navigation
  onSignOut: () => {
    console.log('🧭 AuthNavigator: Handling sign-out navigation');
    router.replace('/login/loginScreen');
  }
};
