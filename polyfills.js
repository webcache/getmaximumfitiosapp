import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const setupPolyfills = async () => {
    try {
      const { polyfillGlobal } = await import(
        'react-native/Libraries/Utilities/PolyfillFunctions'
      );

      const { TextEncoderStream, TextDecoderStream } = await import(
        '@stardazed/streams-text-encoding'
      );

      if (!('structuredClone' in global)) {
        // Simple fallback for structuredClone
        const structuredClone = (obj) => {
          if (obj === null || typeof obj !== 'object') return obj;
          try {
            return JSON.parse(JSON.stringify(obj));
          } catch (error) {
            console.warn('structuredClone fallback failed:', error);
            return obj;
          }
        };
        polyfillGlobal('structuredClone', () => structuredClone);
      }

      polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
      polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
    } catch (error) {
      console.warn('Failed to setup polyfills:', error);
    }
  };

  setupPolyfills().catch(error => {
    console.warn('Polyfills setup failed:', error);
  });
}

// Silence specific warnings that can occur in development
if (__DEV__) {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' && 
      (message.includes('Setting a timer for a long period') ||
       message.includes('AsyncStorage has been extracted') ||
       message.includes('onAnimatedValueUpdate') ||
       message.includes('Sending `onAnimatedValueUpdate` with no listeners registered') ||
       message.includes('Animated') && message.includes('listener') ||
       message.includes('firebase/auth:Auth') ||
       message.includes('[firebase/auth]'))
    ) {
      return;
    }
    originalWarn(...args);
  };

  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' && 
      (message.includes('onAnimatedValueUpdate') ||
       message.includes('Sending `onAnimatedValueUpdate` with no listeners registered'))
    ) {
      return;
    }
    originalError(...args);
  };
}

export { };

