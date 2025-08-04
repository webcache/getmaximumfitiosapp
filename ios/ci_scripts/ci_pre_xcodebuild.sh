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

# Install Node.js for Xcode Cloud
echo "📥 Installing Node.js..."
if ! command -v node &> /dev/null; then
    echo "Node.js not found, installing..."
    
    # Install Node.js using the method recommended for Xcode Cloud
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Install and use Node.js 20
    nvm install 20
    nvm use 20
    
    echo "✅ Node.js installed: $(node --version)"
else
    echo "✅ Node.js already available: $(node --version)"
fi

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

# Install npm dependencies (required for Podfile)
echo "📦 Installing npm dependencies..."
cd "$WORKSPACE_DIR"
if npm install --include=dev; then
    echo "✅ npm dependencies (including devDependencies) installed successfully"
else
    echo "❌ npm install failed!"
    exit 1
fi

# Go back to ios directory
cd ios

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
