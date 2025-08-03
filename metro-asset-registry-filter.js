/**
 * Custom asset registry filter to exclude expo-dev-menu assets in production builds
 */

const defaultAssetRegistryPath = require('react-native/Libraries/Image/AssetRegistry');

// Filter function to exclude expo-dev-menu assets in production
function filterAssets(assetData) {
  if (__DEV__) {
    // In development, allow all assets
    return assetData;
  }

  // In production, filter out expo-dev-menu assets
  const filteredAssets = assetData.filter(asset => {
    const assetPath = asset.httpServerLocation || '';
    const assetName = asset.name || '';
    
    // Exclude expo-dev-menu assets
    if (assetPath.includes('expo-dev-menu') || 
        assetName.includes('dev-menu-packager-host') ||
        (assetPath.includes('expo-dev-menu') && assetName.endsWith('.otf'))) {
      console.log(`[Metro] Excluding expo-dev-menu asset: ${assetPath}/${assetName}`);
      return false;
    }
    
    return true;
  });

  return filteredAssets;
}

// Override the default asset registry
module.exports = {
  ...defaultAssetRegistryPath,
  registerAsset: function(asset) {
    if (__DEV__) {
      return defaultAssetRegistryPath.registerAsset(asset);
    }
    
    // In production, check if this is an expo-dev-menu asset
    const assetPath = asset.httpServerLocation || '';
    const assetName = asset.name || '';
    
    if (assetPath.includes('expo-dev-menu') || 
        assetName.includes('dev-menu-packager-host') ||
        (assetPath.includes('expo-dev-menu') && assetName.endsWith('.otf'))) {
      console.log(`[Metro] Skipping expo-dev-menu asset registration: ${assetPath}/${assetName}`);
      return null;
    }
    
    return defaultAssetRegistryPath.registerAsset(asset);
  }
};
