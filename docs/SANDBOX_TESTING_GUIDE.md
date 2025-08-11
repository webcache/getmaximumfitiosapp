# Sandbox Testing Guide for In-App Purchases

## 🧪 **Setting Up Sandbox Testing**

### Prerequisites
- ✅ Sandbox user created in App Store Connect
- ✅ StoreKit Configuration.storekit file configured
- ✅ RevenueCat configured with correct product IDs
- ✅ Xcode scheme set to use StoreKit Configuration

### 1. **Configure iOS Simulator for Sandbox Testing**

#### Step 1: Open Settings in Simulator
1. Launch iOS Simulator
2. Open **Settings** app
3. Scroll down and tap **App Store**

#### Step 2: Configure Sandbox Account
1. Scroll down to **Sandbox Account** section
2. Tap **Sign In**
3. Enter your sandbox Apple ID credentials
4. **Important**: Do NOT sign into the main Apple ID section above

#### Step 3: Verify Configuration
- You should see your sandbox email listed under "Sandbox Account"
- The main Apple ID section should remain signed out or show your regular ID

### 2. **Testing Process**

#### Step 1: Launch Your App
```bash
# Make sure your development server is running
npx expo start --dev-client

# Build and run on iOS simulator
npx expo run:ios
```

#### Step 2: Navigate to Premium Upgrade
1. Open your app in the simulator
2. Go to Dashboard tab
3. Look for the "🧪 Test Premium Upgrade" button (development only)
4. Or navigate through normal flow to reach premium upgrade screen

#### Step 3: Test Purchase Flow
1. **Select a plan** (Monthly, Annual, or Lifetime)
2. **Tap "Start Pro Subscription"**
3. **App Store purchase dialog** should appear
4. **Sign in when prompted** using your sandbox Apple ID
5. **Confirm purchase** - no real money will be charged

### 3. **Expected Sandbox Behavior**

#### ✅ **What Should Happen:**
- Purchase dialogs appear normally
- Sandbox credentials are accepted
- Purchase completes successfully
- RevenueCat receives the transaction
- App unlocks premium features
- "Success!" alert appears

#### 🔍 **Sandbox-Specific Features:**
- **No real charges** - all transactions are simulated
- **Accelerated renewals** - subscriptions renew much faster for testing:
  - 1 week subscription → renews every 3 minutes
  - 1 month subscription → renews every 5 minutes  
  - 1 year subscription → renews every 1 hour
- **Easy cancellation** - can test subscription management flows

### 4. **Testing Different Scenarios**

#### Test 1: Successful Purchase
1. Select any plan
2. Complete purchase with sandbox credentials
3. Verify premium features unlock

#### Test 2: Purchase Cancellation
1. Start purchase flow
2. Cancel during App Store dialog
3. Verify app handles cancellation gracefully

#### Test 3: Restore Purchases
1. Complete a purchase
2. "Delete" the app (or clear app data)
3. Reinstall and tap "Restore Purchases"
4. Verify subscription is restored

#### Test 4: Subscription Management
1. Complete a subscription purchase
2. Go to iOS Settings → Apple ID → Subscriptions
3. Find your sandbox subscription
4. Test cancellation and reactivation

### 5. **Debugging Sandbox Issues**

#### Common Issues & Solutions:

**Issue**: "Cannot connect to App Store"
- **Solution**: Ensure you're signed into Sandbox Account, not main Apple ID

**Issue**: "This Apple ID has not yet been used with the App Store"
- **Solution**: Sign out and sign back into sandbox account

**Issue**: Products not loading
- **Solution**: Check RevenueCat Status component for specific errors

**Issue**: Purchase fails immediately
- **Solution**: Verify StoreKit configuration is enabled in Xcode scheme

#### Debugging Tools:

1. **RevenueCat Status Component**: Shows real-time configuration status
2. **Sandbox Indicator**: Yellow banner shows when in sandbox mode
3. **Console Logs**: Check for RevenueCat and StoreKit errors
4. **Xcode Console**: View detailed transaction logs

### 6. **Sandbox Testing Checklist**

#### Before Testing:
- [ ] Sandbox user created in App Store Connect
- [ ] iOS Simulator configured with sandbox account
- [ ] App built with StoreKit configuration enabled
- [ ] RevenueCat Status shows "Has Offering: Yes"

#### During Testing:
- [ ] Purchase flow initiates correctly
- [ ] App Store dialogs appear
- [ ] Sandbox credentials accepted
- [ ] Purchase completes successfully
- [ ] Premium features unlock immediately

#### After Testing:
- [ ] Test restore purchases functionality
- [ ] Test subscription cancellation
- [ ] Verify graceful error handling
- [ ] Check subscription management in iOS Settings

### 7. **Sandbox Account Management**

#### In App Store Connect:
1. Go to **Users and Access** → **Sandbox Testers**
2. View your sandbox accounts
3. Can reset purchase history if needed
4. Can create multiple sandbox accounts for different test scenarios

#### Best Practices:
- Use different sandbox accounts for different test scenarios
- Reset purchase history between major test sessions
- Keep sandbox credentials secure and separate from real Apple IDs
- Document test results for different user flows

### 8. **Transitioning to Production**

#### When Ready for Real Testing:
1. **Remove debug components** (RevenueCat Status, Sandbox Indicator)
2. **Update Xcode scheme** to remove StoreKit Configuration
3. **Test with real Apple ID** on TestFlight or App Store
4. **Verify App Store Connect** products are approved

---

## 🎯 **Quick Start Summary**

1. **Configure Simulator**: Settings → App Store → Sandbox Account → Sign In
2. **Launch App**: Use development build with StoreKit configuration
3. **Test Purchase**: Navigate to premium screen, select plan, complete purchase
4. **Verify Success**: Check that premium features unlock

**Key Indicator**: Look for the yellow "Sandbox Testing Mode" banner in your premium upgrade screen to confirm you're in sandbox mode! 🧪
