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
brew install node

echo "===== Installing yarn ====="
brew install yarn

# Add Node.js to PATH (handle keg-only installation)
if [ -d "/usr/local/opt/node@20/bin" ]; then
    export PATH="/usr/local/opt/node@20/bin:$PATH"
elif [ -d "/usr/local/opt/node/bin" ]; then
    export PATH="/usr/local/opt/node/bin:$PATH"
fi
echo "Node version: $(node -v)"
echo "Yarn version: $(yarn -v)"

# Create .env.local for Metro bundler (Expo/React Native Firebase web config)
echo "===== Creating .env.local for Firebase config ====="
cat > .env.local <<EOF
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDJwH5ffYQX4XBgbY1EMJCF6ZEjttbR0OI
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=getmaximumfit.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=getmaximumfit
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=getmaximumfit.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=424072992557
EXPO_PUBLIC_FIREBASE_APP_ID=1:424072992557:ios:46b412dfe393fc119ee5a4
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://getmaximumfit-default-rtdb.firebaseio.com

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=424072992557-1iehcohe1bkudsr6qk4r85u13t9loa5o.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=424072992557-1iehcohe1bkudsr6qk4r85u13t9loa5o.apps.googleusercontent.com
EOF
echo "✅ .env.local created for Metro bundler with Firebase and OAuth config"

# Install dependencies
echo "===== Running yarn install ====="
yarn install

echo "===== Running pod install ====="
cd ios
pod install

echo "✅ Setup complete"
