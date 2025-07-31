import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  // Show nothing while loading
  if (loading) {
    return null;
  }

  // Simple redirect based on auth state
  if (user) {
    console.log('✅ Index: User authenticated, redirecting to dashboard');
    return <Redirect href="/(tabs)/dashboard" />;
  } else {
    console.log('❌ Index: User not authenticated, redirecting to login');
    return <Redirect href="/login/loginScreen" />;
  }
}