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

export { };

