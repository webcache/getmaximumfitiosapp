import { ScrollView, StyleSheet } from 'react-native';
import AccountLinking from '../components/AccountLinking';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useAuth } from '../hooks/useAuth'; // Updated to use Redux-based hook

export default function ProfileSettingsScreen() {
  const { userProfile } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.title}>Profile Settings</ThemedText>
        
        {/* Other profile settings would go here */}
        
        {/* Account Linking Section */}
        <AccountLinking />
        
        {/* Additional settings sections */}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
});
