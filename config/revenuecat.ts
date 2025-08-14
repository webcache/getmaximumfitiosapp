// config/revenuecat.ts
export const REVENUECAT_CONFIG = {
  IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '',
  ANDROID_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || ''
};

export function getRevenueCatApiKey(): string {
  const key = REVENUECAT_CONFIG.IOS_API_KEY;
  if (!key || key.includes('XXXXXXXXXXXXXXXX') || key.trim() === '') {
    if (__DEV__) {
      console.warn('⚠️ RevenueCat API key not configured. Please set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY in your .env file');
      return ''; // Return empty string in development to prevent crashes
    } else {
      console.error('❌ RevenueCat API key not configured for production');
      return '';
    }
  }
  return key;
}

// Entitlements — use exactly the IDs you set in RevenueCat
export const ENTITLEMENTS = {
  PREMIUM: 'premium',
  // If you actually defined separate entitlements in RC, keep these.
  // Otherwise, prefer ONE entitlement like 'premium' and gate features app-side.
  ADVANCED_ANALYTICS: 'advanced_analytics',
  PERSONAL_TRAINER: 'personal_trainer',
  AD_FREE: 'ad_free',
} as const;

export type EntitlementId = typeof ENTITLEMENTS[keyof typeof ENTITLEMENTS];