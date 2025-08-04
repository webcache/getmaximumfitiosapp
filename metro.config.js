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

// Note: Removed problematic blockList configuration that was causing build issues
// The expo-dev-menu assets blocking can be added back later if needed

module.exports = config;
