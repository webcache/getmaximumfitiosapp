#!/bin/bash

echo "🧪 Testing Match Configuration"
echo "================================"

cd ios

# Test 1: Git access
echo "1. Testing git repository access..."
MATCH_GIT_URL="https://github.com/webcache/githubactionsstore.git"
git ls-remote "$MATCH_GIT_URL" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Git access successful"
else
    echo "❌ Git access failed"
    exit 1
fi

# Test 2: Match with known password
echo ""
echo "2. Testing Match with password: MySecureMatchPassword2025!"
export MATCH_PASSWORD="MySecureMatchPassword2025!"
export MATCH_GIT_BASIC_AUTHORIZATION="d2ViY2FjaGU6Z2l0aHViX3BhdF8xMUFCNkxXNlkwYjlKOGxkVGJPTlBSX2tKZVd1bXJHaExhVjA1elQ5R29IMUxKcXFKdmlMSG8zQ014N0J0ck5ZczZDNk5FMjVPWWNicXEwS0Nt"
export CI=true
export GITHUB_ACTIONS=true

bundle exec fastlane match appstore --readonly
MATCH_RESULT=$?

if [ $MATCH_RESULT -eq 0 ]; then
    echo "✅ Match test successful!"
    echo ""
    echo "🎯 Your GitHub secret MATCH_PASSWORD should be set to:"
    echo "MySecureMatchPassword2025!"
else
    echo "❌ Match test failed"
    echo ""
    echo "Let's try to find the correct password..."
    
    # Test with empty password to see what happens
    echo "3. Testing with empty password..."
    export MATCH_PASSWORD=""
    bundle exec fastlane match appstore --readonly 2>&1 | head -20
fi

echo ""
echo "Test completed."
