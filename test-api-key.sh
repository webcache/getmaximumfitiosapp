#!/bin/bash

# Test script to verify App Store Connect API authentication
# This will help us understand what environment variables we need

echo "🔍 Testing App Store Connect API authentication..."
echo "Key ID: 3J7RG9VT72"
echo "Team ID: 4H5UK5L4A8"

# Check if we can access the remote key file
if [ -f "//Cash's Mac mini._smb._tcp.local/Macintosh HD/Users/cash/.fastlane/keys/AuthKey_3J7RG9VT72.p8" ]; then
    echo "✅ Remote API key file is accessible"
else
    echo "❌ Remote API key file is not accessible from this machine"
    echo "We'll need to add the API key content to GitHub secrets"
fi

# Show what environment variables would be needed for Spaceship (Fastlane's Apple API client)
echo ""
echo "🔧 Required environment variables for App Store Connect API:"
echo "SPACESHIP_CONNECT_API_KEY_ID=3J7RG9VT72"
echo "SPACESHIP_CONNECT_API_ISSUER_ID=<YOUR_ISSUER_ID>"
echo "SPACESHIP_CONNECT_API_KEY_CONTENT=<BASE64_ENCODED_KEY_CONTENT>"

echo ""
echo "📋 To get the key content for GitHub secrets:"
echo "1. Copy the .p8 file from the Mac mini"
echo "2. Encode it as base64: cat AuthKey_3J7RG9VT72.p8 | base64"
echo "3. Add to GitHub secrets as APP_STORE_CONNECT_API_KEY_CONTENT"
