module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for React Native reanimated
      'react-native-reanimated/plugin',
      // Module resolver disabled to avoid XcodeCloud build issues
      // Path aliases (@/) have been replaced with relative imports
    ],
  };
};
