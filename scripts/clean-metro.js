#!/usr/bin/env node

/**
 * This script cleans the Metro bundler cache and watchman cache
 * to resolve bundling issues like ENOENT errors or caching issues.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = process.cwd();
console.log('🧹 Running Metro and Watchman cleanup...');

try {
  // Clear Metro bundler cache
  console.log('Clearing Metro cache...');
  const cacheDir = path.join(root, 'node_modules', '.cache');
  
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('✅ Metro cache cleared');
  } else {
    console.log('⚠️ No Metro cache directory found');
  }

  // Clear Watchman watches
  console.log('Clearing Watchman watches...');
  try {
    execSync('watchman watch-del-all', { stdio: 'inherit' });
    console.log('✅ Watchman watches cleared');
  } catch (err) {
    console.log('⚠️ Watchman command failed, but continuing...');
  }

  // Clear Expo's metro and babel cache
  console.log('Clearing Expo caches...');
  try {
    execSync('rm -rf $TMPDIR/metro-*', { stdio: 'inherit' });
    execSync('rm -rf $TMPDIR/react-native-packager-cache-*', { stdio: 'inherit' });
    execSync('rm -rf $TMPDIR/react-*', { stdio: 'inherit' });
    execSync('rm -rf $TMPDIR/haste-map-*', { stdio: 'inherit' });
    console.log('✅ Expo caches cleared');
  } catch (err) {
    console.log('⚠️ Some Expo cache cleaning failed, but continuing...');
  }
  
  console.log('✅ All caches cleared successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Stop the current Metro bundler (if running)');
  console.log('2. Run "expo start --clear" to start with a fresh cache');
  console.log('3. If issues persist, try "npm install" to refresh dependencies');

} catch (error) {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
}
