import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  console.log(`🔍 Index: Auth state - loading: ${loading}, user: ${user ? 'exists' : 'null'}`);
  console.log(`🔍 Index: User details - ${user ? `ID: ${user.uid}` : 'null'}`);

  // Show loading state while auth is initializing
  if (loading) {
    console.log('⏳ Index: Showing loading screen');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  // Simple redirect logic based on auth state
  if (user) {
    console.log('✅ Index: User authenticated, redirecting to dashboard');
    return <Redirect href="/(tabs)/dashboard" />;
  } else {
    console.log('❌ Index: User not authenticated, redirecting to login');
    return <Redirect href="/login/loginScreen" />;
  }
}