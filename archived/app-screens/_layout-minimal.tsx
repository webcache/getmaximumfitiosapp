import { Stack } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

/**
 * Minimal layout for testing - no authentication, no complex state management
 */
export default function MinimalRootLayout() {
  console.log('🔄 Minimal layout rendering');

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Minimal Test App</Text>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
