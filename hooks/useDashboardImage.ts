import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { preferencesManager } from '../utils/preferences';

export function useDashboardImage() {
  const { user } = useAuth();
  const [dashboardImage, setDashboardImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setDashboardImage(null);
      setLoading(false);
      return;
    }

    const loadDashboardImage = async () => {
      try {
        setLoading(true);
        const preferences = await preferencesManager.loadPreferences(user.uid);
        setDashboardImage(preferences.dashboardImage || null);
      } catch (error) {
        console.error('Error loading dashboard image:', error);
        setDashboardImage(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardImage();

    // Listen for preference changes
    const handlePreferencesChange = () => {
      const prefs = preferencesManager.getPreferences();
      setDashboardImage(prefs.dashboardImage || null);
    };

    preferencesManager.addListener(handlePreferencesChange);

    return () => {
      preferencesManager.removeListener(handlePreferencesChange);
    };
  }, [user?.uid]);

  return { dashboardImage, loading };
}
