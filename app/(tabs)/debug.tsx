import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { db } from '../../firebase';

interface DebugInfo {
  timestamp: string;
  user?: any;
  userProfile?: any;
  firestoreProfile?: any;
  maxLifts?: any[];
  goals?: any[];
  weightHistory?: any[];
  error?: string;
}

export default function DebugScreen() {
  const { isReady, user, userProfile } = useAuthGuard();
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const addDebugInfo = (info: Omit<DebugInfo, 'timestamp'>) => {
    setDebugInfo(prev => [{
      ...info,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 9)]); // Keep last 10 entries
  };

  const runFullDebug = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔥 Debug: Starting full debug for user:', user?.uid);
      
      addDebugInfo({
        user: user ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        } : null,
        userProfile: userProfile ? {
          id: userProfile.id,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          displayName: userProfile.displayName,
          email: userProfile.email,
          phone: userProfile.phone,
          height: userProfile.height,
          weight: userProfile.weight
        } : null
      });

      if (user) {
        console.log('🔥 Debug: Checking Firestore profile for user:', user.uid);
        
        // Check Firestore profile directly
        const profileRef = doc(db, 'profiles', user.uid);
        console.log('🔥 Debug: Profile reference path:', `profiles/${user.uid}`);
        
        const profileSnap = await getDoc(profileRef);
        console.log('🔥 Debug: Profile snapshot exists:', profileSnap.exists());
        
        if (profileSnap.exists()) {
          const firestoreProfile = profileSnap.data();
          console.log('🔥 Debug: Firestore profile data:', firestoreProfile);
          addDebugInfo({
            firestoreProfile: {
              exists: true,
              data: firestoreProfile
            }
          });

          // Check max lifts
          console.log('🔥 Debug: Checking max lifts...');
          const maxLiftsRef = collection(db, 'profiles', user.uid, 'maxLifts');
          const maxLiftsSnap = await getDocs(maxLiftsRef);
          const maxLifts: any[] = [];
          maxLiftsSnap.forEach(doc => {
            console.log('🔥 Debug: Max lift doc:', { id: doc.id, data: doc.data() });
            maxLifts.push({ id: doc.id, ...doc.data() });
          });
          console.log('🔥 Debug: Total max lifts found:', maxLifts.length);

          // Check goals
          console.log('🔥 Debug: Checking goals...');
          const goalsRef = collection(db, 'profiles', user.uid, 'goals');
          const goalsSnap = await getDocs(goalsRef);
          const goals: any[] = [];
          goalsSnap.forEach(doc => {
            console.log('🔥 Debug: Goal doc:', { id: doc.id, data: doc.data() });
            goals.push({ id: doc.id, ...doc.data() });
          });
          console.log('🔥 Debug: Total goals found:', goals.length);

          // Check weight history
          console.log('🔥 Debug: Checking weight history...');
          const weightRef = collection(db, 'profiles', user.uid, 'weightHistory');
          const weightSnap = await getDocs(weightRef);
          const weightHistory: any[] = [];
          weightSnap.forEach(doc => {
            console.log('🔥 Debug: Weight history doc:', { id: doc.id, data: doc.data() });
            weightHistory.push({ id: doc.id, ...doc.data() });
          });
          console.log('🔥 Debug: Total weight history entries found:', weightHistory.length);

          addDebugInfo({
            maxLifts,
            goals,
            weightHistory
          });

        } else {
          console.log('❌ Debug: No Firestore profile document found');
          addDebugInfo({
            firestoreProfile: { exists: false },
            error: 'No Firestore profile document found'
          });
        }
      } else {
        console.log('❌ Debug: No user available for debug');
        addDebugInfo({
          error: 'No user available for debug'
        });
      }
    } catch (error) {
      console.error('❌ Debug: Error during debug run:', error);
      addDebugInfo({
        error: `Debug error: ${(error as Error).message}`
      });
    } finally {
      setLoading(false);
    }
  }, [user, userProfile, addDebugInfo]);

  useEffect(() => {
    if (isReady && user) {
      runFullDebug();
    }
  }, [isReady, user, userProfile, runFullDebug]);

  if (!isReady) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading auth...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Debug Data Loading</ThemedText>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={runFullDebug}
          disabled={loading}
        >
          <ThemedText style={styles.refreshText}>
            {loading ? 'Loading...' : 'Refresh'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.debugList}>
        {debugInfo.map((info, index) => (
          <ThemedView key={index} style={styles.debugItem}>
            <ThemedText style={styles.timestamp}>{info.timestamp}</ThemedText>
            <ThemedText style={styles.debugText}>
              {JSON.stringify(info, null, 2)}
            </ThemedText>
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshText: {
    color: 'white',
    fontWeight: 'bold',
  },
  debugList: {
    flex: 1,
  },
  debugItem: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#333',
  },
});
