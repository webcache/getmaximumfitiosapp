import Purchases, {
    CustomerInfo,
    LOG_LEVEL,
    PurchasesOffering,
    PurchasesPackage
} from 'react-native-purchases';

class RevenueCatService {
  private static instance: RevenueCatService;
  private isConfigured = false;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async configure(apiKey: string, userId?: string): Promise<void> {
    try {
      if (this.isConfigured) {
        console.log('✅ RevenueCat already configured, skipping...');
        return;
      }

      if (!apiKey || apiKey.includes('XXXXXXXXXXXXXXXX')) {
        if (__DEV__) {
          console.warn('⚠️ RevenueCat API key not properly configured - continuing in development mode');
          this.isConfigured = true; // Mark as configured to prevent repeated attempts
          return;
        }
        throw new Error('RevenueCat API key is required');
      }

      console.log('🏪 Configuring RevenueCat with v2 API...');

      // Configure RevenueCat with v2 API key
      await Purchases.configure({
        apiKey,
        appUserID: userId || undefined,
      });

      // Set appropriate log level based on environment
      if (__DEV__) {
        // In development, use ERROR level to minimize noise
        await Purchases.setLogLevel(LOG_LEVEL.ERROR);
        console.log('🏪 RevenueCat configured for development with v2 API');
        console.log('ℹ️  Product warnings during development are normal and can be ignored');
        console.log('📚 Products will work once configured in App Store Connect');
      } else {
        // In production, use ERROR level to only show critical issues
        await Purchases.setLogLevel(LOG_LEVEL.ERROR);
      }

      this.isConfigured = true;
      console.log('✅ RevenueCat v2 configured successfully');
    } catch (error) {
      console.error('❌ Error configuring RevenueCat:', error);
      // Don't throw in development to prevent app crashes
      if (__DEV__) {
        console.warn('🔧 Continuing in development mode with limited functionality');
        this.isConfigured = false;
      } else {
        throw error;
      }
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('Error getting customer info:', error);
      throw error;
    }
  }

  async getOfferings(): Promise<PurchasesOffering[]> {
    try {
      const offerings = await Purchases.getOfferings();
      
      if (!offerings.current && Object.keys(offerings.all).length === 0) {
        console.warn('⚠️ No offerings found. This is normal during development if products aren\'t set up in App Store Connect.');
        if (__DEV__) {
          console.log('💡 Development Tip: Create a StoreKit Configuration file for local testing');
          console.log('💡 Or set up products in App Store Connect and RevenueCat dashboard');
        }
        return [];
      }
      
      return Object.values(offerings.all);
    } catch (error) {
      console.error('❌ Error getting offerings:', error);
      if (__DEV__) {
        console.log('🔧 Development workaround: Continuing without offerings...');
        return [];
      }
      throw error;
    }
  }

  async getCurrentOffering(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      
      if (!offerings.current) {
        console.warn('⚠️ No current offering found. This is normal during development.');
        if (__DEV__) {
          console.log('💡 Development: App will work without offerings, subscription features disabled');
        }
        return null;
      }
      
      return offerings.current;
    } catch (error) {
      console.error('❌ Error getting current offering:', error);
      if (__DEV__) {
        console.log('🔧 Development workaround: Continuing without current offering...');
        return null;
      }
      throw error;
    }
  }

  async purchasePackage(packageToPurchase: PurchasesPackage): Promise<{
    customerInfo: CustomerInfo;
    productIdentifier: string;
  }> {
    try {
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(packageToPurchase);
      console.log('Purchase successful:', productIdentifier);
      return { customerInfo, productIdentifier };
    } catch (error: any) {
      console.error('Purchase error:', error);
      // Handle specific error cases based on error code
      if (error && typeof error === 'object' && 'code' in error) {
        switch (error.code) {
          case 'userCancelledError':
            console.log('User cancelled the purchase');
            break;
          case 'paymentPendingError':
            console.log('Payment is pending');
            break;
          case 'receiptAlreadyInUseError':
            console.log('Receipt already in use');
            break;
          default:
            console.log('Unknown purchase error:', error.code);
        }
      }
      throw error;
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      console.log('Purchases restored successfully');
      return customerInfo;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }

  async setUserId(userId: string): Promise<void> {
    try {
      await Purchases.logIn(userId);
      console.log('User logged in successfully');
    } catch (error) {
      console.error('Error logging in user:', error);
      throw error;
    }
  }

  async logOut(): Promise<void> {
    try {
      await Purchases.logOut();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error logging out user:', error);
      throw error;
    }
  }

  // Check if user has active subscription
  hasActiveSubscription(customerInfo: CustomerInfo): boolean {
    return Object.keys(customerInfo.entitlements.active).length > 0;
  }

  // Check if user has specific entitlement
  hasEntitlement(customerInfo: CustomerInfo, entitlementId: string): boolean {
    return customerInfo.entitlements.active[entitlementId] !== undefined;
  }

  // Get active subscription product identifiers
  getActiveSubscriptions(customerInfo: CustomerInfo): string[] {
    return Object.keys(customerInfo.entitlements.active);
  }
}

export default RevenueCatService;
