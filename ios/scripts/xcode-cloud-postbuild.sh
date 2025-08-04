#!/bin/bash

# Xcode Cloud Post-Build Script
# This script runs after the Xcode build to clean up and handle any post-processing

set -e

echo "🔧 Starting Xcode Cloud post-build cleanup..."

# Clean up any temporary files that might cause issues
cd "$CI_WORKSPACE"

# Remove any build artifacts that might interfere with signing
echo "🧹 Cleaning temporary build artifacts..."
find . -name "*.dSYM" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "DerivedData" -type d -exec rm -rf {} + 2>/dev/null || true

echo "✅ Xcode Cloud post-build cleanup completed"
