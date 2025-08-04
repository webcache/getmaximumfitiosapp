#!/bin/sh

# ci_pre_xcodebuild.sh
# Ultra-simple version that only does the absolute minimum

echo "🔧 Starting Xcode Cloud pre-build setup..."

# Go to workspace directory
echo "📁 Changing to workspace directory: $CI_WORKSPACE"
cd "$CI_WORKSPACE"

# Verify we're in the right place
echo "📍 Current directory: $(pwd)"
ls -la | head -5

# Go to ios directory
echo "📁 Changing to ios directory..."
cd ios

# Verify ios directory contents
echo "📍 iOS directory contents:"
ls -la | head -5

# Check if Podfile exists
if [ -f "Podfile" ]; then
    echo "✅ Podfile found"
else
    echo "❌ Podfile not found!"
    exit 1
fi

# Install CocoaPods dependencies
echo "📦 Installing CocoaPods dependencies..."
pod install

echo "✅ Xcode Cloud pre-build setup completed successfully"
