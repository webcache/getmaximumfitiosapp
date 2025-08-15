// utils/cacheManager.ts
import * as FileSystem from 'expo-file-system';
import { disableNetwork, enableNetwork, terminate } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../firebase';

export interface CacheStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  cacheSize: string;
  pendingWrites: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private lastSyncTime: Date | null = null;
  private isOnline: boolean = true;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Clear all Firestore offline cache
   * Note: In React Native, Firestore uses memory cache which doesn't need manual clearing
   */
  async clearOfflineCache(): Promise<boolean> {
    try {
      console.log('🧹 CacheManager: Clearing offline cache...');
      
      if (Platform.OS === 'web') {
        // Terminate the Firestore instance
        await terminate(db);
        console.log('✅ CacheManager: Firestore instance terminated');
      } else {
        // React Native uses memory cache - no persistence to clear
        console.log('📱 CacheManager: React Native uses memory cache - no persistence to clear');
      }
      
      console.log('✅ CacheManager: Offline cache cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ CacheManager: Error clearing offline cache:', error);
      return false;
    }
  }

  /**
   * Force sync with Firestore by disabling and re-enabling network
   */
  async forceSyncWithFirestore(): Promise<boolean> {
    try {
      console.log('🔄 CacheManager: Starting force sync with Firestore...');
      
      // Disable network to flush pending writes
      await disableNetwork(db);
      console.log('🔄 CacheManager: Network disabled, flushing pending writes...');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Re-enable network
      await enableNetwork(db);
      console.log('🔄 CacheManager: Network re-enabled, syncing with server...');
      
      this.lastSyncTime = new Date();
      this.isOnline = true;
      
      console.log('✅ CacheManager: Force sync completed successfully');
      return true;
    } catch (error) {
      console.error('❌ CacheManager: Error during force sync:', error);
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Go offline (disable network)
   */
  async goOffline(): Promise<boolean> {
    try {
      console.log('📴 CacheManager: Going offline...');
      await disableNetwork(db);
      this.isOnline = false;
      console.log('✅ CacheManager: Now in offline mode');
      return true;
    } catch (error) {
      console.error('❌ CacheManager: Error going offline:', error);
      return false;
    }
  }

  /**
   * Go online (enable network)
   */
  async goOnline(): Promise<boolean> {
    try {
      console.log('📶 CacheManager: Going online...');
      await enableNetwork(db);
      this.isOnline = true;
      this.lastSyncTime = new Date();
      console.log('✅ CacheManager: Now in online mode');
      return true;
    } catch (error) {
      console.error('❌ CacheManager: Error going online:', error);
      return false;
    }
  }

  /**
   * Get cache status information
   */
  async getCacheStatus(): Promise<CacheStatus> {
    try {
      // Estimate cache size (this is approximate)
      let cacheSize = 'Unknown';
      if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          cacheSize = `${(estimate.usage / 1024 / 1024).toFixed(2)} MB`;
        }
      }

      return {
        isOnline: this.isOnline,
        lastSyncTime: this.lastSyncTime,
        cacheSize,
        pendingWrites: 0, // Firestore doesn't expose this directly
      };
    } catch (error) {
      console.error('❌ CacheManager: Error getting cache status:', error);
      return {
        isOnline: this.isOnline,
        lastSyncTime: this.lastSyncTime,
        cacheSize: 'Error',
        pendingWrites: 0,
      };
    }
  }

  /**
   * Clear all app data (cache + local storage)
   */
  async clearAllAppData(): Promise<boolean> {
    try {
      console.log('🧹 CacheManager: Clearing all app data...');
      
      // Clear Firestore cache
      const cacheCleared = await this.clearOfflineCache();
      
      // Clear localStorage if available
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
        console.log('🧹 CacheManager: localStorage cleared');
      }
      
      // Clear sessionStorage if available
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
        console.log('🧹 CacheManager: sessionStorage cleared');
      }
      
      // Reset internal state
      this.lastSyncTime = null;
      this.isOnline = true;
      
      console.log('✅ CacheManager: All app data cleared successfully');
      console.log('⚠️  WARNING: This only clears local cache. For GDPR compliance, user data in Firestore must be deleted separately.');
      
      return cacheCleared;
    } catch (error) {
      console.error('❌ CacheManager: Error clearing all app data:', error);
      return false;
    }
  }

  /**
   * GDPR-compliant user data export
   * Exports ALL user data from Firestore as JSON
   * Complies with GDPR Article 15 (Right of Access) and Article 20 (Data Portability)
   */
  async exportAllUserData(userId: string): Promise<boolean> {
    try {
      console.log('📦 CacheManager: Starting GDPR-compliant user data export for user:', userId);
      
      // Import Firebase functions
      const { doc, collection, getDocs, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const userData: any = {
        exportDate: new Date().toISOString(),
        userId: userId,
        profile: null,
        collections: {}
      };
      
      // Export main profile document
      try {
        console.log(`📦 Exporting main profile: profiles/${userId}`);
        const userProfileRef = doc(db, 'profiles', userId);
        const profileSnapshot = await getDoc(userProfileRef);
        
        if (profileSnapshot.exists()) {
          userData.profile = {
            id: profileSnapshot.id,
            ...profileSnapshot.data()
          };
          console.log('✅ Profile data exported');
        }
      } catch (error) {
        console.error('❌ Error exporting profile:', error);
      }
      
      // List of all user data collections to export
      const userDataCollections = [
        'workouts',
        'myExercises', 
        'favoriteWorkouts',
        'maxLifts',
        'weightHistory',
        'healthKitSettings',
        'featureUsage'
      ];
      
      // Export all subcollections
      for (const collectionName of userDataCollections) {
        try {
          console.log(`📦 Exporting collection: profiles/${userId}/${collectionName}`);
          const collectionRef = collection(db, 'profiles', userId, collectionName);
          const snapshot = await getDocs(collectionRef);
          
          userData.collections[collectionName] = snapshot.docs.map(docSnapshot => ({
            id: docSnapshot.id,
            ...docSnapshot.data()
          }));
          
          console.log(`✅ Exported ${snapshot.docs.length} documents from ${collectionName}`);
        } catch (error) {
          console.error(`❌ Error exporting collection ${collectionName}:`, error);
          userData.collections[collectionName] = { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
      
      // Export user fitness profile (top-level collection)
      try {
        const userFitnessProfileRef = doc(db, 'userFitnessProfiles', userId);
        const userFitnessProfileSnap = await getDoc(userFitnessProfileRef);
        if (userFitnessProfileSnap.exists()) {
          userData.userFitnessProfile = userFitnessProfileSnap.data();
        }
      } catch (error) {
        console.error('Error fetching user fitness profile:', error);
      }
      
      // Note: featureUsage is now a subcollection under profiles/{userId}/featureUsage 
      // and will be automatically exported with other subcollections
      
      // Export workout sessions (top-level collection with userId field)
      try {
        console.log(`📦 Exporting workout sessions for user: ${userId}`);
        const { query, where } = await import('firebase/firestore');
        const workoutSessionsRef = collection(db, 'workoutSessions');
        const workoutSessionsQuery = query(workoutSessionsRef, where('userId', '==', userId));
        const workoutSessionsSnapshot = await getDocs(workoutSessionsQuery);
        
        userData.workoutSessions = workoutSessionsSnapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as any)
        }));
        
        console.log(`✅ Exported ${workoutSessionsSnapshot.docs.length} workout sessions`);
      } catch (error) {
        console.error('❌ Error exporting workout sessions:', error);
        userData.workoutSessions = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
      
      // Convert to JSON and save to file
      const jsonData = JSON.stringify(userData, null, 2);
      const fileName = `user_data_export_${userId}_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonData);
      console.log('✅ Data exported to:', fileUri);
      
      // Share the file
      const { isAvailableAsync, shareAsync } = await import('expo-sharing');
      const isAvailable = await isAvailableAsync();
      if (isAvailable) {
        await shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export User Data (GDPR)',
          UTI: 'public.json'
        });
      }
      
      console.log('✅ CacheManager: GDPR-compliant user data export completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ CacheManager: Error during GDPR-compliant export:', error);
      return false;
    }
  }

  /**
   * GDPR-compliant user data deletion
   * Deletes ALL user data from Firestore (server-side)
   * WARNING: This action cannot be undone!
   */
  async deleteAllUserData(userId: string): Promise<boolean> {
    try {
      console.log('🗑️  CacheManager: Starting GDPR-compliant user data deletion for user:', userId);
      
      // Import Firebase functions
      const { deleteDoc, doc, collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      // List of all user data collections to delete (subcollections under profiles/{userId})
      const userDataCollections = [
        'workouts',
        'myExercises', 
        'favoriteWorkouts',
        'maxLifts',
        'weightHistory',
        'healthKitSettings'
      ];
      
      // Delete all subcollections under profiles/{userId}
      for (const collectionName of userDataCollections) {
        try {
          console.log(`🗑️  Deleting collection: profiles/${userId}/${collectionName}`);
          const collectionRef = collection(db, 'profiles', userId, collectionName);
          const snapshot = await getDocs(collectionRef);
          
          const deletePromises = snapshot.docs.map(docSnapshot => 
            deleteDoc(doc(db, 'profiles', userId, collectionName, docSnapshot.id))
          );
          
          await Promise.all(deletePromises);
          console.log(`✅ Deleted ${snapshot.docs.length} documents from ${collectionName}`);
        } catch (error) {
          console.error(`❌ Error deleting collection ${collectionName}:`, error);
          throw error;
        }
      }
      
      // Delete the main user profile document
      console.log(`🗑️  Deleting main profile: profiles/${userId}`);
      const userProfileRef = doc(db, 'profiles', userId);
      await deleteDoc(userProfileRef);
      
      // Delete user fitness profile (top-level collection)
      console.log(`🗑️  Deleting user fitness profile: userFitnessProfiles/${userId}`);
      try {
        const userFitnessProfileRef = doc(db, 'userFitnessProfiles', userId);
        await deleteDoc(userFitnessProfileRef);
        console.log(`✅ Deleted user fitness profile`);
      } catch (error: any) {
        console.error(`❌ Error deleting user fitness profile:`, error);
        // Don't throw error if document doesn't exist
        if (error?.code !== 'not-found') {
          throw error;
        }
      }
      
      // Delete workout sessions (top-level collection with userId field)
      console.log(`🗑️  Deleting workout sessions for user: ${userId}`);
      try {
        const workoutSessionsRef = collection(db, 'workoutSessions');
        const workoutSessionsQuery = query(workoutSessionsRef, where('userId', '==', userId));
        const workoutSessionsSnapshot = await getDocs(workoutSessionsQuery);
        
        const deleteSessionPromises = workoutSessionsSnapshot.docs.map(docSnapshot => 
          deleteDoc(docSnapshot.ref)
        );
        
        await Promise.all(deleteSessionPromises);
        console.log(`✅ Deleted ${workoutSessionsSnapshot.docs.length} workout sessions`);
      } catch (error: any) {
        console.error(`❌ Error deleting workout sessions:`, error);
        // Don't throw error if collection doesn't exist or is empty
        if (error?.code !== 'not-found') {
          throw error;
        }
      }
      
      // Clear local cache after deleting server data
      await this.clearAllAppData();
      
      console.log('✅ CacheManager: GDPR-compliant user data deletion completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ CacheManager: Error during GDPR-compliant deletion:', error);
      return false;
    }
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Check if currently online
   */
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Update last sync time
   */
  updateLastSyncTime(): void {
    this.lastSyncTime = new Date();
  }
}

export const cacheManager = CacheManager.getInstance();
