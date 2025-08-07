# Social Media OAuth Setup Guide

This guide explains how to configure OAuth authentication for social media platforms in your Maximum Fit app.

## Overview

The social sharing feature requires OAuth 2.0 authentication with each platform. This involves:

1. **Creating developer apps** on each platform
2. **Configuring OAuth credentials** in your app
3. **Setting up redirect URIs** for authentication flow
4. **Testing the integration**

## Platform Setup Instructions

### 1. Instagram (Meta/Facebook)

**Prerequisites:**
- Facebook Developer Account
- Instagram Business Account

**Steps:**
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing app
3. Add "Instagram Basic Display" product
4. Configure OAuth redirect URIs:
   - Add your app's redirect URI (found in console logs)
   - Format: `exp://127.0.0.1:19000/--/expo-auth-session` (for development)
5. Get your Client ID from the Instagram Basic Display settings
6. Replace `YOUR_INSTAGRAM_CLIENT_ID` in the code

**Required Scopes:**
- `user_profile` - Access basic profile information
- `user_media` - Access user's media

**Testing:**
- Instagram app must be installed on device for native sharing
- Fallback to web browser if app not installed

---

### 2. Facebook

**Prerequisites:**
- Facebook Developer Account

**Steps:**
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app (Business type recommended)
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs in Facebook Login settings
5. Get your App ID from the app dashboard
6. Replace `YOUR_FACEBOOK_APP_ID` in the code

**Required Scopes:**
- `public_profile` - Access basic profile information
- `publish_to_groups` - Post to groups (if needed)

**Additional Setup:**
- Add platform: iOS/Android with bundle IDs
- Configure App Domain if using web fallback

---

### 3. Twitter (X)

**Prerequisites:**
- Twitter Developer Account
- Approved developer application

**Steps:**
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new project and app
3. Enable OAuth 2.0 in authentication settings
4. Add redirect URI in OAuth 2.0 settings
5. Get your Client ID from the OAuth 2.0 settings
6. Replace `YOUR_TWITTER_CLIENT_ID` in the code

**Required Scopes:**
- `tweet.read` - Read tweets
- `tweet.write` - Post tweets
- `users.read` - Read user information

**Important Notes:**
- Twitter requires approval for write access
- Test with read-only scopes first

---

### 4. Strava

**Prerequisites:**
- Strava account
- Strava API application

**Steps:**
1. Go to [Strava Developers](https://developers.strava.com/)
2. Create a new API application
3. Configure authorization callback domain
4. Get your Client ID from the application settings
5. Replace `YOUR_STRAVA_CLIENT_ID` in the code

**Required Scopes:**
- `activity:write` - Upload and modify activities

**Additional Setup:**
- Set application icon and description
- Configure privacy settings

---

## Implementation in Code

### 1. Update Client IDs

In `components/SocialSharingModal.tsx`, replace the placeholder client IDs:

```typescript
// Replace these with your actual client IDs
authConfig: {
  clientId: 'YOUR_ACTUAL_CLIENT_ID', // ← Replace this
  // ... other config
}
```

### 2. Configure App Schemes (app.json)

Add URL schemes to your `app.json`:

```json
{
  "expo": {
    "scheme": "yourappscheme",
    "platforms": ["ios", "android"]
  }
}
```

### 3. Handle Deep Links

The app automatically handles OAuth redirects using `expo-auth-session` and `expo-web-browser`.

### 4. Test Authentication Flow

1. Try to connect a social account
2. Check console logs for redirect URI
3. Ensure the redirect URI is configured in the platform's developer settings
4. Test both successful and cancelled authentication flows

---

## Security Considerations

### 1. Client Secrets

- **Never** store client secrets in your mobile app code
- Use client IDs only (public identifiers)
- Server-side token exchange recommended for production

### 2. Token Storage

- Store access tokens securely using `expo-secure-store`
- Implement token refresh logic for long-lived access
- Clear tokens on logout/disconnect

### 3. Permissions

- Request minimal required scopes
- Explain permission requests to users
- Handle permission denials gracefully

---

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check redirect URI exactly matches platform configuration
   - Ensure URI is URL-encoded properly
   - Verify scheme is registered in app.json

2. **"Client ID not found"**
   - Verify client ID is copied correctly
   - Check if app is in development/sandbox mode
   - Ensure app is published/reviewed if required

3. **"Scope not allowed"**
   - Check if scopes require app review
   - Verify scopes are enabled in platform settings
   - Use minimal scopes for testing

4. **Authentication popup doesn't appear**
   - Check network connectivity
   - Verify OAuth URLs are correct
   - Test in browser first

### Debug Mode

Enable debug logging by setting:

```typescript
console.log('Auth URL:', authUrlWithParams);
console.log('Redirect URI:', redirectUri);
```

### Platform-Specific Notes

- **iOS**: Deep link handling requires URL schemes in Info.plist
- **Android**: Intent filters needed for deep links
- **Web**: Browser redirects work differently than mobile

---

## Production Checklist

- [ ] All client IDs configured with real values
- [ ] Redirect URIs match between app and platform settings
- [ ] Apps reviewed/approved by platforms (if required)
- [ ] Token storage implemented securely
- [ ] Error handling for all OAuth scenarios
- [ ] Privacy policy updated with social login information
- [ ] Terms of service include social platform terms

---

## Support

For platform-specific issues:
- [Instagram API Documentation](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [Strava API Documentation](https://developers.strava.com/docs)

For Expo/React Native issues:
- [Expo AuthSession Documentation](https://docs.expo.dev/guides/authentication/#authsession)
- [React Native Deep Linking](https://reactnative.dev/docs/linking)
