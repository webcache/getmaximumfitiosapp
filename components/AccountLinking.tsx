import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export default function AccountLinking() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Check which providers are linked to the user
  const linkedProviders = user.providerData?.map(provider => provider.providerId) || [];
  const isGoogleLinked = linkedProviders.includes('google.com');
  const isAppleLinked = linkedProviders.includes('apple.com');

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Linked Accounts</ThemedText>
      
      <View style={styles.accountRow}>
        <View style={styles.accountInfo}>
          <FontAwesome5 
            name="google" 
            size={20} 
            color={isGoogleLinked ? "#4285F4" : "#ccc"} 
            style={styles.icon} 
          />
          <ThemedText style={styles.accountText}>Google</ThemedText>
        </View>
        <ThemedText style={[
          styles.statusText, 
          { color: isGoogleLinked ? '#4CAF50' : '#999' }
        ]}>
          {isGoogleLinked ? 'Linked' : 'Not Linked'}
        </ThemedText>
      </View>

      <View style={styles.accountRow}>
        <View style={styles.accountInfo}>
          <FontAwesome5 
            name="apple" 
            size={20} 
            color={isAppleLinked ? "#000" : "#ccc"} 
            style={styles.icon} 
          />
          <ThemedText style={styles.accountText}>Apple</ThemedText>
        </View>
        <ThemedText style={[
          styles.statusText, 
          { color: isAppleLinked ? '#4CAF50' : '#999' }
        ]}>
          {isAppleLinked ? 'Linked' : 'Not Linked'}
        </ThemedText>
      </View>

      <ThemedText style={styles.note}>
        Account linking allows you to sign in with multiple providers using the same profile.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    margin: 10,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
    width: 20,
  },
  accountText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
});
