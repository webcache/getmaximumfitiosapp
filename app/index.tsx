import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  const [readyToNavigate, setReadyToNavigate] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const logsRef = useRef<string[]>([]);

  // Add a small delay to prevent rapid navigation changes
  useEffect(() => {
    try {
      setDebugInfo(`Loading: ${loading}, User: ${user ? 'exists' : 'null'}, Ready: ${readyToNavigate}`);
      addLog(`AuthState: loading=${loading}, user=${user ? user.uid : 'null'}, readyToNavigate=${readyToNavigate}`);
      
      if (!loading) {
        const timer = setTimeout(() => {
          try {
            setReadyToNavigate(true);
            setDebugInfo(`Navigation ready - User: ${user ? user.uid : 'null'}`);
            addLog(`Navigation ready - User: ${user ? user.uid : 'null'}`);
          } catch (error) {
            console.error('Error in navigation timer:', error);
            addLog(`Error in navigation timer: ${String(error)}`);
            setNavigationError(String(error));
          }
        }, 100); // Small delay to ensure state is stable

        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Error in navigation effect:', error);
      addLog(`Error in navigation effect: ${String(error)}`);
      setNavigationError(String(error));
    }
  }, [loading, user, readyToNavigate]);

  // Helper to add logs
  function addLog(msg: string) {
    const timestamp = new Date().toISOString().slice(11, 23);
    logsRef.current = [msg + ' [' + timestamp + ']', ...logsRef.current].slice(0, 20);
    setDebugLogs([...logsRef.current]);
  }

  // Listen for signout events in AuthContext
  useEffect(() => {
    if (!user) {
      addLog('User signed out or not authenticated');
    }
  }, [user]);

  // Show error if navigation setup failed
  if (navigationError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>Navigation Error</Text>
        <Text style={{ marginTop: 10, fontSize: 12, textAlign: 'center' }}>{navigationError}</Text>
        <DebugOverlay logs={debugLogs} visible={true} onClose={() => setShowDebugOverlay(false)} />
      </View>
    );
  }

  // Show debug info while loading or not ready to navigate
  if (loading || !readyToNavigate) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
        <Text style={{ marginTop: 10, fontSize: 12 }}>{debugInfo}</Text>
        <TouchableOpacity onPress={() => setShowDebugOverlay(v => !v)} style={styles.debugButton}>
          <Text style={{ color: '#007AFF', fontSize: 12 }}>Show Debug Logs</Text>
        </TouchableOpacity>
        <DebugOverlay logs={debugLogs} visible={showDebugOverlay} onClose={() => setShowDebugOverlay(false)} />
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
        <DebugOverlay logs={debugLogs} visible={true} onClose={() => setShowDebugOverlay(false)} />
      </View>
    );
  }
}

// Debug overlay component
function DebugOverlay({ logs, visible, onClose }: { logs: string[]; visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayHeader}>
        <Text style={styles.overlayTitle}>Debug Logs</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Close</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.overlayScroll}>
        {logs.length === 0 ? (
          <Text style={{ color: '#888', fontSize: 12, margin: 10 }}>No logs yet.</Text>
        ) : (
          logs.map((log, idx) => (
            <Text key={idx} style={styles.logText}>{log}</Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  debugButton: {
    marginTop: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  overlay: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  overlayScroll: {
    maxHeight: 300,
    marginTop: 8,
  },
  logText: {
    fontSize: 12,
    color: '#222',
    marginBottom: 4,
  },
});