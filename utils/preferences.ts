// utils/preferences.ts
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const UNIT_PREFERENCE_KEY = '@unit_preference';
export const THEME_COLOR_KEY = '@theme_color';

export type UnitType = 'lbs' | 'kg';

export interface UserPreferences {
  units: UnitType;
  themeColor: string;
  dashboardImage?: string | null;
}

export class PreferencesManager {
  private static instance: PreferencesManager;
  private preferences: UserPreferences = {
    units: 'lbs',
    themeColor: '#8c030e',
    dashboardImage: null
  };
  private listeners: ((preferences: UserPreferences) => void)[] = [];
  private currentUserId: string | null = null;

  static getInstance(): PreferencesManager {
    if (!PreferencesManager.instance) {
      PreferencesManager.instance = new PreferencesManager();
    }
    return PreferencesManager.instance;
  }

  // Set the current user ID for Firestore operations
  setUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  async loadPreferences(userId?: string): Promise<UserPreferences> {
    const userIdToUse = userId || this.currentUserId;
    
    if (!userIdToUse) {
      console.warn('No user ID provided for loading preferences, using defaults');
      return this.preferences;
    }

    try {
      const userDocRef = doc(db, 'profiles', userIdToUse);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        this.preferences = {
          units: userData.preferredUnits || 'lbs',
          themeColor: userData.themeColor || '#8c030e',
          dashboardImage: userData.dashboardImage || null
        };
      }

      this.notifyListeners();
      return this.preferences;
    } catch (error) {
      // Check if this is a permissions error (user data deleted/doesn't exist)
      const errorCode = (error as any)?.code;
      if (errorCode === 'permission-denied' || errorCode === 'not-found') {
        console.warn('User preferences not accessible (user may be deleted), using defaults');
        this.resetToLocalDefaults();
        return this.preferences;
      }
      
      console.error('Error loading preferences from Firestore:', error);
      return this.preferences;
    }
  }

  async setUnits(units: UnitType, userId?: string): Promise<void> {
    const userIdToUse = userId || this.currentUserId;
    
    if (!userIdToUse) {
      throw new Error('No user ID available for saving preferences');
    }

    try {
      this.preferences.units = units;
      await this.savePreferencesToFirestore(userIdToUse, this.preferences);
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving unit preference:', error);
      throw error;
    }
  }

  async setThemeColor(color: string, userId?: string): Promise<void> {
    const userIdToUse = userId || this.currentUserId;
    
    if (!userIdToUse) {
      throw new Error('No user ID available for saving preferences');
    }

    try {
      this.preferences.themeColor = color;
      await this.savePreferencesToFirestore(userIdToUse, this.preferences);
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving theme color:', error);
      throw error;
    }
  }

  async setDashboardImage(imageUri: string | null, userId?: string): Promise<void> {
    const userIdToUse = userId || this.currentUserId;
    
    if (!userIdToUse) {
      throw new Error('No user ID available for saving preferences');
    }

    try {
      this.preferences.dashboardImage = imageUri;
      await this.savePreferencesToFirestore(userIdToUse, this.preferences);
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving dashboard image:', error);
      throw error;
    }
  }

  private async savePreferencesToFirestore(userId: string, preferences: UserPreferences): Promise<void> {
    const userDocRef = doc(db, 'profiles', userId);
    
    // Update only the preferences field, don't overwrite the entire document
    await setDoc(userDocRef, {
      preferences: preferences
    }, { merge: true });
  }

  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  getUnits(): UnitType {
    return this.preferences.units;
  }

  getThemeColor(): string {
    return this.preferences.themeColor;
  }

  getDashboardImage(): string | null {
    return this.preferences.dashboardImage || null;
  }

  // Weight conversion utilities
  convertWeight(weight: number, fromUnit: UnitType, toUnit: UnitType): number {
    if (fromUnit === toUnit) return weight;
    
    if (fromUnit === 'lbs' && toUnit === 'kg') {
      return weight * 0.453592; // lbs to kg
    } else if (fromUnit === 'kg' && toUnit === 'lbs') {
      return weight * 2.20462; // kg to lbs
    }
    
    return weight;
  }

  formatWeight(weight: number, units?: UnitType): string {
    const targetUnits = units || this.preferences.units;
    const displayWeight = this.convertWeight(weight, 'lbs', targetUnits);
    
    return `${displayWeight.toFixed(1)} ${targetUnits}`;
  }

  // Helper to get weight in user's preferred units
  getWeightInPreferredUnits(weightInLbs: number): number {
    return this.convertWeight(weightInLbs, 'lbs', this.preferences.units);
  }

  // Helper to convert user input to storage format (always lbs)
  convertToStorageUnits(weight: number): number {
    return this.convertWeight(weight, this.preferences.units, 'lbs');
  }

  // Event listener management
  addListener(listener: (preferences: UserPreferences) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (preferences: UserPreferences) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.preferences));
  }

  // Reset all preferences
  async resetToDefaults(userId?: string): Promise<void> {
    const userIdToUse = userId || this.currentUserId;
    
    if (!userIdToUse) {
      throw new Error('No user ID available for resetting preferences');
    }

    try {
      this.preferences = {
        units: 'lbs',
        themeColor: '#8c030e',
        dashboardImage: null
      };
      
      await this.savePreferencesToFirestore(userIdToUse, this.preferences);
      this.notifyListeners();
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw error;
    }
  }

  // Reset preferences to local defaults without Firestore interaction
  resetToLocalDefaults(): void {
    this.preferences = {
      units: 'lbs',
      themeColor: '#8c030e',
      dashboardImage: null
    };
    this.notifyListeners();
  }

  // Clean up when user signs out or account is deleted
  cleanup(): void {
    console.log('🔥 PreferencesManager: Cleaning up user preferences');
    this.currentUserId = null;
    this.resetToLocalDefaults();
    // Clear all listeners to prevent memory leaks
    this.listeners = [];
  }
}

// Singleton instance
export const preferencesManager = PreferencesManager.getInstance();
