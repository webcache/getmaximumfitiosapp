# Social Authentication Setup

## Firebase Configuration

To enable Google and Apple authentication, you need to configure Firebase:

### 1. Google Sign-In Setup

#### Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Authentication > Sign-in method
4. Enable Google provider
5. Note down your Web client ID

#### Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to APIs & Services > Credentials
4. Create OAuth 2.0 Client IDs for:
   - iOS (using your bundle ID: `com.adamcache.getmaximumfitiosapp`)
   - Android (using your package name and SHA1 fingerprint)
   - Web application

#### Update Configuration:
In `utils/socialAuth.ts`, replace the placeholder client IDs:

```typescript
const GOOGLE_AUTH_CONFIG = {
  clientId: {
    ios: 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com',
    android: 'YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    web: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  },
};
```

### 2. Apple Sign-In Setup

#### Apple Developer Portal:
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Go to Certificates, Identifiers & Profiles
3. Select your App ID
4. Enable "Sign In with Apple" capability
5. Configure your app in Xcode with the same capability

#### Firebase Console:
1. Go to Authentication > Sign-in method
2. Enable Apple provider
3. Enter your Apple Team ID and Key ID (from Apple Developer Portal)
4. Upload your Apple Auth Key (.p8 file)

### 3. App Configuration

#### app.json:
The following plugin is already added:
```json
{
  "plugins": [
    "expo-apple-authentication"
  ]
}
```

#### iOS Info.plist (handled by Expo):
The Apple Authentication plugin automatically adds the required entries.

### 4. Firebase Security Rules

Update your Firestore security rules to allow profile updates:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Testing

#### Development:
- Use Expo Go for initial testing (limited functionality)
- Use Development Build (`expo install expo-dev-client`) for full testing

#### Production:
- Build with EAS Build
- Test on physical devices
- Apple Sign-In requires production builds for full testing

## Troubleshooting

### Common Issues:

1. **Google Sign-In not working:**
   - Check client IDs are correct for each platform
   - Verify bundle ID matches Google Console configuration
   - Ensure OAuth consent screen is configured

2. **Apple Sign-In not working:**
   - Only works on iOS devices and simulators
   - Requires Development Build or production build
   - Check Apple Developer Portal configuration

3. **Firebase errors:**
   - Verify Firebase project configuration
   - Check authentication providers are enabled
   - Ensure Firestore rules allow profile access

### Required Expo Packages:
- ✅ expo-auth-session
- ✅ expo-crypto
- ✅ expo-apple-authentication
- ✅ @react-native-google-signin/google-signin (for future native implementation)

## Next Steps:

1. Configure Firebase Authentication providers
2. Set up Google Cloud Console OAuth clients
3. Configure Apple Developer Portal
4. Update client IDs in `utils/socialAuth.ts`
5. Test on development build
6. Deploy and test in production
