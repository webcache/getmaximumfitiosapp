#!/bin/sh

# ci_post_clone.sh
# Xcode Cloud post-clone script to ensure proper dependency installation

set -e  # Exit on any error

echo "Starting Xcode Cloud post-clone setup..."

# Navigate to the project root
cd $CI_WORKSPACE

# Install dependencies (npm is available in Xcode Cloud, yarn is not)
echo "Installing dependencies..."
if [ -f "yarn.lock" ]; then
    echo "yarn.lock found, but using npm for Xcode Cloud compatibility..."
    npm install
elif [ -f "package-lock.json" ]; then
    echo "package-lock.json found, using npm ci..."
    npm ci
else
    echo "Using npm install..."
    npm install
fi

# Clean and install CocoaPods
echo "Installing CocoaPods dependencies..."
cd ios
pod deintegrate || true  # Allow this to fail if no pods are integrated
pod install

# Clear any build cache
echo "Clearing build caches..."
rm -rf build/
rm -rf DerivedData/

echo "Post-clone setup completed successfully!"
