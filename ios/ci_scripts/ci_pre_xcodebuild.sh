#!/bin/zsh

# ci_pre_xcodebuild.sh
# Optimized for Xcode Cloud using Homebrew

set -e

echo "🔧 Xcode Cloud pre-build setup..."

# Navigate to project root (we start in ios/ci_scripts)
cd "$(dirname "$0")/../.."

echo "===== Installing CocoaPods ====="
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
export HOMEBREW_NO_AUTO_UPDATE=1
brew install cocoapods

echo "===== Installing Node.js ====="
brew install node@20

echo "===== Installing yarn ====="
brew install yarn

# Create Firebase config if available
if [ -n "$GOOGLE_SERVICE_INFO_PLIST" ]; then
    echo "📄 Creating GoogleService-Info.plist..."
    echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > GoogleService-Info.plist
    cp GoogleService-Info.plist ios/getmaximumfitiosapp/
    echo "✅ GoogleService-Info.plist created"
fi

# Install dependencies
echo "===== Running yarn install ====="
yarn install

echo "===== Running pod install ====="
cd ios
pod install

echo "✅ Setup complete"
