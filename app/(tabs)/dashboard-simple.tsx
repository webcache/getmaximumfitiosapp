import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function DashboardSimple() {
  const user = useSelector((state: RootState) => state.auth.user);
  const userProfile = useSelector((state: RootState) => state.auth.userProfile);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (userProfile?.firstName) {
      setUserName(userProfile.firstName);
    } else if (user?.displayName) {
      setUserName(user.displayName.split(' ')[0]);
    } else if (user?.email) {
      const emailName = user.email.split('@')[0];
      setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
    } else {
      setUserName('Fitness Enthusiast');
    }
  }, [user, userProfile]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Fitness Dashboard</Text>
          <Text style={styles.sectionText}>
            Track your workouts, set goals, and achieve your maximum fitness potential.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Plan</Text>
          <Text style={styles.sectionText}>
            No workout scheduled for today. Ready to start a new routine?
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <Text style={styles.sectionText}>
            Keep up the great work! Your consistency is the key to success.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#A1CEDC',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D3D47',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1D3D47',
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});
