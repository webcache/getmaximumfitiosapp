import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';
import { db } from '../firebase';

export interface HealthKitService {
  isHealthKitAvailable(): boolean;
  getHealthKitSettings(userId: string): Promise<HealthKitSettings>;
  updateHealthKitSettings(userId: string, settings: Partial<HealthKitSettings>): Promise<void>;
  initializeHealthKit(): Promise<boolean>;
  saveWorkoutToHealthKit(workout: WorkoutData, userId?: string): Promise<boolean>;
  saveQuantitySample(type: string, value: number, unit: string, startDate?: Date, endDate?: Date): Promise<boolean>;
  getHealthData(userId?: string): Promise<any>;
}

export interface HealthKitSettings {
  enabled: boolean;
  autoSync: boolean;
  syncWorkouts: boolean;
  syncSteps: boolean;
  syncHeartRate: boolean;
}

export interface WorkoutData {
  title: string;
  startDate: Date;
  endDate: Date;
  duration: number; // in minutes
  exercises: {
    name: string;
    sets: {
      reps: number;
      weight?: number;
    }[];
  }[];
}

const defaultSettings: HealthKitSettings = {
  enabled: false,
  autoSync: true,
  syncWorkouts: true,
  syncSteps: true,
  syncHeartRate: false,
};

class HealthKitServiceImpl implements HealthKitService {
  private initialized = false;

  isHealthKitAvailable(): boolean {
    if (Platform.OS !== 'ios') {
      return false;
    }
    
    try {
      // react-native-health isAvailable doesn't require parameters in some versions
      // We'll use a simple check based on platform for now
      return true;
    } catch (error) {
      console.error('Error checking HealthKit availability:', error);
      return false;
    }
  }

  async getHealthKitSettings(userId: string): Promise<HealthKitSettings> {
    try {
      const docRef = doc(db, 'profiles', userId, 'healthKitSettings', 'settings');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...defaultSettings,
          ...data,
        };
      }
      
