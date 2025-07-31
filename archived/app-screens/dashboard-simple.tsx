import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const { user, userProfile, signOut } = useAuth();
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    if (userProfile?.firstName) {
      setUserName(userProfile.firstName);
    } else if (user?.displayName) {
      setUserName(user.displayName.split(' ')[0]);
    } else if (user?.email) {
      setUserName(user.email.split('@')[0]);
    }
  }, [user, userProfile]);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: signOut
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>
              Welcome, {userName}! 👋
            </Text>
            <Text style={styles.subtitle}>
              Ready to maximize your fitness journey?
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Quick Actions
            </Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Start Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.outlineButton]}>
                <Text style={[styles.actionButtonText, styles.outlineButtonText]}>View Progress</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Profile
            </Text>
            <View style={styles.profileCard}>
              <Text style={styles.profileText}>Email: {user?.email}</Text>
              {userProfile?.phone && (
                <Text style={styles.profileText}>Phone: {userProfile.phone}</Text>
              )}
              {userProfile?.height && (
                <Text style={styles.profileText}>Height: {userProfile.height}</Text>
              )}
              {userProfile?.weight && (
                <Text style={styles.profileText}>Weight: {userProfile.weight}</Text>
              )}
            </View>
          </View>

          {/* Sign Out */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    color: '#666',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButtonText: {
    color: '#007AFF',
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileText: {
    fontSize: 16,
    color: '#333',
  },
  signOutButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF3B30',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  signOutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});
