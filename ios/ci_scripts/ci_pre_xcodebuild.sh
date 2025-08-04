#!/bin/sh

# ci_pre_xcodebuild.sh
# This script runs before the Xcode build in Xcode Cloud

set -e

echo "🔧 Starting Xcode Cloud pre-build setup..."

# Ensure we're in the workspace directory
cd "$CI_WORKSPACE"

# Set up PATH for common locations where Node.js might be installed
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/v20.19.2/bin:$PATH"

# Try to find and use Node.js
echo "📦 Looking for Node.js..."
which node || echo "Node.js not found in PATH"
which npm || echo "npm not found in PATH"

# If Node.js is not available, try alternative approaches
if ! command -v node >/dev/null 2>&1; then
    echo "📦 Node.js not found, trying alternative setup..."
    
    # Try using nvm if available
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        echo "📦 Loading nvm..."
        . "$HOME/.nvm/nvm.sh"
        nvm use 20 || nvm use node || echo "nvm setup failed"
    fi
    
    # Check again after nvm setup
    if ! command -v node >/dev/null 2>&1; then
        echo "❌ Node.js still not available. Skipping npm install."
        echo "📦 Proceeding with CocoaPods setup only..."
    else
        echo "✅ Node.js found after nvm setup: $(node --version)"
    fi
else
    echo "✅ Node.js found: $(node --version)"
fi

# Install npm dependencies only if Node.js is available
if command -v npm >/dev/null 2>&1; then
    echo "📦 npm version: $(npm --version)"
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing npm dependencies..."
        npm install
    else
        echo "✅ Node modules already installed"
    fi
else
    echo "⚠️ npm not available, skipping npm install"
fi

# Run privacy manifest setup (this doesn't require Node.js)
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
