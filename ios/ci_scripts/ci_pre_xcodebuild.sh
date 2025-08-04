#!/bin/sh

# ci_pre_xcodebuild.sh
# This script runs before the Xcode build in Xcode Cloud

set -e

echo "🔧 Starting Xcode Cloud pre-build setup..."

# Ensure we're in the workspace directory
cd "$CI_WORKSPACE"

# Set Node.js version for Xcode Cloud
export NODE_VERSION="20.19.2"
echo "📦 Using Node.js version: $NODE_VERSION"

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
else
    echo "✅ Node modules already installed"
fi

# Run privacy manifest setup
echo "🔒 Setting up privacy manifests..."
chmod +x ios/scripts/setup-privacy-manifests.sh
./ios/scripts/setup-privacy-manifests.sh

# Clean and reinstall pods to avoid target issues
echo "🧹 Cleaning CocoaPods cache..."
cd ios
rm -rf Pods
rm -f Podfile.lock

# Install pods with verbose output for debugging
echo "📦 Installing CocoaPods dependencies..."
pod install --verbose

echo "✅ Xcode Cloud pre-build setup completed successfully"
