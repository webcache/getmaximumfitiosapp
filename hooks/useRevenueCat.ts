import { useCallback, useEffect, useState } from 'react';
import { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import RevenueCatService from '../services/RevenueCatService';

interface UseRevenueCatReturn {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering[];
  currentOffering: PurchasesOffering | null;
  isLoading: boolean;
  hasActiveSubscription: boolean;
  isConfigured: boolean;
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  error: string | null;
}

export function useRevenueCat(apiKey?: string, userId?: string): UseRevenueCatReturn {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revenueCat = RevenueCatService.getInstance();

  // Initialize RevenueCat
  useEffect(() => {
    const initializeRevenueCat = async () => {
      if (!apiKey) {
        setError('RevenueCat API key is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Configure RevenueCat
        await revenueCat.configure(apiKey, userId);
        setIsConfigured(true);

        // Get initial data
        await Promise.all([
          refreshCustomerInfo(),
          loadOfferings()
        ]);
      } catch (err: any) {
        console.error('Failed to initialize RevenueCat:', err);
        setError(err.message || 'Failed to initialize RevenueCat');
      } finally {
        setIsLoading(false);
      }
    };

    initializeRevenueCat();
  }, [apiKey, userId]);

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const info = await revenueCat.getCustomerInfo();
      setCustomerInfo(info);
    } catch (err: any) {
      console.error('Failed to get customer info:', err);
      setError(err.message || 'Failed to get customer info');
    }
  }, [revenueCat]);

  const loadOfferings = useCallback(async () => {
    try {
      const [allOfferings, current] = await Promise.all([
        revenueCat.getOfferings(),
        revenueCat.getCurrentOffering()
      ]);
      setOfferings(allOfferings);
      setCurrentOffering(current);
    } catch (err: any) {
      console.error('Failed to load offerings:', err);
      setError(err.message || 'Failed to load offerings');
    }
  }, [revenueCat]);

  const purchasePackage = useCallback(async (packageToPurchase: PurchasesPackage) => {
    try {
      setError(null);
      const { customerInfo: updatedInfo } = await revenueCat.purchasePackage(packageToPurchase);
      setCustomerInfo(updatedInfo);
    } catch (err: any) {
      console.error('Purchase failed:', err);
      setError(err.message || 'Purchase failed');
      throw err;
    }
  }, [revenueCat]);

  const restorePurchases = useCallback(async () => {
    try {
      setError(null);
      const restoredInfo = await revenueCat.restorePurchases();
      setCustomerInfo(restoredInfo);
    } catch (err: any) {
      console.error('Restore purchases failed:', err);
      setError(err.message || 'Failed to restore purchases');
      throw err;
    }
  }, [revenueCat]);

  const hasActiveSubscription = customerInfo 
    ? revenueCat.hasActiveSubscription(customerInfo)
    : false;

  return {
    customerInfo,
    offerings,
    currentOffering,
    isLoading,
    hasActiveSubscription,
    isConfigured,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
    error
  };
}

export default useRevenueCat;
