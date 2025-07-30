/**
 * Bridge stability utilities for React Native
 * Provides production-safe delays and error handling for native bridge operations
 */

/**
 * Production-safe delay multiplier
 * Physical devices need longer delays than simulator/development
 */
export const PRODUCTION_DELAY_MULTIPLIER = __DEV__ ? 1 : 2.5;

/**
 * Standard delay constants for different types of operations
 */
export const BRIDGE_DELAYS = {
  MINIMAL: 100,
  STANDARD: 200,
  SAFE: 300,
  CRITICAL: 500,
  EXTENDED: 800,
} as const;

/**
 * Creates a production-safe delay
 * @param baseDelay The base delay in milliseconds
 * @param isExtended Whether to use extended timing for critical operations
 */
export const createProductionSafeDelay = (
  baseDelay: number, 
  isExtended: boolean = false
): Promise<void> => {
  const multiplier = isExtended ? PRODUCTION_DELAY_MULTIPLIER * 1.5 : PRODUCTION_DELAY_MULTIPLIER;
  const finalDelay = Math.round(baseDelay * multiplier);
  
  return new Promise(resolve => setTimeout(resolve, finalDelay));
};

/**
 * Executes a function with production-safe error handling and retries
 * @param operation The operation to execute
 * @param operationName A descriptive name for logging
 * @param maxRetries Maximum number of retry attempts
 * @param retryDelay Delay between retries
 */
export const executeWithBridgeSafety = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 2,
  retryDelay: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retrying ${operationName} (attempt ${attempt + 1}/${maxRetries + 1})`);
        await createProductionSafeDelay(retryDelay);
      }
      
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ ${operationName} failed (attempt ${attempt + 1}):`, error);
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  
  throw lastError;
};

/**
 * Production-safe navigation wrapper
 * @param navigationFn The navigation function to execute
 * @param fallbackPath Optional fallback path if primary navigation fails
 */
export const safeNavigate = async (
  navigationFn: () => void,
  fallbackPath?: string
): Promise<void> => {
  try {
    // Add production delay before navigation
    await createProductionSafeDelay(BRIDGE_DELAYS.STANDARD);
    navigationFn();
  } catch (error) {
    console.error('Navigation failed:', error);
    
    if (fallbackPath) {
      // Extended delay for fallback attempt
      await createProductionSafeDelay(BRIDGE_DELAYS.EXTENDED);
      try {
        navigationFn();
      } catch (retryError) {
        console.error('Navigation retry failed:', retryError);
      }
    }
  }
};
