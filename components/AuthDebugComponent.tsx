import { doc, getDoc } from 'firebase/firestore';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';

export default function AuthDebugComponent() {
  const { user, userProfile, loading, initialized } = useAuth();

  const testDirectAccess = async () => {
    if (!user?.uid) {
      Alert.alert('No User', 'No authenticated user found');
      return;
    }

    try {
      console.log('🧪 AuthDebug: Testing direct Firestore access...');
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        console.log('🧪 AuthDebug: Direct Firestore data:', data);
        
        Alert.alert(
          'AuthDebug: Direct Test',
          `Document exists: Yes\n` +
          `FirstName: "${data?.firstName || 'empty'}"\n` +
          `LastName: "${data?.lastName || 'empty'}"\n` +
          `Height: "${data?.height || 'empty'}"\n` +
          `Weight: "${data?.weight || 'empty'}"`
        );
      } else {
        Alert.alert('AuthDebug: Direct Test', 'Document does not exist!');
      }
    } catch (error) {
      console.error('🧪 AuthDebug: Error:', error);
      Alert.alert('AuthDebug: Error', `${error}`);
    }
  };

  const testContextState = () => {
    console.log('🧪 AuthDebug: Context state check:', {
      user: user ? { uid: user.uid, email: user.email } : 'null',
      userProfile: userProfile ? {
        id: userProfile.id,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        height: userProfile.height,
        weight: userProfile.weight,
        allKeys: Object.keys(userProfile)
      } : 'null',
      loading,
      initialized
    });

    Alert.alert(
      'AuthDebug: Context State',
      `User: ${user ? user.email : 'null'}\n` +
      `UserProfile: ${userProfile ? 'exists' : 'null'}\n` +
      `Loading: ${loading}\n` +
      `Initialized: ${initialized}\n` +
      (userProfile ? `FirstName: "${userProfile.firstName}"` : 'No profile')
    );
  };

  return (
    <View style={{ padding: 20, backgroundColor: '#f0f0f0', margin: 10, borderRadius: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Auth Debug Component</Text>
      
      <TouchableOpacity
        onPress={testContextState}
        style={{ backgroundColor: '#007AFF', padding: 10, borderRadius: 5, marginBottom: 10 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Test Context State</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={testDirectAccess}
        style={{ backgroundColor: '#FF9500', padding: 10, borderRadius: 5 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Test Direct Firestore</Text>
      </TouchableOpacity>
    </View>
  );
}
