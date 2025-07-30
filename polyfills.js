// polyfills.js
// Required for Firebase v11+ with React Native

// Import crypto polyfill first
import 'react-native-get-random-values';

// Text encoding polyfills for React Native
import { install } from '@stardazed/streams-text-encoding';

// Install text encoding polyfills
if (typeof global !== 'undefined') {
  install(global);
}

// Additional polyfills for React Native environment
if (typeof global !== 'undefined') {
  // TextEncoder/TextDecoder polyfill
  if (!global.TextEncoder || !global.TextDecoder) {
    try {
      const { TextEncoder, TextDecoder } = require('@stardazed/streams-text-encoding');
      global.TextEncoder = TextEncoder;
      global.TextDecoder = TextDecoder;
    } catch (error) {
      console.warn('Failed to install TextEncoder/TextDecoder polyfills:', error);
    }
  }

  // Ensure process is available
  if (!global.process) {
    global.process = require('process');
  }

  // Ensure Buffer is available
  if (!global.Buffer) {
    global.Buffer = require('buffer').Buffer;
  }
}

console.log('✅ Polyfills loaded successfully');
