# iOS Signing Credentials

This folder contains the manual signing credentials for the iOS app.

## Structure:
```
credentials/
├── certificates/
│   ├── distribution.p12          # Apple Distribution certificate (exported from Keychain)
│   └── distribution_password.txt # Password for the .p12 file
├── profiles/
│   └── AppStore_GetMaximumFit.mobileprovision  # App Store provisioning profile
└── README.md
```

## How to obtain these files:

### 1. Apple Distribution Certificate:
1. Go to https://developer.apple.com/account/resources/certificates/list
2. Download your "Apple Distribution" certificate (.cer file)
3. Double-click to install in Keychain Access
4. In Keychain Access, find the certificate under "My Certificates"
5. Right-click → Export → Choose "Personal Information Exchange (.p12)"
6. Set a password and save as `distribution.p12`
7. Save the password in `distribution_password.txt`

### 2. App Store Provisioning Profile:
1. Go to https://developer.apple.com/account/resources/profiles/list
2. Find your App Store profile for "GetMaximumFit"
3. Make sure it includes HealthKit and Sign in with Apple capabilities
4. Download the .mobileprovision file
5. Rename to `AppStore_GetMaximumFit.mobileprovision`

## Security Note:
- Add `credentials/` to .gitignore to avoid committing sensitive files
- For CI/CD, store these as encrypted secrets or use a secure credential management system
