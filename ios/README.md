# iOS App Store Deployment Configuration

This directory contains Fastlane configuration for direct App Store Connect deployment.

## Setup Instructions

### 1. Create Required GitHub Secrets

You'll need to add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

#### App Store Connect API
- `APP_STORE_CONNECT_API_KEY_ID`: Your App Store Connect API Key ID
- `APP_STORE_CONNECT_ISSUER_ID`: Your App Store Connect Issuer ID  
- `APP_STORE_CONNECT_API_KEY_CONTENT`: Base64 encoded content of your .p8 API key file

#### Code Signing (using match)
- `MATCH_PASSWORD`: Password for your certificates repository
- `MATCH_GIT_URL`: Git URL for storing certificates (private repo)
- `MATCH_GIT_BASIC_AUTHORIZATION`: Base64 encoded git credentials
- `APPLE_TEAM_ID`: Your Apple Developer Team ID

#### All your existing Firebase secrets (already configured)

### 2. Setup App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to Users and Access → Keys
3. Create a new API Key with "App Manager" role
4. Download the .p8 file
5. Encode it to base64: `base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy`
6. Add to GitHub secrets as `APP_STORE_CONNECT_API_KEY_CONTENT`

### 3. Setup Code Signing with Match

Initialize match for your certificates:

```bash
cd ios
fastlane match init
```

This will create a private git repository to store your certificates securely.

Then generate/sync certificates:

```bash
fastlane match appstore
```

### 4. Workflow Usage

#### Automatic Deployment (TestFlight)
- Push to `main` branch automatically deploys to TestFlight
- Tags starting with `v` (e.g., `v1.0.0`) also trigger deployment

#### Manual Deployment
- Go to Actions tab in GitHub
- Select "iOS App Store Deployment" workflow  
- Click "Run workflow"
- Choose:
  - **Deployment Type**: `testflight` or `appstore`
  - **Version Bump**: `patch`, `minor`, or `major`

### 5. Deployment Types

#### TestFlight Deployment
- Uploads build to TestFlight for beta testing
- Automatically available to internal testers
- You can add external testers in App Store Connect

#### App Store Deployment  
- Uploads build and submits for App Store review
- Automatically releases when approved (if auto-release is enabled)
- Monitor review status in App Store Connect

### 6. Build Artifacts

- IPA files are uploaded as GitHub artifacts
- Archives are retained for 30 days
- Download from the Actions run page if needed

### 7. Troubleshooting

#### Code Signing Issues
- Ensure certificates are up to date: `fastlane match appstore --force`
- Check provisioning profiles in Apple Developer portal
- Verify Team ID matches in secrets

#### Build Failures
- Check Xcode version compatibility
- Ensure all dependencies are properly installed
- Verify iOS deployment target matches project settings

#### Upload Issues
- Verify App Store Connect API key permissions
- Check bundle identifier matches App Store Connect
- Ensure version number is higher than current live version

### 8. Best Practices

- Test builds locally before pushing to main
- Use semantic versioning for releases
- Add release notes in App Store Connect after TestFlight upload
- Monitor build status and review feedback
- Keep certificates and provisioning profiles updated

## Workflow Features

✅ **Automated Quality Checks**: ESLint, TypeScript, and tests  
✅ **Direct Xcode Build**: No EAS dependency  
✅ **Automatic Version Management**: Smart build number increment  
✅ **Flexible Deployment**: TestFlight or App Store options  
✅ **Secure Code Signing**: Using Fastlane Match  
✅ **Build Artifacts**: IPA and archive retention  
✅ **Comprehensive Logging**: Detailed build summaries  
✅ **Environment Management**: All Firebase secrets supported
