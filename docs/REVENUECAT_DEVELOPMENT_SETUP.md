# RevenueCat Development Setup

## Overview
This guide helps resolve the RevenueCat configuration warnings you see during development.

## What The Warnings Mean

### Normal Development Warnings ✅
These warnings are **EXPECTED** during development:
```
[RevenueCat] 🍎‼️ Error fetching offerings - The operation couldn't be completed
There's a problem with your configuration. None of the products registered in the RevenueCat dashboard could be fetched from App Store Connect
```

**Why This Happens:**
- Products aren't approved in App Store Connect yet
- StoreKit Configuration file needs setup
- Development environment differs from production

## Quick Fixes

### 1. Reduce Log Noise
The app now uses `LOG_LEVEL.WARN` in development to reduce console noise while showing important warnings.

### 2. StoreKit Configuration (Recommended)
We've created `ios/Configuration.storekit` for local testing:

```json
// ios/Configuration.storekit contains:
- Premium Monthly: com.getmaximumfit.premium.monthly
- Premium Yearly: com.getmaximumfit.premium.yearly
```

**To use this:**
1. Open your iOS project in Xcode
2. Go to your scheme settings (Product → Scheme → Edit Scheme)
3. Select "Run" in the left panel
4. Go to "Options" tab
5. Under "StoreKit Configuration", select "Configuration.storekit"

### 3. App Behavior During Development
The app is designed to work gracefully without RevenueCat:

- ✅ App starts normally
- ✅ Feature gating defaults to free tier
- ✅ No crashes or blocking errors
- ✅ Helpful development messages

## Development Testing Checklist

### ✅ Normal Development Behavior
- [x] App starts without crashes
- [x] Console shows: "Development mode - no offerings available"
- [x] Feature gating works with free tier limits
- [x] Subscription features are disabled gracefully

### 🧪 Testing Subscriptions (Optional)
If you want to test actual purchases:

1. **Create Sandbox Account**:
   - Go to App Store Connect
   - Users and Access → Sandbox Testers
   - Create test account

2. **Set up Products**:
   - App Store Connect → My Apps → In-App Purchases
   - Create products matching your StoreKit configuration

3. **Test on Device**:
   - Sign out of App Store on device
   - Run app, try to purchase
   - Sign in with sandbox account when prompted

## Understanding The Console Output

### ✅ Expected Messages (Normal)
```
🏪 RevenueCat configured for development with v2 API
ℹ️ StoreKit configuration warnings during development are normal
🔧 Development: Continuing without offerings (subscription features disabled)
Development mode - no offerings available
```

### ❌ Problematic Messages (Fix Needed)
```
RevenueCat API key not properly configured
Failed to initialize RevenueCat
```

## Environment Variables

Make sure your `.env` or configuration has:
```env
REVENUECAT_API_KEY=your_v2_api_key_here
```

## Production vs Development

| Environment | Behavior |
|-------------|----------|
| **Development** | Graceful degradation, helpful warnings, no crashes |
| **Production** | Full RevenueCat integration, error-level logging only |

## Next Steps

1. **For Development**: Your app works correctly as-is
2. **For Production**: Set up products in App Store Connect
3. **For Testing**: Use the StoreKit configuration file

## Troubleshooting

### Still Seeing "Purchases instance already set"?
This indicates multiple RevenueCat initializations. The app now handles this gracefully.

### Want to test real purchases?
Use the StoreKit configuration file and sandbox accounts.

### App not working?
Check that:
- RevenueCat API key is set
- App starts without crashes
- Feature gating defaults to free tier

## Resources
- [RevenueCat Development Guide](https://docs.revenuecat.com/docs/getting-started)
- [StoreKit Testing](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_storekit_testing_in_xcode)
- [App Store Connect Sandbox](https://help.apple.com/app-store-connect/#/dev8b997bee1)
