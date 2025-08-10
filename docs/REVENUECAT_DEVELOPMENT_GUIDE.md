# RevenueCat Development Guide

## 🚨 Understanding RevenueCat Warnings

### Common Warning: "Products configured but not approved in App Store Connect"

**This warning is NORMAL during development and means:**

✅ **RevenueCat SDK is configured correctly**
✅ **Your products are set up in RevenueCat dashboard**
❗ **Products aren't approved in App Store Connect yet**

## 🛠️ Development vs Production

### Development Environment
- **Warning appears**: This is expected behavior
- **Sandbox testing**: Use test accounts for purchases
- **Products work**: You can test purchases with sandbox accounts
- **No action needed**: Continue developing normally

### Production Environment
- **Warning disappears**: After App Store approval
- **Real purchases**: Users can make actual purchases
- **App Store Connect**: Products must be approved first

## 📱 Testing Purchases in Development

### 1. Create Sandbox Test Account
1. Go to App Store Connect
2. Navigate to Users and Access > Sandbox Testers
3. Create a test account with unique email
4. Sign out of App Store on your device
5. Test purchases will prompt for sandbox account login

### 2. Test Purchase Flow
```typescript
// Your app already handles this correctly
const { purchasePackage } = useRevenueCat();

try {
  await purchasePackage(selectedPackage);
  console.log('✅ Test purchase successful');
} catch (error) {
  console.log('❌ Test purchase failed:', error);
}
```

### 3. Verify Test Purchases
- Use sandbox account credentials when prompted
- Purchases should complete without charging real money
- Check that entitlements are granted correctly

## 🔧 Current Implementation Status

### ✅ What's Working
- RevenueCat SDK configured
- Subscription context set up
- Feature gating implemented
- Error handling in place
- Development logging configured

### 📋 Next Steps for Production
1. **App Store Connect Setup**
   - Create in-app purchase products
   - Match product IDs with RevenueCat
   - Submit for review and approval

2. **Testing Checklist**
   - [ ] Sandbox purchases work
   - [ ] Subscriptions grant entitlements
   - [ ] Feature gating responds to subscription status
   - [ ] Restore purchases works
   - [ ] Error handling works gracefully

3. **Production Deployment**
   - Products approved in App Store Connect
   - RevenueCat webhook configured
   - Production API keys configured
   - App submitted for review

## 🔍 Debugging RevenueCat Issues

### Check Configuration
```typescript
// In your app, check these logs:
console.log('🏪 RevenueCat: API key configured for development');
console.log('✅ RevenueCat configured successfully');
```

### Common Issues & Solutions

**Issue**: API key not configured
**Solution**: Check `.env` file has `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`

**Issue**: Products not loading
**Solution**: Verify products exist in RevenueCat dashboard

**Issue**: Purchases failing
**Solution**: Use sandbox test account, check product IDs match

**Issue**: Entitlements not working
**Solution**: Verify entitlement IDs match between RevenueCat and app

## 📚 Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [Sandbox Testing Guide](https://docs.revenuecat.com/docs/sandbox)

## 💡 Pro Tips

1. **Always test with sandbox accounts** - Never use real accounts for testing
2. **Check entitlements, not products** - Feature gating should check entitlements
3. **Handle errors gracefully** - Network issues are common
4. **Log everything in development** - Makes debugging much easier
5. **Test restore purchases** - Users expect this to work

---

**Remember**: The warning you're seeing is completely normal and expected during development. Your RevenueCat integration is working correctly!
