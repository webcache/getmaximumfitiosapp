#!/bin/sh

# ci_pre_xcodebuild.sh
# Ultra-simple version that only does the absolute minimum

echo "🔧 Starting Xcode Cloud pre-build setup..."

# Figure out the workspace directory
# In Xcode Cloud, we start in ios/ci_scripts, so we need to go up two levels
WORKSPACE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
echo "📁 Workspace directory: $WORKSPACE_DIR"

# Go to workspace directory
cd "$WORKSPACE_DIR"

# Verify we're in the right place
echo "📍 Current directory: $(pwd)"
echo "📍 Directory contents:"
ls -la | head -5

# Create GoogleService-Info.plist if environment variable is available
if [ -n "$GOOGLE_SERVICE_INFO_PLIST" ]; then
    echo "📄 Creating GoogleService-Info.plist from environment variable..."
    echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > GoogleService-Info.plist
    
    # Copy to iOS app directory
    cp GoogleService-Info.plist ios/getmaximumfitiosapp/
    echo "✅ GoogleService-Info.plist created and copied"
else
    echo "⚠️  GOOGLE_SERVICE_INFO_PLIST environment variable not found"
fi

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

# Set up Node.js environment for Xcode Cloud
export NODE_BINARY=$(command -v node)
export NODE_OPTIONS="--max-old-space-size=4096"

# Check CocoaPods version
echo "🔍 CocoaPods version:"
pod --version

# Clean and reinstall pods to ensure consistency
echo "🧹 Cleaning previous pod installation..."
rm -rf Pods
rm -f Podfile.lock

echo "🔄 Installing fresh pods..."
if pod install --repo-update --verbose; then
    echo "✅ Pod installation completed successfully"
    
    # Verify key files were created
    echo "🔍 Verifying pod installation:"
    ls -la Pods/ | head -10
    
    if [ -f "Pods/Target Support Files/Pods-getmaximumfitiosapp/Pods-getmaximumfitiosapp.release.xcconfig" ]; then
        echo "✅ Required xcconfig file found"
    else
        echo "❌ Missing xcconfig file!"
        echo "📁 Contents of Target Support Files:"
        ls -la "Pods/Target Support Files/"
        exit 1
    fi
else
    echo "❌ Pod installation failed!"
    exit 1
fi

echo "✅ Xcode Cloud pre-build setup completed successfully"
