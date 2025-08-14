# RevenueCat Paywall Implementation Guide

## Overview

This guide shows you how to implement RevenueCat's native paywall SDK alongside your existing custom paywall. Both approaches use the same RevenueCat backend, giving you flexibility in how you present subscription options to users.

## What You Already Have

✅ **RevenueCat SDK**: `react-native-purchases` v9.2.0
✅ **RevenueCat UI SDK**: `react-native-purchases-ui` v9.2.0  
✅ **Custom Paywall**: Your existing `PaywallScreen.tsx`
✅ **RevenueCat Service**: Configured with v2 API

## Two Paywall Approaches

### 1. Your Custom Paywall (Current Implementation)

**File**: `components/PaywallScreen.tsx`

**Pros**:
- Full design control
- Brand consistency  
- Custom animations
- Unique user experience
- Perfect integration with your app's UI

**Cons**:
- Manual A/B testing required
- Manual localization
- More development/maintenance time

### 2. RevenueCat Native Paywall (New Option)

**Implementation**: Uses `RevenueCatUI.presentPaywall()`

**Pros**:
- Optimized for conversion (built from data across thousands of apps)
- Built-in A/B testing via RevenueCat dashboard
- Automatic localization (30+ languages)
- Pre-built templates that follow platform guidelines
- Built-in analytics and conversion tracking
- Zero maintenance required

**Cons**:
- Less design flexibility
- RevenueCat branding may appear
- Modal presentation only

## Implementation Examples

### Basic RevenueCat Paywall

```typescript
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

const showRevenueCatPaywall = async () => {
  try {
    const result = await RevenueCatUI.presentPaywall({
      displayCloseButton: true,
      // offeringId: 'specific_offering', // Optional
    });

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
        // Handle successful purchase
        console.log('User purchased!');
        break;
      case PAYWALL_RESULT.CANCELLED:
        console.log('User cancelled');
        break;
      case PAYWALL_RESULT.RESTORED:
        console.log('Purchases restored');
        break;
      case PAYWALL_RESULT.ERROR:
        console.log('Error occurred');
        break;
    }
  } catch (error) {
    console.error('Paywall error:', error);
  }
};
```

### Hybrid Approach (Recommended)

```typescript
// Use both strategically based on context
const showPaywall = (context: 'onboarding' | 'feature_gate' | 'settings') => {
  switch (context) {
    case 'onboarding':
      // Use custom paywall for brand experience
      navigation.navigate('CustomPaywall');
      break;
    case 'feature_gate':
      // Use RevenueCat for optimized conversion
      RevenueCatUI.presentPaywall({ displayCloseButton: true });
      break;
    case 'settings':
      // A/B test between both
      const useRevenueCatPaywall = Math.random() > 0.5;
      if (useRevenueCatPaywall) {
        RevenueCatUI.presentPaywall({ displayCloseButton: true });
      } else {
        navigation.navigate('CustomPaywall');
      }
      break;
  }
};
```

## Configuration in RevenueCat Dashboard

### Setting Up Paywall Templates

