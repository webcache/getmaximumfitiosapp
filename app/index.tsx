import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { isAuthenticated, initialized } = useAuth();

  // While the auth state is initializing, show a loading spinner.
  // This prevents a flash of the login screen before the user is authenticated.
  if (!initialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Once initialized, redirect the user based on their auth status.
  // This is the idiomatic way to handle routing in Expo Router.
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/dashboard" />;
  } else {
    return <Redirect href="/login/loginScreen" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});