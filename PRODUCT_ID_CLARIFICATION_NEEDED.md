# App Store Connect Product ID Configuration Guide

## 🎯 **Your Complex Setup: In-App Purchases + Subscriptions**

You mentioned having both:
- **3 In-App Purchases** (Non-Consumable): monthly, annual, lifetime  
- **2 Subscriptions** (Auto-Renewable): monthly, annual

This requires **different Product IDs** for each type to avoid conflicts.

## 📋 **Recommended Product ID Structure:**

### **In-App Purchases (Non-Consumable)**
- `lifetime` - One-time purchase for lifetime access
- `monthly_purchase` - One-time purchase for monthly access  
- `annual_purchase` - One-time purchase for annual access

### **Subscriptions (Auto-Renewable)**
- `monthly_subscription` - Recurring monthly subscription
- `annual_subscription` - Recurring annual subscription

## ❓ **What We Need to Know:**

**1. In App Store Connect → In-App Purchases section, what are the exact Product IDs?**
- Product 1: ________________
- Product 2: ________________  
- Product 3: ________________

**2. In App Store Connect → Subscriptions section, what are the exact Product IDs?**
- Subscription 1: ________________
- Subscription 2: ________________

## 🔧 **Once You Provide the Exact IDs:**

1. I'll update your StoreKit configuration to match exactly
2. Update RevenueCat offerings configuration  
3. Ensure your custom paywall loads the correct products
4. Fix the "Subscription Service Unavailable" error

## 💡 **Why This Matters:**

RevenueCat expects the **exact Product IDs** from App Store Connect. Any mismatch causes the "no offerings available" error you're seeing.

**Next Step**: Please share the exact Product IDs from both sections of App Store Connect so I can configure everything correctly!
