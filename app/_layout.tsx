import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ReduxAuthProvider } from '../contexts/ReduxAuthProvider';
import '../polyfills'; // Import polyfills first

// Safe LogBox import and usage for test environments
let LogBox: any;
try {
  LogBox = require('react-native').LogBox;
} catch (e) {
  LogBox = null;
}

// Ignore specific Firebase warnings that can't be fixed in the current environment
// Safe check for LogBox availability (might not be available in test environment)
if (LogBox && typeof LogBox.ignoreLogs === 'function') {
  LogBox.ignoreLogs([
    'Setting a timer for a long period of time',
    'AsyncStorage has been extracted from react-native core',
    'AsyncStorage',  // General AsyncStorage warnings
    '@react-native-async-storage',  // Package-specific warnings
    'We recommend react-native-async-storage',  // Migration warnings
    'Use `@react-native-async-storage/async-storage`',  // Migration warnings
    'Component auth has not been registered yet',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
    'onAnimatedValueUpdate',
    'Animated:',  // Animated related warnings
    'RCTBridge',  // React Native bridge warnings
    'Warning: ...',  // Generic warning pattern
    '[firebase/auth]',  // Firebase auth warnings
    'firebase/auth:Auth',  // Specific Firebase v11 auth warnings
    'FirebaseError:',  // Firebase general errors that may be handled elsewhere
  ]);
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      // Add a 3-second delay to see the splash screen with the new logo
      const timeoutId = setTimeout(async () => {
        try {
          await SplashScreen.hideAsync();
        } catch (error) {
          console.warn('Failed to hide splash screen:', error);
        }
      }, 3000); // 3000ms = 3 seconds

      // Cleanup function to clear timeout if component unmounts
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ReduxAuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen 
            name="login/loginScreen" 
            options={{ 
              headerShown: true,
              title: 'GetMaximumFit',
              headerStyle: {
                backgroundColor: '#F8F8F8',
              },
              headerTintColor: '#020202',
              headerShadowVisible: false,
            }} 
          />
          <Stack.Screen 
            name="exerciseBrowserScreen" 
            options={{ 
              headerShown: true,
              title: 'Exercise Library',
              headerBackTitle: 'Back',
              headerStyle: {
                backgroundColor: '#F8F8F8',
              },
              headerTintColor: '#020202',
              headerShadowVisible: false,
            }} 
          />
          <Stack.Screen 
            name="exerciseDetail" 
            options={{ 
              headerShown: true,
              title: 'Exercise Detail',
              headerBackTitle: 'Back',
              headerStyle: {
                backgroundColor: '#F8F8F8',
              },
              headerTintColor: '#020202',
              headerShadowVisible: false,
            }} 
          />
          <Stack.Screen 
            name="myExercises" 
            options={{ 
              headerShown: true,
              title: 'My Exercises',
              headerBackTitle: 'Back',
              headerStyle: {
                backgroundColor: '#F8F8F8',
              },
              headerTintColor: '#020202',
              headerShadowVisible: false,
            }} 
          />
          <Stack.Screen 
            name="(tabs)" 
            options={{ 
              headerShown: false,
            }} 
          />
          <Stack.Screen name="+not-found" options={{ headerShown: true }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </ReduxAuthProvider>
  );
}
