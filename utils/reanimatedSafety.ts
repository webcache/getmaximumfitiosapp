/**
 * Safety utilities for React Native Reanimated to prevent crashes during app shutdown
 */

let isAppShuttingDown = false;

/**
 * Mark the app as shutting down to prevent new animations
 */
export const markAppShuttingDown = () => {
  isAppShuttingDown = true;
};

/**
 * Check if the app is shutting down
 */
export const isAppInShutdownState = () => {
  return isAppShuttingDown;
};

/**
 * Safe wrapper for Reanimated operations that might fail during shutdown
 */
export const safeReanimatedOperation = (operation: () => void, errorMessage = 'Reanimated operation failed') => {
  if (isAppShuttingDown) {
    console.log('Skipping Reanimated operation - app is shutting down');
    return;
  }
  
  try {
    operation();
  } catch (error) {
    console.warn(`${errorMessage}:`, error);
  }
};
