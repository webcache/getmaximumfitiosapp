import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

// Auth hook using Firebase onAuthStateChanged and Firestore real-time listeners
export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Enable Firestore offline persistence once, globally
    firestore().settings({ persistence: true });
    const unsubscribeAuth = auth().onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setInitialized(true);
      setLoading(false);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (user && user.uid) {
      // Real-time listener for user profile
      const unsubscribeProfile = firestore()
        .collection('profiles')
        .doc(user.uid)
        .onSnapshot(snapshot => {
          setUserProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
        });
      return unsubscribeProfile;
    } else {
      setUserProfile(null);
    }
  }, [user]);

  const signOut = async () => {
    await auth().signOut();
    router.replace('/login/loginScreen');
  };

  return {
    user,
    userProfile,
    isAuthenticated: !!user,
    loading,
    error: null,
    initialized,
    signOut,
  };
};
