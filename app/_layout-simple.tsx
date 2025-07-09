import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox, useColorScheme } from 'react-native';
import 'react-native-reanimated';

// Ignore specific Firebase warnings that can't be fixed in the current environment
LogBox.ignoreLogs([
  'Setting a timer for a long period of time',
  'AsyncStorage has been extracted from react-native core',
  'Component auth has not been registered yet',
]);

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen 
          name="login/loginScreen" 
          options={{ 
            headerShown: true,
            title: 'GetMaximumFit - Login',
            headerStyle: {
              backgroundColor: colorScheme === 'dark' ? '#121212' : '#F8F8F8',
            },
            headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#007AFF',
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
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
