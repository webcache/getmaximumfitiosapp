/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useEffect, useState } from 'react';
import { Colors, getColors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { preferencesManager } from '../utils/preferences';
import { useColorScheme } from './useColorScheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

// New hook for dynamic theme colors based on user preferences
export function useDynamicThemeColor() {
  const { user } = useAuth();
  const [themeColor, setThemeColor] = useState<string>('#8c030e'); // Always start with a valid color
  const [isLoaded, setIsLoaded] = useState(false);

  // Function to load and set theme color
  const loadThemeColor = async () => {
    if (!user?.uid) {
      setThemeColor('#8c030e');
      setIsLoaded(true);
      return;
    }
    
    try {
      const preferences = await preferencesManager.loadPreferences(user.uid);
      // Ensure we always have a valid color
      const loadedColor = preferences.themeColor || '#8c030e';
      setThemeColor(loadedColor);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading theme color:', error);
      setThemeColor('#8c030e');
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      preferencesManager.setUserId(user.uid);
      loadThemeColor();
    } else {
      setThemeColor('#8c030e');
      setIsLoaded(true);
    }
    
    // Listen for preference changes
    const handlePreferencesChange = () => {
      const prefs = preferencesManager.getPreferences();
      const newColor = prefs.themeColor || '#8c030e';
      setThemeColor(newColor);
    };
    
    preferencesManager.addListener(handlePreferencesChange);
    
    return () => {
      preferencesManager.removeListener(handlePreferencesChange);
    };
  }, [user?.uid, loadThemeColor]);

  // Get the full color scheme with the current theme color
  const colors = getColors(themeColor);

  return {
    themeColor,
    colors,
    isLoaded,
    // Convenience getters for common use cases
    primary: themeColor,
    tabIconDefault: colors.light.tabIconDefault,
    tabIconSelected: colors.light.tabIconSelected,
  };
}
