const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure that tslib is properly resolved
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'tslib': require.resolve('tslib'),
  'process': require.resolve('process'),
  'buffer': require.resolve('buffer'),
};

// Add expo-router specific configuration
config.resolver.unstable_enableSymlinks = true;

// Ensure expo-constants can properly resolve the manifest
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable fast refresh for better development experience
config.transformer.unstable_allowRequireContext = true;

// Optimize for development
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Better source maps for debugging
config.transformer.minifierConfig = {
  mangle: false,
  keep_fnames: true,
};

// Enable more efficient watching for development
config.watchFolders = [__dirname];

// Note: Removed problematic blockList configuration that was causing build issues
// The expo-dev-menu assets blocking can be added back later if needed

module.exports = config;
