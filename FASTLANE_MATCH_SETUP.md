# Fastlane Match Setup Guide

## Overview
Fastlane Match is a tool that syncs your iOS certificates and provisioning profiles across your team using a private git repository. This ensures everyone has the same certificates and eliminates "code signing hell."

## Step-by-Step Setup

### 1. Create a Private Git Repository for Certificates

First, create a **private** git repository to store your certificates. This can be on GitHub, GitLab, or any git provider.

**GitHub Example:**
1. Go to GitHub and create a new **private** repository
2. Name it something like: `ios-certificates-getmaximumfit`
3. Don't initialize with README (keep it empty)
4. Copy the repository URL: `https://github.com/yourusername/ios-certificates-getmaximumfit.git`

### 2. Initialize Match

Run this command in your `ios` directory:

```bash
cd ios
fastlane match init
```

When prompted:
- **Git URL**: Enter your private repository URL from step 1
- This creates a `Matchfile` in `ios/fastlane/`

### 3. Generate Certificates and Provisioning Profiles

Run these commands to generate your certificates:

```bash
# For App Store distribution
fastlane match appstore

# You'll be prompted for:
# - Password for the certificates repository (create a strong password)
# - Apple ID (your developer account email)
# - Apple ID password or app-specific password
```

This will:
- Generate distribution certificates
- Create App Store provisioning profiles
- Store them securely in your private git repository
- Install them locally

### 4. Update Your Appfile

Edit `ios/fastlane/Appfile` with your actual details:

```ruby
app_identifier("com.getmaximumfreedomandfitness.getmaximumfitiosapp")
apple_id("your-apple-developer-email@example.com")  # Your Apple ID
itc_team_id("123456789")  # App Store Connect Team ID
team_id("ABCDEF1234")     # Apple Developer Team ID
```

**To find your Team IDs:**
- **App Store Connect Team ID**: Login to App Store Connect → Users and Access → Keys (shows Team ID)
- **Developer Team ID**: Login to Apple Developer → Membership (shows Team ID)

### 5. Set Up GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and Variables → Actions):

#### Required Secrets:
```
MATCH_PASSWORD=your_certificates_repository_password
MATCH_GIT_URL=https://github.com/yourusername/ios-certificates-getmaximumfit.git
APPLE_TEAM_ID=ABCDEF1234
```

#### For Private Repository Access:
If using GitHub for certificates storage, create a Personal Access Token:

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Add this secret:
```
MATCH_GIT_BASIC_AUTHORIZATION=base64_encoded_credentials
```

To generate the base64 encoded credentials:
```bash
echo -n "yourusername:your_personal_access_token" | base64
```

### 6. Test the Setup

Test that everything works locally:

```bash
cd ios
fastlane match appstore --readonly
```

This should download and install your certificates without creating new ones.

### 7. Verify Xcode Configuration

1. Open your project in Xcode
2. Select your target → Signing & Capabilities
3. Ensure:
   - **Team**: Select your Apple Developer team
   - **Provisioning Profile**: Should show "match AppStore com.getmaximumfreedomandfitness.getmaximumfitiosapp"
   - **Signing Certificate**: Should show your distribution certificate

## Troubleshooting

### Common Issues:

**1. "No matching provisioning profiles found"**
```bash
fastlane match appstore --force
```

**2. "Certificate already exists"**
```bash
fastlane match appstore --readonly
```

**3. "Git authentication failed"**
- Verify MATCH_GIT_URL is correct
- Check MATCH_GIT_BASIC_AUTHORIZATION is properly base64 encoded
- Ensure the repository exists and is accessible

**4. "Team ID not found"**
- Verify APPLE_TEAM_ID matches your Apple Developer account
- Check both Developer and App Store Connect team IDs

### Useful Commands:

```bash
# Force regenerate certificates (use carefully)
fastlane match appstore --force

# View certificate info
fastlane match appstore --readonly --verbose

# Nuke all certificates (nuclear option)
fastlane match nuke distribution
fastlane match nuke development
```

## Security Notes

1. **Never commit certificates to your main repository**
2. **Use a strong password for MATCH_PASSWORD**
3. **Keep your certificates repository private**
4. **Use app-specific passwords for Apple ID if 2FA is enabled**
5. **Regularly rotate your Personal Access Tokens**

## Next Steps

After setup is complete:
1. Commit and push your Matchfile
2. Test the GitHub Actions workflow
3. Your team can now run `fastlane match appstore --readonly` to get the same certificates

## Files Created/Modified

- `ios/fastlane/Matchfile` - Match configuration
- `ios/fastlane/Appfile` - Updated with your team details
- Private certificates repository - Contains your certificates and profiles
