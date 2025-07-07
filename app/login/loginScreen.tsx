import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Try using the direct Firebase config instead of the one using env variables
import { auth, db } from '../../firebase-direct';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Set loading to false by default for quicker UI render
    setLoading(false);
    
    // Check if user is already authenticated
    const currentUser = auth.currentUser;
    if (currentUser) {
      // User is already signed in, navigate to main app
      router.replace('/(tabs)/dashboard' as any);
    }

    // Set up auth state listener to handle login during this session
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // User signed in during this session, navigate to main app
        router.replace('/(tabs)/dashboard' as any);
      }
    });
    
    return unsubscribe;
  }, [router]);

  const handleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // onAuthStateChanged will handle navigation
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };
  
  // Test if Firebase is connected and working properly
  const testFirebaseConnection = async () => {
    try {
      // Test Authentication first as it doesn't require special permissions
      const currentUser = auth.currentUser;
      let authStatus = 'Connected';
      let firestoreStatus = 'Not tested';
      
      // Only test Firestore if user is logged in
      if (currentUser) {
        try {
          // Create a user-specific document that the user should have permission to access
          const userDocRef = collection(db, `users/${currentUser.uid}/userData`);
          await getDocs(query(userDocRef, limit(1)));
          firestoreStatus = 'Connected';
        } catch (dbError: any) {
          firestoreStatus = `Error: ${dbError.message}`;
          console.log('Firestore error:', dbError);
        }
      } else {
        firestoreStatus = 'Login required for Firestore access';
      }
      
      Alert.alert(
        "Firebase Connection Test",
        `Firebase Authentication: ${authStatus}\nFirestore: ${firestoreStatus}\nCurrent user: ${currentUser ? currentUser.email : 'No user logged in'}`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      Alert.alert(
        "Firebase Connection Error",
        `Error connecting to Firebase: ${error.message}`,
        [{ text: "OK" }]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isLogin ? 'Login' : 'Sign Up'}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      
      {Platform.OS === 'ios' ? (
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleAuth}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
        </TouchableOpacity>
      ) : (
        <Button 
          title={isLogin ? 'Login' : 'Sign Up'} 
          onPress={handleAuth} 
          color="#007AFF" 
        />
      )}

      {/* Toggle between login and signup */}
      <TouchableOpacity onPress={toggleAuthMode} style={styles.switchMode}>
        <Text style={styles.switchModeText}>
          {isLogin 
            ? "Don't have an account? Sign Up" 
            : "Already have an account? Login"}
        </Text>
      </TouchableOpacity>
      
      <View style={{ marginTop: 20 }}>
        {Platform.OS === 'ios' ? (
          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: '#28a745' }]} 
            onPress={testFirebaseConnection}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Test Firebase Connection</Text>
          </TouchableOpacity>
        ) : (
          <Button 
            title="Test Firebase Connection" 
            onPress={testFirebaseConnection} 
            color="#28a745"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#007AFF',
  },
  input: {
    width: '100%',
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: 'red',
    marginBottom: 12,
  },
  switchMode: {
    marginTop: 16,
    padding: 8,
  },
  switchModeText: {
    color: '#007AFF',
    fontSize: 16,
  }
});
