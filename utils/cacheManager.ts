// utils/cacheManager.ts
import { clearIndexedDbPersistence, enableNetwork, disableNetwork, terminate, connectFirestoreEmulator } from 'firebase/firestore';
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
   */
  async clearOfflineCache(): Promise<boolean> {
    try {
      console.log('🧹 CacheManager: Clearing offline cache...');
      
      // Terminate the Firestore instance
      await terminate(db);
      
      // Clear IndexedDB persistence
      await clearIndexedDbPersistence(db);
      
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
      return cacheCleared;
    } catch (error) {
      console.error('❌ CacheManager: Error clearing all app data:', error);
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
