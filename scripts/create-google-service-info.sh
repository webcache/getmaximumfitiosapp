#!/bin/bash

# Create GoogleService-Info.plist from environment variables for EAS Build
echo "Creating GoogleService-Info.plist from environment variables..."

if [ -z "$GOOGLE_SERVICE_INFO_PLIST" ]; then
  echo "Error: GOOGLE_SERVICE_INFO_PLIST environment variable is not set"
  exit 1
fi

# Decode base64 and write to file
echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > GoogleService-Info.plist

if [ -f "GoogleService-Info.plist" ]; then
  echo "GoogleService-Info.plist created successfully"
  ls -la GoogleService-Info.plist
else
  echo "Error: Failed to create GoogleService-Info.plist"
  exit 1
fi
