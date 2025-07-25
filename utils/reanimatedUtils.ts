/**
 * Utilities for handling React Native Reanimated runtime issues
 */

let isReanimatedAvailable = true;

/**
 * Checks if Reanimated is available and functional
 */
export function checkReanimatedAvailability(): boolean {
  try {
    // Try to access a basic Reanimated function
    const { runOnJS } = require('react-native-reanimated');
    return typeof runOnJS === 'function';
  } catch (error) {
    console.warn('Reanimated not available:', error);
    isReanimatedAvailable = false;
    return false;
  }
}

/**
 * Safe wrapper for Reanimated operations
 */
export function safeReanimatedOperation<T>(operation: () => T, fallback?: T): T | undefined {
  if (!isReanimatedAvailable) {
    return fallback;
  }
  
  try {
    return operation();
  } catch (error) {
    console.warn('Reanimated operation failed:', error);
    isReanimatedAvailable = false;
    return fallback;
  }
}

/**
 * Global error handler for Reanimated crashes
 */
export function setupReanimatedErrorHandler() {
  if (typeof global !== 'undefined') {
    try {
      // @ts-ignore - ErrorUtils is a React Native global
      const originalHandler = global.ErrorUtils?.getGlobalHandler();
      
      // @ts-ignore - ErrorUtils is a React Native global
      global.ErrorUtils?.setGlobalHandler((error: any, isFatal: boolean) => {
        // Check if this is a Reanimated-related error
        if (error?.message?.includes('reanimated') || 
            error?.message?.includes('REANodesManager') ||
            error?.stack?.includes('reanimated')) {
          
          console.warn('Reanimated error caught and handled:', error);
          
          // Mark Reanimated as unavailable
          isReanimatedAvailable = false;
          
          // Don't treat Reanimated errors as fatal during development
          if (__DEV__) {
            return;
          }
        }
        
        // For other errors, use the original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    } catch (setupError) {
      console.warn('Could not setup Reanimated error handler:', setupError);
    }
  }
}
