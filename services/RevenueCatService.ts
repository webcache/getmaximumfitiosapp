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
        console.log('RevenueCat already configured');
        return;
      }

      // Configure RevenueCat
      await Purchases.configure({
        apiKey,
        appUserID: userId || undefined,
      });

      // Set log level for debugging (remove in production)
      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      this.isConfigured = true;
      console.log('RevenueCat configured successfully');
    } catch (error) {
      console.error('Error configuring RevenueCat:', error);
      throw error;
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
      return Object.values(offerings.all);
    } catch (error) {
      console.error('Error getting offerings:', error);
      throw error;
    }
  }

  async getCurrentOffering(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Error getting current offering:', error);
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
