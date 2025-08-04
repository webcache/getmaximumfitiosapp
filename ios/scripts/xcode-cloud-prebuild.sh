#!/bin/bash

# Xcode Cloud Build Script
# This script runs before the Xcode build to set up dependencies and fix common issues

set -e

echo "🔧 Starting Xcode Cloud pre-build setup..."

# Ensure we're in the right directory
cd "$CI_WORKSPACE"

# Set Node.js version for Xcode Cloud
export NODE_VERSION="20.19.2"
echo "📦 Using Node.js version: $NODE_VERSION"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
else
    echo "✅ Node modules already installed"
fi

# Clean and reinstall pods to avoid target issues
echo "🧹 Cleaning CocoaPods cache..."
cd ios
rm -rf Pods
rm -f Podfile.lock

# Run privacy manifest setup
echo "🔒 Setting up privacy manifests..."
cd ..
chmod +x ios/scripts/setup-privacy-manifests.sh
./ios/scripts/setup-privacy-manifests.sh

# Install pods with verbose output for debugging
echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install --verbose

echo "✅ Xcode Cloud pre-build setup completed successfully"
