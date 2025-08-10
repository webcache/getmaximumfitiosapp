# StoreKit Configuration Setup Guide

## Overview
This guide will help you set up the StoreKit Configuration file in Xcode to resolve the RevenueCat offerings error during development.

## Current Error
```
ERROR [RevenueCat] 🍎‼️ Error fetching offerings - The operation couldn't be completed. (RevenueCat.OfferingsManager.Error error 1.)
There's a problem with your configuration. None of the products registered in the RevenueCat dashboard could be fetched from App Store Connect (or the StoreKit Configuration file if one is being used).
```

## Solution: Configure StoreKit Testing

### 1. Open Your iOS Project in Xcode
```bash
cd /Users/adam/GitHub/getmaximumfitiosapp
npx expo run:ios
```

### 2. Add StoreKit Configuration File
1. In Xcode, go to **File → New → File**
2. Choose **iOS → Resource → StoreKit Configuration File**
3. Name it `Configuration.storekit`
4. Save it in your iOS project directory

### 3. Use Existing Configuration
We've already created `ios/Configuration.storekit` with the correct product IDs:

**Products configured:**
- `pro` - Monthly subscription ($11.99/month)
- `Annual` - Annual subscription ($79.99/year)
- `lifetime` - Lifetime purchase ($159.99)
- `proupgrade` - Pro upgrade monthly ($11.99/month)
- `proannual` - Pro upgrade annual ($79.99/year)

### 4. Enable StoreKit Configuration in Scheme
1. In Xcode, go to **Product → Scheme → Edit Scheme**
2. Select **Run** in the left sidebar
3. Go to **Options** tab
4. Under **StoreKit Configuration**, select `Configuration.storekit`
5. Click **Close**

### 5. Test the Configuration
1. Build and run your app in the simulator
2. The RevenueCat errors should be reduced significantly
3. You should be able to test purchases with sandbox accounts

## Product ID Mapping

### RevenueCat Dashboard → StoreKit Configuration
```
RevenueCat Product ID → StoreKit Product ID
pro                  → pro (Monthly $11.99)
Annual               → Annual (Annual $79.99)
lifetime             → lifetime (Lifetime $159.99)
proupgrade           → proupgrade (Monthly $11.99)
proannual            → proannual (Annual $79.99)
```

## Testing Purchases

### 1. Create Sandbox Test Account
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access → Sandbox Testers**
3. Click **+** to create a new sandbox tester
4. Fill in test account details

### 2. Test on Device/Simulator
1. Sign out of App Store on your device/simulator
2. Run your app and try to make a purchase
3. When prompted, sign in with your sandbox test account
4. Complete the test purchase (no real money charged)

## Troubleshooting

### Still seeing errors?
1. **Check Product IDs**: Ensure RevenueCat dashboard products match StoreKit configuration
2. **Clean Build**: In Xcode, **Product → Clean Build Folder**
3. **Reset Simulator**: **Device → Erase All Content and Settings**
4. **Check Scheme**: Verify StoreKit configuration is selected in scheme settings

### Expected Development Behavior
- ✅ App starts without crashes
- ✅ Reduced RevenueCat console warnings
- ✅ Feature gating works with default free tier
- ✅ Purchase flow can be tested with sandbox accounts

## Production Setup

### When ready for production:
1. Set up products in App Store Connect with the same product IDs
2. Submit for review and approval
3. RevenueCat will automatically sync with approved products
4. Remove StoreKit configuration from scheme for production builds

## Notes
- StoreKit configuration is only for development/testing
- Real App Store Connect products are required for production
- Sandbox testing works with StoreKit configuration
- Feature gating will work normally regardless of StoreKit status
