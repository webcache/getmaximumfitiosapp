#!/bin/sh

# ci_pre_xcodebuild.sh
# Simple version for Xcode Cloud

set -e

echo "🔧 Xcode Cloud pre-build setup..."

# Navigate to project root (we start in ios/ci_scripts)
cd "$(dirname "$0")/../.."

# Check Node.js environment
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Create Firebase config if available
if [ -n "$GOOGLE_SERVICE_INFO_PLIST" ]; then
    echo "📄 Creating GoogleService-Info.plist..."
    echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > GoogleService-Info.plist
    cp GoogleService-Info.plist ios/getmaximumfitiosapp/
    echo "✅ GoogleService-Info.plist created"
fi

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm ci

# Install CocoaPods dependencies
echo "📦 Installing CocoaPods..."
cd ios
pod install

echo "✅ Setup complete"
