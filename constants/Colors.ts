/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#bf1927';
const tintColorDark = '#fff';

// Default theme color - can be overridden by user preferences
export let defaultThemeColor = '#8c030e';

export const setDefaultThemeColor = (color: string) => {
  defaultThemeColor = color;
};

export const getColors = (customThemeColor?: string) => {
  const themeColor = customThemeColor || defaultThemeColor;
  
  return {
    light: {
      text: '#11181C',
      background: '#fff',
      tint: tintColorLight,
      icon: '#202020',
      tabIconDefault: themeColor,
      tabIconSelected: tintColorLight,
      theme: themeColor,
    },
    dark: {
      text: '#ECEDEE',
      background: '#151718',
      tint: tintColorDark,
      icon: '#9BA1A6',
      tabIconDefault: '#9BA1A6',
      tabIconSelected: tintColorDark,
      theme: themeColor,
    },
  };
};

// Backward compatibility - use default colors
export const Colors = getColors();
