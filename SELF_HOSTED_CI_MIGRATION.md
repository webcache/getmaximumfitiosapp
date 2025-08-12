# iOS CI Migration to Self-Hosted Runner

## Overview
I've created a new GitHub Actions workflow (`ios-ci-self-hosted.yml`) that migrates your current EAS-based build process to use your self-hosted macOS runner with native iOS tooling (Xcode + Fastlane).

## Key Changes Made

### 1. Added Beta Lane to Fastlane
- Added a new `beta` lane in `/ios/fastlane/Fastfile` that builds and uploads to TestFlight
- Uses App Store Connect API for authentication
- Automatically increments build numbers using timestamps

### 2. New Workflow File
- Created `/.github/workflows/ios-ci-self-hosted.yml`
- Uses your self-hosted runner: `[self-hosted, macos, xcode-15]`
- Migrated all environment variables from your original workflow

## Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### App Store Connect API (for Fastlane)
```
ASC_KEY_ID          # Your App Store Connect API Key ID
ASC_ISSUER_ID       # Your App Store Connect Issuer ID  
ASC_KEY_PATH        # Path to your .p8 key file on the runner
```

### Fastlane Match (for code signing)
```
MATCH_PASSWORD                # Password for your match certificates repository
MATCH_GIT_URL                # Git repository URL where certificates are stored
MATCH_GIT_BASIC_AUTHORIZATION # Base64 encoded "username:token" for GitHub access
```

### CI Keychain
```
CI_KEYCHAIN_PWD     # Password for the ci-keys.keychain (same as your example)
```

### All existing environment variables from your original workflow:
```
EXPO_TOKEN
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_DATABASE_URL
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_API_BASE_URL
OPENAI_API_KEY
EXPO_PUBLIC_OPENAI_API_KEY
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
```

## Runner Setup Requirements

Make sure your macOS runner has:

1. **Keychain Setup**: The `ci-keys.keychain` should be created and accessible
2. **App Store Connect API Key**: Place your `.p8` file at the path specified in `ASC_KEY_PATH`
3. **Xcode**: Version 15 installed and configured
4. **Ruby/Bundler**: For Fastlane execution
5. **Node.js**: Version 20 for JavaScript dependencies
6. **Yarn**: For package management (using `corepack enable`)

## Workflow Triggers

The workflow runs on:
- **Push to main**: Builds for production and submits to App Store
- **Pull requests**: Builds for TestFlight
- **Manual dispatch**: Choose between TestFlight or Production

## Build Process

1. **Quality Check**: TypeScript validation
2. **Expo Prebuild**: Generates iOS project from your Expo configuration
3. **Dependencies**: Installs JavaScript (yarn) and iOS (CocoaPods) dependencies  
4. **Keychain Setup**: Configures signing certificates
5. **Fastlane Build**: Uses native iOS build tools instead of EAS

## Benefits of Migration

- **Faster builds**: Native tooling is typically faster than cloud builds
- **More control**: Direct access to build environment and logs
- **Cost savings**: No EAS build credits required
- **Debugging**: Easier to troubleshoot build issues locally

## Next Steps

1. Add all required secrets to your GitHub repository
2. Set up the App Store Connect API key on your runner
3. Configure Fastlane Match for certificate management
4. Test the new workflow with a pull request
5. Once validated, you can disable or remove the old EAS workflow

## Testing Results

✅ **Git Authentication**: Confirmed working with correct credentials
- Username: `cash`
- Token: `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`
- Base64 encoded: `Y2FzaDpnaXRodWJfcGF0XzExQUI2TFc2WTBYbHZKa0x0dnhSRlFfdFlWMXlWOG41V0ZVT3dIazVQR1Zic3BGQmNkaDRJZmlHRXhvejkwYzBjNEVJRTdOWEZIc3A2ZFlTcDQK`

✅ **Match Password**: Confirmed working
- Password: `Room12$$!!`

✅ **Repository Access**: Successfully tested git clone to Match certificates repository

## Required GitHub Secrets Values

Based on testing, update these secrets in your GitHub repository:

```
MATCH_PASSWORD=Room12$$!!
MATCH_GIT_URL=https://github.com/webcache/githubactionsstore.git
MATCH_GIT_BASIC_AUTHORIZATION=Y2FzaDpnaXRodWJfcGF0XzExQUI2TFc2WTBYbHZKa0x0dnhSRlFfdFlWMXlWOG41V0ZVT3dIazVQR1Zic3BGQmNkaDRJZmlHRXhvejkwYzBjNEVJRTdOWEZIc3A2ZFlTcDQK
CI_KEYCHAIN_PWD=Room12$$!!
```

## Notes

- The workflow maintains the same deployment logic (TestFlight for PRs, App Store for main branch)
- Build numbers are automatically incremented using timestamps
- All your existing environment variables are preserved
- The keychain setup matches your existing pattern
