import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function IndexPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState('Loading...');

  useEffect(() => {
    console.log('Index screen mounted');
    console.log('User:', user);
    console.log('Loading:', loading);
    
    if (loading) {
      setDebugInfo('Checking authentication...');
      return;
    }

    if (user) {
      setDebugInfo('User authenticated, redirecting to dashboard...');
      router.replace('/(tabs)/dashboard');
    } else {
      setDebugInfo('No user found, redirecting to login...');
      router.replace('/login/loginScreen');
    }
  }, [user, loading, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Get Maximum Fit</Text>
      <Text style={styles.subtitle}>Your Fitness Journey Begins Here</Text>
      <Text style={styles.debug}>{debugInfo}</Text>
      <ActivityIndicator 
        size="large" 
        color="#FFFFFF" 
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 30,
  },
  debug: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 20,
  },
  loader: {
    marginTop: 20
  }
});
