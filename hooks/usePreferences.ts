// hooks/usePreferences.ts
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { preferencesManager, UserPreferences } from '../utils/preferences';

export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(
    preferencesManager.getPreferences()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Set user ID and load preferences
    preferencesManager.setUserId(user.uid);
    
    const loadPrefs = async () => {
      try {
        const prefs = await preferencesManager.loadPreferences(user.uid);
        setPreferences(prefs);
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrefs();

    // Listen for changes
    const handlePreferencesChange = (newPreferences: UserPreferences) => {
      setPreferences(newPreferences);
    };

    preferencesManager.addListener(handlePreferencesChange);

    return () => {
      preferencesManager.removeListener(handlePreferencesChange);
    };
  }, [user?.uid]);

  return {
    preferences,
    loading,
    units: preferences.units,
    themeColor: preferences.themeColor,
    formatWeight: (weight: number) => preferencesManager.formatWeight(weight),
    convertToPreferredUnits: (weightInLbs: number) => preferencesManager.getWeightInPreferredUnits(weightInLbs),
    convertToStorageUnits: (weight: number) => preferencesManager.convertToStorageUnits(weight),
  };
}