1. **Login to RevenueCat Dashboard**
   - Go to [app.revenuecat.com](https://app.revenuecat.com)
   - Select your app

2. **Navigate to Paywalls**
   - In the left sidebar, click "Paywalls"
   - Click "Create Paywall"

3. **Choose Template**
   - **Template 1**: Simple list of packages
   - **Template 2**: Feature comparison
   - **Template 3**: Condensed with hero image
   - **Template 4**: Vertical packages
   - **Template 5**: Minimalist

4. **Configure Your Paywall**
   ```
   Paywall Name: "Premium Upgrade"
   Offering: Select your current offering
   Template: Choose based on your preference
   ```

5. **Customize Content**
   - **Title**: "Unlock Premium Features"
   - **Subtitle**: "Get the most out of GetMaximumFit"
   - **Features**: List your premium features
   - **Call to Action**: "Start Free Trial"

### A/B Testing Setup

1. **Create Multiple Paywalls**
   ```
   Paywall A: Template 1 (Control)
   Paywall B: Template 3 (Variant)
   ```

2. **Set Traffic Split**
   ```
   Paywall A: 50%
   Paywall B: 50%
   ```

3. **Monitor Results**
   - RevenueCat automatically tracks conversion rates
   - View results in Analytics > Paywalls

## Advanced Features

### Conditional Paywall Display

```typescript
import { useRevenueCat } from '@/hooks/useRevenueCat';

const PaywallManager = () => {
  const { customerInfo, currentOffering } = useRevenueCat();
  
  const showPaywall = async () => {
    // Check if user has active subscription
    if (customerInfo?.entitlements.active['premium']) {
      Alert.alert('Already Premium', 'You already have premium access!');
      return;
    }

    // Show different paywalls based on user history
    const hasSeenPaywall = await AsyncStorage.getItem('has_seen_paywall');
    
    if (!hasSeenPaywall) {
      // First time - use custom paywall for brand experience
      navigation.navigate('CustomPaywall');
      await AsyncStorage.setItem('has_seen_paywall', 'true');
    } else {
      // Returning user - use optimized RevenueCat paywall
      RevenueCatUI.presentPaywall({ displayCloseButton: true });
    }
  };
};
```

### Custom Offering Targeting

```typescript
// Show different paywalls for different user segments
const showSegmentedPaywall = async (userSegment: 'new' | 'trial' | 'lapsed') => {
  const offeringMap = {
    new: 'onboarding_offer',
    trial: 'trial_extension', 
    lapsed: 'winback_offer'
  };

  await RevenueCatUI.presentPaywall({
    offeringId: offeringMap[userSegment],
    displayCloseButton: true,
  });
};
```

## Analytics and Tracking

RevenueCat automatically tracks:
- **Impressions**: How many times paywall was shown
- **Conversion Rate**: Percentage of users who purchased
- **Revenue**: Total revenue from paywall
- **Trial Starts**: Free trial conversions

### Custom Analytics

```typescript
// Track paywall performance in your analytics
const trackPaywallEvent = (event: string, paywall: 'custom' | 'revenuecat') => {
  Analytics.track('Paywall Event', {
    event,
    paywall_type: paywall,
    user_id: customerInfo?.originalAppUserId,
    offering_id: currentOffering?.identifier,
  });
};

// Usage
trackPaywallEvent('shown', 'revenuecat');
trackPaywallEvent('purchase_completed', 'revenuecat');
```

## Best Practices

### 1. Strategic Usage
- **Onboarding**: Custom paywall for brand experience
- **Feature Gates**: RevenueCat paywall for conversion optimization
- **Re-engagement**: A/B test both approaches

### 2. Gradual Migration
```typescript
// Phase 1: 90% custom, 10% RevenueCat
// Phase 2: 70% custom, 30% RevenueCat  
// Phase 3: 50% custom, 50% RevenueCat
// Phase 4: Choose winner based on data

const getPaywallType = () => {
  const random = Math.random();
  return random < 0.1 ? 'revenuecat' : 'custom'; // 10% RevenueCat
};
```

### 3. Error Handling
```typescript
const showPaywallWithFallback = async () => {
  try {
    await RevenueCatUI.presentPaywall({ displayCloseButton: true });
  } catch (error) {
    console.error('RevenueCat paywall failed, showing custom:', error);
    // Fallback to custom paywall
    navigation.navigate('CustomPaywall');
  }
};
```

## Testing

### Development Testing

1. **Configure StoreKit** (for iOS simulator testing)
   - In Xcode: Product → Scheme → Edit Scheme → Run → Options
   - Set StoreKit Configuration to "Configuration.storekit"

2. **Test Both Paywalls**
   ```bash
   npx expo start --dev-client
   npx expo run:ios
   ```

3. **Use Demo Component**
   ```typescript
   // Add to your app for testing
   import { PaywallComparison } from '@/components/PaywallComparison';
   
   // Show demo screen
   <PaywallComparison 
     onClose={() => setShowDemo(false)}
     onPurchaseSuccess={(customerInfo) => {
       console.log('Purchase successful:', customerInfo);
     }}
   />
   ```

### Production Testing

1. **A/B Test Setup**
   - Create two identical offerings in RevenueCat
   - One uses custom paywall, one uses RevenueCat paywall
   - Split traffic 50/50

2. **Monitor Metrics**
   ```
   Custom Paywall:
   - Conversion rate: X%
   - Time to purchase: X seconds
   - Drop-off points: Manual tracking
   
   RevenueCat Paywall:
   - Conversion rate: Y%
   - Time to purchase: Y seconds  
   - Drop-off points: Automatic tracking
   ```

## Conclusion

**Recommendation**: Start with your custom paywall for the main user flow (it's working well and matches your brand), then gradually A/B test RevenueCat's paywall in specific contexts to optimize conversion rates.

The beauty of this approach is that both paywalls use the same RevenueCat backend, so switching between them is seamless and you can optimize based on real data.

## Files Created

1. `components/RevenueCatPaywallExample.tsx` - Basic RevenueCat paywall implementation
2. `components/PaywallComparison.tsx` - Side-by-side comparison demo
3. This documentation file

## Next Steps

1. Test the demo components in your app
2. Set up paywall templates in RevenueCat dashboard
3. Plan your A/B testing strategy
4. Implement gradual rollout based on user segments
