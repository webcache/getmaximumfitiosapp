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

// Exclude expo-dev-menu assets from production builds
if (!global.__DEV__) {
  const originalBlockList = config.resolver.blockList || [];
  config.resolver.blockList = [
    ...originalBlockList,
    // Block expo-dev-menu assets in production
    /node_modules\/expo-dev-menu\/assets\/.*\.otf$/,
    /node_modules\/expo-dev-menu\/assets\/dev-menu-packager-host$/,
    /node_modules\/expo-dev-menu\/assets\//,
  ];
}

module.exports = config;
