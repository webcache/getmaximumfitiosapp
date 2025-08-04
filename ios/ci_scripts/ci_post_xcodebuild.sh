#!/bin/sh

# ci_post_xcodebuild.sh
# This script runs after the Xcode build in Xcode Cloud

set -e

echo "🔧 Starting Xcode Cloud post-build cleanup..."

# Ensure we're in the workspace directory
cd "$CI_WORKSPACE"

# Clean up any temporary files that might cause issues
echo "🧹 Cleaning temporary build artifacts..."
find . -name "*.dSYM" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "DerivedData" -type d -exec rm -rf {} + 2>/dev/null || true

# Log build completion
echo "✅ Build completed successfully"
echo "📱 App ready for TestFlight distribution"

echo "✅ Xcode Cloud post-build cleanup completed"
