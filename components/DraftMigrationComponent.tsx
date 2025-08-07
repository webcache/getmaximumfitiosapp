import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';

interface MigrationComponentProps {
  onComplete?: () => void;
}

export const DraftMigrationComponent: React.FC<MigrationComponentProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');

  const migrateDraftsToWorkouts = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    setIsLoading(true);
    setMigrationStatus('🔍 Checking for workout drafts...');

    try {
      // Get all workout drafts for this user
      const draftsRef = collection(db, 'profiles', user.uid, 'workoutDrafts');
      const draftsSnapshot = await getDocs(draftsRef);

      if (draftsSnapshot.empty) {
        setMigrationStatus('✅ No workout drafts found. Nothing to migrate.');
        setIsLoading(false);
        return;
      }

      setMigrationStatus(`📝 Found ${draftsSnapshot.size} draft(s). Starting migration...`);
      
      let migratedCount = 0;
      let failedCount = 0;

      // Process each draft
      for (const draftDoc of draftsSnapshot.docs) {
        const draftData = draftDoc.data();
        const draftName = draftData.name || draftData.title || 'Unnamed Draft';

        try {
          setMigrationStatus(`📦 Migrating: "${draftName}"...`);

          // Transform draft data to workout format
          const workoutData = {
            ...draftData,
            isCompleted: false,
            userId: user.uid,
            migratedFrom: 'workoutDraft',
            migratedAt: new Date(),
            originalDraftId: draftDoc.id
          };

          // Add to user's workouts subcollection
          const workoutRef = await addDoc(collection(db, 'profiles', user.uid, 'workouts'), workoutData);
          console.log(`✅ Created workout with ID: ${workoutRef.id}`);

          // Delete the original draft
          await deleteDoc(doc(db, 'profiles', user.uid, 'workoutDrafts', draftDoc.id));
          console.log(`🗑️ Deleted original draft: ${draftDoc.id}`);

          migratedCount++;

        } catch (error) {
          console.error(`❌ Failed to migrate draft "${draftName}":`, error);
          failedCount++;
        }
      }

      // Show final status
      const finalMessage = `
✅ Migration completed!
   Successfully migrated: ${migratedCount} draft(s)
   Failed migrations: ${failedCount} draft(s)
   
Your workout drafts are now available as "Upcoming Workouts" in the app.
      `.trim();

      setMigrationStatus(finalMessage);
      
      if (migratedCount > 0) {
        Alert.alert(
          'Migration Successful!', 
          `Successfully migrated ${migratedCount} workout draft(s) to planned workouts.`,
          [{ text: 'OK', onPress: onComplete }]
        );
      }

    } catch (error) {
      console.error('❌ Error during migration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMigrationStatus(`❌ Migration failed: ${errorMessage}`);
      Alert.alert('Migration Failed', `Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Draft Migration</Text>
      <Text style={styles.description}>
        This will migrate your saved workout drafts to the new planned workout system.
        Your drafts will become "Upcoming Workouts" that you can schedule for future dates.
      </Text>
      
      {migrationStatus ? (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{migrationStatus}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={migrateDraftsToWorkouts}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Migrating...' : 'Migrate My Workout Drafts'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.warning}>
        ⚠️ This action cannot be undone. Your drafts will be moved to the workouts collection.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warning: {
    fontSize: 12,
    color: '#FF6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
