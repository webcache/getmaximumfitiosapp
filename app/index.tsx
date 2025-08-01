import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  const [readyToNavigate, setReadyToNavigate] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [navigationError, setNavigationError] = useState<string | null>(null);

  // Add a small delay to prevent rapid navigation changes
  useEffect(() => {
    try {
      setDebugInfo(`Loading: ${loading}, User: ${user ? 'exists' : 'null'}, Ready: ${readyToNavigate}`);
      
      if (!loading) {
        const timer = setTimeout(() => {
          try {
            setReadyToNavigate(true);
            setDebugInfo(`Navigation ready - User: ${user ? user.uid : 'null'}`);
          } catch (error) {
            console.error('Error in navigation timer:', error);
            setNavigationError(String(error));
          }
        }, 100); // Small delay to ensure state is stable

        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Error in navigation effect:', error);
      setNavigationError(String(error));
    }
  }, [loading, user, readyToNavigate]);

  // Show error if navigation setup failed
  if (navigationError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>Navigation Error</Text>
        <Text style={{ marginTop: 10, fontSize: 12, textAlign: 'center' }}>{navigationError}</Text>
      </View>
    );
  }

  // Show debug info while loading or not ready to navigate
  if (loading || !readyToNavigate) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
        <Text style={{ marginTop: 10, fontSize: 12 }}>{debugInfo}</Text>
      </View>
    );
  }

  try {
    // Simple redirect based on auth state
    if (user) {
      console.log('✅ Index: User authenticated, redirecting to dashboard');
      return <Redirect href="/(tabs)/dashboard" />;
    } else {
      console.log('❌ Index: User not authenticated, redirecting to login');
      return <Redirect href="/login/loginScreen" />;
    }
  } catch (error) {
    console.error('💥 Index: Error during redirect:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>Navigation Error</Text>
        <Text style={{ marginTop: 10, fontSize: 12, textAlign: 'center' }}>{String(error)}</Text>
      </View>
    );
  }
}