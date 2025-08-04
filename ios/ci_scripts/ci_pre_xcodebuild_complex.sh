#!/bin/sh

# ci_pre_xcodebuild.sh
# This script runs before the Xcode build in Xcode Cloud

# Remove set -e to prevent script from exiting on errors
# set -e

echo "🔧 Starting Xcode Cloud pre-build setup..."

# Ensure we're in the workspace directory
cd "$CI_WORKSPACE" || {
    echo "❌ Failed to change to CI_WORKSPACE directory"
    exit 1
}

# Set up PATH for common locations where Node.js might be installed
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/v20.19.2/bin:$PATH"

# Try to find and use Node.js
echo "📦 Looking for Node.js..."
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "📦 Node.js not found in PATH"
fi

if command -v npm >/dev/null 2>&1; then
    echo "✅ npm found: $(npm --version)"
else
    echo "📦 npm not found in PATH"
fi

# If Node.js is not available, try alternative approaches
if ! command -v node >/dev/null 2>&1; then
    echo "📦 Node.js not found, trying alternative setup..."
    
    # Try using nvm if available
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        echo "📦 Loading nvm..."
        . "$HOME/.nvm/nvm.sh" && {
            nvm use 20 2>/dev/null || nvm use node 2>/dev/null || echo "nvm setup failed"
        }
    fi
    
    # Check again after nvm setup
    if ! command -v node >/dev/null 2>&1; then
        echo "❌ Node.js still not available. Skipping npm install."
        echo "📦 Proceeding with CocoaPods setup only..."
    else
        echo "✅ Node.js found after nvm setup: $(node --version)"
    fi
fi

# Install npm dependencies only if Node.js is available
if command -v npm >/dev/null 2>&1; then
    echo "📦 npm version: $(npm --version)"
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing npm dependencies..."
        npm install || {
            echo "⚠️ npm install failed, continuing anyway..."
        }
    else
        echo "✅ Node modules already installed"
    fi
else
    echo "⚠️ npm not available, skipping npm install"
fi

# Run privacy manifest setup (this doesn't require Node.js)
echo "🔒 Setting up privacy manifests..."
if [ -f "ios/scripts/setup-privacy-manifests.sh" ]; then
    chmod +x ios/scripts/setup-privacy-manifests.sh
    ./ios/scripts/setup-privacy-manifests.sh || {
        echo "⚠️ Privacy manifest setup failed, continuing..."
    }
else
    echo "⚠️ Privacy manifest script not found, skipping..."
fi

# Clean and reinstall pods to avoid target issues
echo "🧹 Cleaning CocoaPods cache..."
cd ios || {
    echo "❌ Failed to change to ios directory"
    exit 1
}

rm -rf Pods || echo "⚠️ Failed to remove Pods directory"
rm -f Podfile.lock || echo "⚠️ Failed to remove Podfile.lock"

# Install pods with basic output (verbose can sometimes cause issues)
echo "📦 Installing CocoaPods dependencies..."
pod install || {
    echo "❌ CocoaPods installation failed"
    exit 1
}

echo "✅ Xcode Cloud pre-build setup completed successfully"
