#!/bin/bash

# Test script to manually verify HealthKit AdHoc profile generation
# Run this locally to test before triggering the full GitHub workflow

echo "🧪 Testing HealthKit AdHoc Profile Generation"
echo "============================================"

echo "📋 Step 1: Check current app.json HealthKit configuration"
if grep -q "com.apple.developer.healthkit" app.json; then
    echo "✅ HealthKit entitlements found in app.json"
    grep -A5 -B5 "healthkit" app.json
else
    echo "❌ HealthKit entitlements NOT found in app.json"
    exit 1
fi

echo ""
echo "📋 Step 2: Check current EAS project info"
eas project:info

echo ""
echo "📋 Step 3: List current credentials"
echo "Current iOS credentials:"
eas credentials --platform ios --list

echo ""
echo "🧹 Step 4: Clear ALL credentials (this will force regeneration)"
echo "Clearing provisioning profiles..."
eas credentials --platform ios --clear-provisioning-profile --non-interactive || echo "No profiles to clear"

echo "Clearing distribution certificates..."
eas credentials --platform ios --clear-dist-cert --non-interactive || echo "No certs to clear"

echo "Clearing push certificates..."
eas credentials --platform ios --clear-push-cert --non-interactive || echo "No push certs to clear"

echo ""
echo "🔧 Step 5: Pre-configure credentials for preview profile"
echo "This will generate a new AdHoc profile with HealthKit entitlements from app.json"
eas credentials --platform ios --profile preview --configure-profile --non-interactive

echo ""
echo "📋 Step 6: Verify new credentials include HealthKit"
echo "New iOS credentials:"
eas credentials --platform ios --list

echo ""
echo "🚀 Step 7: Test build (optional - comment out if you don't want to build yet)"
echo "Uncomment the next line to test the actual build:"
echo "# eas build --platform ios --profile preview --non-interactive --wait"

echo ""
echo "✅ Test completed! If no errors above, the GitHub workflow should work."
echo "💡 To run the actual build, uncomment the last command and re-run this script."
