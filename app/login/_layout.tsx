import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LoginLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitle: 'GetMaximumFit',
          headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#007AFF',
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? '#121212' : '#F8F8F8',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colorScheme === 'dark' ? '#121212' : '#FFFFFF',
          }
        }}
      >
        <Stack.Screen 
          name="index"
          options={{
            title: 'Login',
          }} 
        />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
