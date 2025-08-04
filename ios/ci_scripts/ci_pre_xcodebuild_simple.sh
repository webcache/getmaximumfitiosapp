#!/bin/sh

# ci_pre_xcodebuild_simple.sh
# Ultra-simple version that only does the absolute minimum

echo "🔧 Starting simple Xcode Cloud pre-build setup..."

# Go to workspace
cd "$CI_WORKSPACE"

# Only do CocoaPods setup - the bare minimum needed
echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install

echo "✅ Simple Xcode Cloud pre-build setup completed"
