#!/bin/sh

# ci_pre_xcodebuild.sh
# Optimized version for Xcode Cloud with timeout protections

set -e  # Exit on any error

# Track script start time
SCRIPT_START=$(date +%s)
MAX_EXECUTION_TIME=900  # 15 minutes in seconds

# Function to check if we're approaching timeout
check_timeout() {
    local current_time=$(date +%s)
    local elapsed=$((current_time - SCRIPT_START))
    local remaining=$((MAX_EXECUTION_TIME - elapsed))
    
    echo "⏱️  Script runtime: ${elapsed}s, remaining: ${remaining}s"
    
    if [ $remaining -lt 60 ]; then
        echo "⚠️  Approaching timeout limit, aborting gracefully"
        exit 1
    fi
}

echo "🔧 Starting Xcode Cloud pre-build setup..."

# Set timeout for network operations
export HOMEBREW_NO_AUTO_UPDATE=1
export COCOAPODS_DISABLE_STATS=true

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

check_timeout

# Create GoogleService-Info.plist if environment variable is available
if [ -n "$GOOGLE_SERVICE_INFO_PLIST" ]; then
    echo "📄 Creating GoogleService-Info.plist from environment variable..."
    echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > GoogleService-Info.plist
    
    # Copy to iOS app directory
    cp GoogleService-Info.plist ios/getmaximumfitiosapp/
    echo "✅ GoogleService-Info.plist created and copied"
else
    echo "⚠️  GOOGLE_SERVICE_INFO_PLIST environment variable not found"
    echo "📄 Creating placeholder GoogleService-Info.plist..."
    
    # Create a minimal placeholder GoogleService-Info.plist
    cat > ios/getmaximumfitiosapp/GoogleService-Info.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>API_KEY</key>
	<string>placeholder-api-key</string>
	<key>GCM_SENDER_ID</key>
	<string>123456789</string>
	<key>PLIST_VERSION</key>
	<string>1</string>
	<key>BUNDLE_ID</key>
	<string>com.getmaximumfreedomandfitness.getmaximumfitiosapp</string>
	<key>PROJECT_ID</key>
	<string>placeholder-project</string>
	<key>STORAGE_BUCKET</key>
	<string>placeholder-project.appspot.com</string>
	<key>IS_ADS_ENABLED</key>
	<false/>
	<key>IS_ANALYTICS_ENABLED</key>
	<false/>
	<key>IS_APPINVITE_ENABLED</key>
	<true/>
	<key>IS_GCM_ENABLED</key>
	<true/>
	<key>IS_SIGNIN_ENABLED</key>
	<true/>
	<key>GOOGLE_APP_ID</key>
	<string>1:123456789:ios:placeholder</string>
</dict>
</plist>
EOF
    echo "✅ Placeholder GoogleService-Info.plist created"
fi

# Go to ios directory
echo "📁 Changing to ios directory..."
cd ios

check_timeout

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

check_timeout

# Install Node.js for Xcode Cloud with timeout protection
echo "📥 Installing Node.js..."
if ! command -v node &> /dev/null; then
    echo "Node.js not found, installing..."
    
    check_timeout
    
    # Install Node.js using the method recommended for Xcode Cloud with timeout
    timeout 300 curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash || {
        echo "❌ NVM installation timed out or failed"
        exit 1
    }
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    check_timeout
    
    # Install and use Node.js 20 with timeout
    timeout 300 nvm install 20 || {
        echo "❌ Node.js installation timed out"
        exit 1
    }
    nvm use 20
    
    echo "✅ Node.js installed: $(node --version)"
else
    echo "✅ Node.js already available: $(node --version)"
fi

check_timeout

# Set up Node.js environment for Xcode Cloud
export NODE_BINARY=$(command -v node)
export NODE_OPTIONS="--max-old-space-size=4096"

# Create .env.local file for Metro bundler to pick up Firebase config
echo "📄 Creating .env.local file for Metro bundler..."
cat > "$WORKSPACE_DIR/.env.local" << 'EOF'
# Firebase environment variables for Xcode Cloud build
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDJwH5ffYQX4XBgbY1EMJCF6ZEjttbR0OI
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=getmaximumfit.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=getmaximumfit
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=getmaximumfit.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=424072992557
EXPO_PUBLIC_FIREBASE_APP_ID=1:424072992557:ios:46b412dfe393fc119ee5a4
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://getmaximumfit-default-rtdb.firebaseio.com
EOF
echo "✅ .env.local file created for Metro bundler"

# Verify npm is available
echo "📦 npm version: $(npm --version)"

# Install npm dependencies (required for Podfile) with timeout protection
echo "📦 Installing npm dependencies..."
cd "$WORKSPACE_DIR"

check_timeout

# Set npm timeout configurations
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set fetch-timeout 300000

if timeout 600 npm install --include=dev --prefer-offline --no-audit --no-fund; then
    echo "✅ npm dependencies (including devDependencies) installed successfully"
else
    echo "❌ npm install failed or timed out!"
    exit 1
fi

check_timeout

# Go back to ios directory
cd ios

# Check CocoaPods version
echo "🔍 CocoaPods version:"
pod --version

# Clean and reinstall pods to ensure consistency
echo "🧹 Cleaning previous pod installation..."
rm -rf Pods
rm -f Podfile.lock

# Clean Xcode derived data
echo "🧹 Cleaning Xcode derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf /Volumes/workspace/DerivedData

check_timeout

# Configure pod install for better performance and timeout handling
echo "🔄 Installing fresh pods with optimizations..."

# Set git timeout for pod dependencies
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 300
git config --global core.preloadindex true

check_timeout

# Install pods with timeout protection and optimizations
if timeout 600 pod install --repo-update --verbose --clean-install; then
    echo "✅ Pod installation completed successfully"
    
    # Verify key files were created
    echo "🔍 Verifying pod installation:"
    ls -la Pods/ | head -10
    
    if [ -f "Pods/Target Support Files/Pods-getmaximumfitiosapp/Pods-getmaximumfitiosapp.release.xcconfig" ]; then
        echo "✅ Required xcconfig file found"
    else
        echo "❌ Missing xcconfig file!"
        echo "📁 Contents of Target Support Files:"
        ls -la "Pods/Target Support Files/" || echo "No Target Support Files directory found"
        exit 1
    fi
else
    echo "❌ Pod installation failed or timed out!"
    echo "🔍 Checking pod installation state..."
    ls -la Pods/ 2>/dev/null || echo "No Pods directory found"
    exit 1
fi

check_timeout

echo "✅ Xcode Cloud pre-build setup completed successfully"
