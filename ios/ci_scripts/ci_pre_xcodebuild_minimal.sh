#!/bin/sh

# ci_pre_xcodebuild_minimal.sh
# Minimal fallback script that focuses only on CocoaPods setup
# Use this if the main pre-build script continues to fail

set -e

echo "🔧 Starting minimal Xcode Cloud pre-build setup..."

# Ensure we're in the workspace directory
cd "$CI_WORKSPACE"

# Run privacy manifest setup (doesn't require Node.js)
echo "🔒 Setting up privacy manifests..."
chmod +x ios/scripts/setup-privacy-manifests.sh
./ios/scripts/setup-privacy-manifests.sh

# Clean and reinstall pods
echo "🧹 Cleaning CocoaPods cache..."
cd ios
rm -rf Pods
rm -f Podfile.lock

# Install pods
echo "📦 Installing CocoaPods dependencies..."
pod install

echo "✅ Minimal Xcode Cloud pre-build setup completed"
