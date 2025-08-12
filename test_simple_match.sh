#!/bin/bash

echo "🧪 Testing simple Match execution on Mac mini..."
echo "This bypasses all complex environment variables and uses Mac mini's setup"

cd /Users/adam/GitHub/getmaximumfitiosapp/ios

# Set only the absolute essentials
export MATCH_PASSWORD="${MATCH_PASSWORD}"
export MATCH_GIT_BASIC_AUTHORIZATION="${MATCH_GIT_BASIC_AUTHORIZATION}"

# Run Match with minimal configuration
echo "Running: bundle exec fastlane match appstore --force --verbose --skip_confirmation --readonly"
bundle exec fastlane match appstore --force --verbose --skip_confirmation --readonly
