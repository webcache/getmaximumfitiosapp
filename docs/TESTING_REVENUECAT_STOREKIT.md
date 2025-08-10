# Testing the RevenueCat StoreKit Configuration

## Summary
We've implemented a comprehensive freemium system with RevenueCat v2 API, feature gating, and premium upgrade screen. Here's how to test it:

## ✅ What's Been Implemented

### 1. RevenueCat v2 API Integration
- Updated to v2 API with proper configuration
- Set log level to ERROR to reduce console noise
- Product IDs configured to match RevenueCat dashboard

### 2. StoreKit Configuration
- **File**: `ios/Configuration.storekit`
- **Products**: pro ($11.99/mo), Annual ($79.99/yr), lifetime ($159.99), proupgrade ($11.99/mo), proannual ($79.99/yr)
- **Status**: Ready for testing

### 3. Premium Upgrade Screen
- **File**: `app/premiumUpgrade.tsx`
- **Features**: Three pricing tiers, feature descriptions, purchase flow
- **Enhanced**: Better error handling for development mode

### 4. Feature Gating System
- **Files**: `components/FeatureGateComponents.tsx`, `config/features.ts`
- **Components**: ProBadge, FeatureButton, SubtleFeatureGate
- **Features Gated**: Workout favorites, goal setting, theme customization

### 5. Development Tools
- **Debug Component**: `components/RevenueCatStatus.tsx` (shows in dashboard)
- **Test Button**: Premium upgrade test button in dashboard (dev only)

## 🧪 Testing Steps

### Step 1: Configure StoreKit in Xcode
1. Open your iOS project in Xcode
2. Go to **Product → Scheme → Edit Scheme**
3. Select **Run** action on the left
4. Go to **Options** tab
5. Under **StoreKit Configuration**, select **Configuration.storekit**
6. **IMPORTANT**: Make sure to save the scheme

### Step 2: Build and Run in iOS Simulator
```bash
# If Expo server isn't running:
npx expo start --dev-client

# Then build for iOS simulator:
npx expo run:ios
```

### Step 3: Check RevenueCat Status
1. Navigate to the Dashboard tab
2. Look for the "RevenueCat Status (Dev Only)" section
3. Verify these indicators:
   - ✅ **Configured**: Should be "Yes"
   - ✅ **Has Offering**: Should be "Yes" (this is the key test)
   - ✅ **Offerings Count**: Should be > 0
   - 📦 **Available Packages**: Should list pro, Annual, lifetime

### Step 4: Test Premium Upgrade Screen
1. Tap the "🧪 Test Premium Upgrade" button in dashboard
2. Verify the three pricing options display correctly
3. Try tapping purchase buttons (they should work in sandbox mode)
4. Test the "Restore Purchases" button

### Step 5: Test Feature Gating
Navigate to these screens to see feature gating in action:
- **Workouts Tab**: Look for ProBadge on favorite functionality
- **Progress Tab**: Goal setting should be gated
- **Options Tab**: Theme customization should be gated

## 🔍 Troubleshooting

### If "Has Offering" shows "No":
1. **Check Xcode Scheme**: Make sure StoreKit configuration is selected
2. **Product IDs**: Verify they match RevenueCat dashboard exactly
3. **Clean Build**: Clean and rebuild the iOS project
4. **Restart**: Close simulator and restart

### If Purchase Flow Fails:
1. **Sandbox Testing**: Make sure you're using a sandbox Apple ID
2. **Product Setup**: Check RevenueCat dashboard for product configuration
3. **Error Messages**: Check the RevenueCat Status component for specific errors

### Common Issues:
- **Offerings Error**: Usually means StoreKit configuration not properly set in Xcode scheme
- **Product Not Found**: Product IDs don't match between RevenueCat and StoreKit
- **Purchase Failed**: Sandbox account issues or incorrect product configuration

## 📋 Expected Behavior

### Free User Experience:
- Can create basic workouts
- Cannot favorite workouts (shows ProBadge)
- Cannot set goals (shows upgrade prompt)
- Cannot customize themes (shows upgrade prompt)
- Sees subtle premium hints throughout the app

### Premium User Experience:
- All features unlocked
- No premium badges or upgrade prompts
- Full access to favorites, goals, themes

## 🎯 Next Steps After Testing

Once StoreKit is working correctly:

1. **Individual Screen Implementation**: Implement specific feature gating in:
   - Workouts screen (favorite functionality)
   - Progress screen (goal setting)
   - Options screen (theme customization)

2. **Production Setup**: 
   - Configure actual App Store products
   - Remove development debug components
   - Set RevenueCat log level to INFO or WARN

3. **User Experience Polish**:
   - Refine upgrade prompts timing
   - Add onboarding for premium features
   - Implement analytics for conversion tracking

## 🐛 Debug Information

The RevenueCat Status component shows real-time information about:
- Configuration status
- Loading states
- Available offerings
- Active subscriptions
- Error messages
- Product details

This component will automatically disappear in production builds (only shows when `__DEV__` is true).

---

**Important**: All debug components and test buttons are automatically hidden in production builds. The feature gating system works in both development and production environments.
