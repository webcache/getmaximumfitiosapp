import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SocialSharingPreferences {
  autoShare: boolean;
  shareAchievements: boolean;
  shareWorkouts: boolean;
  shareProgress: boolean;
  connectedPlatforms: string[]; // Array of platform IDs like ['instagram', 'facebook', etc.]
  createdAt?: any;
  updatedAt?: any;
}

export interface SocialConnection {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  description: string;
  shareApp?: string;
  supportsStories?: boolean; // New property to indicate story support
}

// Default social sharing preferences
export const defaultSocialSharingPreferences: SocialSharingPreferences = {
  autoShare: false,
  shareAchievements: true,
  shareWorkouts: false,
  shareProgress: false,
  connectedPlatforms: [],
};

// Default social connections configuration
export const defaultSocialConnections: SocialConnection[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    connected: false,
    description: 'Share workout photos and stories',
    shareApp: 'instagram',
    supportsStories: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    connected: false,
    description: 'Share achievements and stories with friends',
    shareApp: 'facebook',
    supportsStories: true,
  },
  {
    id: 'twitter',
    name: 'X',
    icon: 'twitter',
    color: '#1DA1F2',
    connected: false,
    description: 'Tweet your fitness milestones',
    shareApp: 'X',
    supportsStories: false,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    connected: false,
    description: 'Share with friends and family',
    shareApp: 'whatsapp',
    supportsStories: false,
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: 'running',
    color: '#FC4C02',
    connected: false,
    description: 'Share workouts with the fitness community',
    shareApp: undefined,
    supportsStories: false,
  }
];

/**
 * Get user's social sharing preferences from Firestore
 */
export const getSocialSharingPreferences = async (userId: string): Promise<SocialSharingPreferences> => {
  try {
    console.log('📱 Loading social sharing preferences for user:', userId);
    
    const docRef = doc(db, 'profiles', userId, 'socialSharing', 'preferences');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as SocialSharingPreferences;
      console.log('✅ Loaded social sharing preferences:', data);
      return data;
    } else {
      console.log('📝 No social sharing preferences found, using defaults');
      return defaultSocialSharingPreferences;
    }
  } catch (error) {
    console.error('❌ Error loading social sharing preferences:', error);
    // Return defaults on error to ensure app continues working
    return defaultSocialSharingPreferences;
  }
};

/**
 * Save user's social sharing preferences to Firestore
 */
export const saveSocialSharingPreferences = async (
  userId: string, 
  preferences: Omit<SocialSharingPreferences, 'createdAt' | 'updatedAt'>
): Promise<boolean> => {
  try {
    console.log('💾 Saving social sharing preferences for user:', userId, preferences);
    
    const docRef = doc(db, 'profiles', userId, 'socialSharing', 'preferences');
    
    // Check if document exists to determine if this is create or update
    const docSnap = await getDoc(docRef);
    const isNewDocument = !docSnap.exists();
    
    const dataToSave: SocialSharingPreferences = {
      ...preferences,
      updatedAt: serverTimestamp(),
      ...(isNewDocument && { createdAt: serverTimestamp() })
    };
    
    await setDoc(docRef, dataToSave, { merge: true });
    
    console.log('✅ Successfully saved social sharing preferences');
    return true;
  } catch (error) {
    console.error('❌ Error saving social sharing preferences:', error);
    return false;
  }
};

/**
 * Get social connections with user preferences applied
 */
export const getSocialConnectionsWithPreferences = (
  preferences: SocialSharingPreferences
): SocialConnection[] => {
  return defaultSocialConnections.map(connection => ({
    ...connection,
    connected: preferences.connectedPlatforms.includes(connection.id)
  }));
};

/**
 * Check if user has social sharing enabled for a specific type
 */
export const isSharingEnabledForType = (
  preferences: SocialSharingPreferences,
  type: 'achievement' | 'workout' | 'progress'
): boolean => {
  switch (type) {
    case 'achievement':
      return preferences.shareAchievements;
    case 'workout':
      return preferences.shareWorkouts;
    case 'progress':
      return preferences.shareProgress;
    default:
      return false;
  }
};

/**
 * Check if auto-sharing is enabled and the specific type is enabled
 */
export const shouldAutoShare = (
  preferences: SocialSharingPreferences,
  type: 'achievement' | 'workout' | 'progress'
): boolean => {
  return preferences.autoShare && isSharingEnabledForType(preferences, type);
};
