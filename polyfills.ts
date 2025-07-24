// Polyfills for React Native environment

// Add structured clone polyfill if it doesn't exist
if (typeof global.structuredClone === 'undefined') {
  // Simple fallback implementation using JSON (works for basic serializable objects)
  global.structuredClone = (obj: any) => {
    if (obj === null || typeof obj !== 'object') return obj;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.warn('structuredClone fallback failed:', error);
      return obj;
    }
  };
}

// Silence specific warnings that can occur in development
if (__DEV__) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' && 
      (message.includes('Setting a timer for a long period') ||
       message.includes('AsyncStorage has been extracted') ||
       message.includes('onAnimatedValueUpdate') ||
       message.includes('Sending `onAnimatedValueUpdate` with no listeners registered') ||
       message.includes('firebase/auth:Auth') ||
       message.includes('[firebase/auth]'))
    ) {
      return;
    }
    originalWarn(...args);
  };
}
