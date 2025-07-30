#!/bin/bash

echo "Cleaning up duplicate EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID environment variables..."
echo "When prompted, select the SECRET variables to delete (keep the SENSITIVE ones)"
echo ""

echo "Cleaning development environment..."
eas env:delete development --variable-name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

echo "Cleaning preview environment..."
eas env:delete preview --variable-name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

echo "Cleaning production environment..."
eas env:delete production --variable-name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

echo "Done! Verify with: eas env:list"
