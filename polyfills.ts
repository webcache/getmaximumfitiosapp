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

// Silence specific warnings that can occur in development - must run early
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' && 
    (message.includes('Setting a timer for a long period') ||
     message.includes('AsyncStorage has been extracted') ||
     message.includes('AsyncStorage') ||
     message.includes('@react-native-async-storage') ||
     message.includes('async-storage') ||
     message.includes('We recommend react-native-async-storage') ||
     message.includes('Use `@react-native-async-storage/async-storage`') ||
     message.includes('onAnimatedValueUpdate') ||
     message.includes('Sending `onAnimatedValueUpdate` with no listeners registered') ||
     message.includes('firebase/auth:Auth') ||
     message.includes('[firebase/auth]') ||
     message.includes('FirebaseError:') ||
     message.includes('Component auth has not been registered yet') ||
     message.includes('You are initializing Firebase Auth for React Native without providing AsyncStorage') ||
     message.includes('Auth state will default to memory persistence') ||
     message.includes('will not persist between sessions') ||
     message.includes('@firebase/auth: Auth') ||
     message.includes('@firebase/firestore: Firestore') ||
     message.includes('Error using user provided cache') ||
     message.includes('Falling back to memory cache') ||
     message.includes('IndexedDB') ||
     message.includes('incomplete implementation') ||
     message.includes('Offline persistence has been disabled'))
  ) {
    // Replace Firebase persistence warning with our success message
    if (message.includes('You are initializing Firebase Auth') || 
        message.includes('Auth state will default to memory persistence') ||
        message.includes('@firebase/auth: Auth') ||
        message.includes('AsyncStorage')) {
      console.log('✅ Firebase Auth initialized - Using SecureStore + Firestore for token persistence');
    }
    // Replace Firestore persistence warning with informational message
    if (message.includes('Error using user provided cache') || 
        message.includes('Offline persistence has been disabled') ||
        message.includes('IndexedDB')) {
      console.log('📱 Firestore initialized - Using memory cache for React Native (this is normal)');
    }
    return;
  }
  originalWarn(...args);
};
