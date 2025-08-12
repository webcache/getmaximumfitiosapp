#!/bin/bash

# Test script for Match authentication on Mac Mini
# Usage: ./test-match-auth.sh "YOUR_BASE64_AUTHORIZATION_TOKEN"

if [ -z "$1" ]; then
    echo "Usage: $0 <base64_authorization_token>"
    echo "Get the MATCH_GIT_BASIC_AUTHORIZATION value from your GitHub secrets"
    exit 1
fi

MATCH_GIT_BASIC_AUTHORIZATION="$1"
MATCH_PASSWORD="Room12\$\$!!"
MATCH_GIT_URL="https://github.com/webcache/githubactionsstore.git"

echo "🔍 Testing Match password and git access..."

# Configure git authentication using the authorization token
echo "Setting up git authentication..."
AUTH_STRING=$(echo "$MATCH_GIT_BASIC_AUTHORIZATION" | base64 --decode)
USERNAME=$(echo "$AUTH_STRING" | cut -d: -f1)
TOKEN=$(echo "$AUTH_STRING" | cut -d: -f2)

echo "Username: $USERNAME"
echo "Token length: ${#TOKEN}"

# Configure git credentials for this session
git config --global credential.helper store
echo "https://$USERNAME:$TOKEN@github.com" > ~/.git-credentials

# Test git access first
echo "Testing git repository access..."
if git ls-remote "$MATCH_GIT_URL" > /dev/null; then
    echo "✅ Git access successful"
    
    # Test Match password
    echo "Testing Match password..."
    cd ios
    if MATCH_PASSWORD="$MATCH_PASSWORD" bundle exec fastlane match appstore --readonly; then
        echo "✅ Match configuration test passed!"
    else
        echo "❌ Match test failed"
    fi
    cd ..
else
    echo "❌ Git access failed"
fi

# Clean up credentials
rm -f ~/.git-credentials
git config --global --unset credential.helper

echo "✅ Test completed!"