      return defaultSettings;
    } catch (error) {
      console.error('Error getting HealthKit settings:', error);
      throw error;
    }
  }

  async updateHealthKitSettings(userId: string, settings: Partial<HealthKitSettings>): Promise<void> {
    try {
      const docRef = doc(db, 'profiles', userId, 'healthKitSettings', 'settings');
      const currentSettings = await this.getHealthKitSettings(userId);
      const updatedSettings = { ...currentSettings, ...settings };
      
      await setDoc(docRef, {
        ...updatedSettings,
        updatedAt: new Date(),
      }, { merge: true });
      
      // If HealthKit was enabled and not yet initialized, initialize it
      if (updatedSettings.enabled && !this.initialized) {
        await this.initializeHealthKit();
      }
      
      console.log('HealthKit settings updated successfully');
    } catch (error) {
      console.error('Error updating HealthKit settings:', error);
      throw error;
    }
  }

  async initializeHealthKit(): Promise<boolean> {
    if (!this.isHealthKitAvailable()) {
      console.log('HealthKit not available on this device');
      return false;
    }

    const permissions: HealthKitPermissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.Height,
          AppleHealthKit.Constants.Permissions.Weight,
          AppleHealthKit.Constants.Permissions.BodyMassIndex,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.DistanceCycling,
        ],
        write: [
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.Weight,
          AppleHealthKit.Constants.Permissions.Workout,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.DistanceCycling,
        ],
      },
    };

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.error('Error initializing HealthKit:', error);
          this.initialized = false;
          resolve(false);
        } else {
          console.log('HealthKit initialized successfully');
          this.initialized = true;
          resolve(true);
        }
      });
    });
  }

  async saveWorkoutToHealthKit(workout: WorkoutData, userId?: string): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    // Check if user has HealthKit enabled (requires userId)
    if (userId) {
      const settings = await this.getHealthKitSettings(userId);
      if (!settings.enabled || !settings.syncWorkouts) {
        return false;
      }
    }

    const workoutData = {
      type: AppleHealthKit.Constants.Activities.TraditionalStrengthTraining,
      startDate: workout.startDate.toISOString(),
      endDate: workout.endDate.toISOString(),
      energyBurned: this.estimateCalories(workout),
      energyBurnedUnit: AppleHealthKit.Constants.Units.calorie,
      metadata: {
        HKWorkoutBrandName: 'GetMaximumFit',
        HKExternalUUID: `gmf-${Date.now()}`,
        exercises: workout.exercises.map(ex => `${ex.name}: ${ex.sets.length} sets`).join(', '),
      },
    };

    return new Promise((resolve) => {
      AppleHealthKit.saveWorkout(workoutData, (error: string, result: any) => {
        if (error) {
          console.error('Error saving workout to HealthKit:', error);
          resolve(false);
        } else {
          console.log('Workout saved to HealthKit successfully:', result);
          resolve(true);
        }
      });
    });
  }

  async saveQuantitySample(type: string, value: number, unit: string, startDate?: Date, endDate?: Date): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    const sampleData = {
      value: value,
      unit: unit as any, // TypeScript workaround for unit string
      startDate: startDate ? startDate.toISOString() : new Date().toISOString(),
      endDate: endDate ? endDate.toISOString() : new Date().toISOString(),
    };

    return new Promise((resolve) => {
      // Use the appropriate save method based on the type
      switch (type) {
        case 'HeartRate':
          AppleHealthKit.saveHeartRateSample(sampleData, (error: string, result: any) => {
            if (error) {
              console.error('Error saving HeartRate to HealthKit:', error);
              resolve(false);
            } else {
              console.log('HeartRate saved to HealthKit successfully:', result);
              resolve(true);
            }
          });
          break;
        case 'DistanceWalkingRunning':
          AppleHealthKit.saveWalkingRunningDistance(sampleData, (error: string, result: any) => {
            if (error) {
              console.error('Error saving DistanceWalkingRunning to HealthKit:', error);
              resolve(false);
            } else {
              console.log('DistanceWalkingRunning saved to HealthKit successfully:', result);
              resolve(true);
            }
          });
          break;
        case 'Steps':
          AppleHealthKit.saveSteps(sampleData, (error: string, result: any) => {
            if (error) {
              console.error('Error saving Steps to HealthKit:', error);
              resolve(false);
            } else {
              console.log('Steps saved to HealthKit successfully:', result);
              resolve(true);
            }
          });
          break;
        case 'Weight':
          AppleHealthKit.saveWeight(sampleData, (error: string, result: any) => {
            if (error) {
              console.error('Error saving Weight to HealthKit:', error);
              resolve(false);
            } else {
              console.log('Weight saved to HealthKit successfully:', result);
              resolve(true);
            }
          });
          break;
        default:
          console.warn(`HealthKit saveQuantitySample: Type '${type}' not yet implemented. Available types: HeartRate, DistanceWalkingRunning, Steps, Weight`);
          resolve(false);
      }
    });
  }

  async getHealthData(userId?: string): Promise<any> {
    if (!this.initialized) {
      return null;
    }

    // Check if user has HealthKit enabled (requires userId)
    if (userId) {
      const settings = await this.getHealthKitSettings(userId);
      if (!settings.enabled) {
        return null;
      }
    }

    return new Promise((resolve) => {
      // Get latest weight
      AppleHealthKit.getLatestWeight({}, (error: string, weight: any) => {
        if (error) {
          console.error('Error getting weight from HealthKit:', error);
          resolve(null);
        } else {
          resolve({
            weight: weight?.value,
            weightUnit: weight?.unit,
            lastUpdated: weight?.startDate,
          });
        }
      });
    });
  }

  private estimateCalories(workout: WorkoutData): number {
    // Simple calorie estimation based on duration and exercise count
    const baseCaloriesPerMinute = 5; // Conservative estimate for strength training
    const exerciseMultiplier = Math.min(workout.exercises.length * 0.1, 1.5);
    return Math.round(workout.duration * baseCaloriesPerMinute * exerciseMultiplier);
  }
}

export const healthKitService = new HealthKitServiceImpl();
