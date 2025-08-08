#!/bin/zsh

# ci_post_xcodebuild.sh
# Post-build script for Xcode Cloud

set -e

echo "📦 Xcode Cloud post-build actions..."

# Archive build information
echo "Build completed for scheme: $CI_XCODE_SCHEME"
echo "Build number: $CI_BUILD_NUMBER"
echo "Branch: $CI_BRANCH"
echo "Commit: $CI_COMMIT"

# Optional: Upload symbols, send notifications, etc.
echo "✅ Post-build actions completed"
