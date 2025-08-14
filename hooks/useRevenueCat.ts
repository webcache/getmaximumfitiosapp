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
      // Handle empty or undefined API keys more gracefully
      if (!apiKey || apiKey.trim() === '') {
        if (__DEV__) {
          console.log('🔧 Development: No RevenueCat API key provided, running in offline mode');
          setError(null); // Don't show error in dev mode
        } else {
          setError('RevenueCat API key is required');
        }
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Configure RevenueCat
        await revenueCat.configure(apiKey, userId);
        setIsConfigured(true);

        // Get initial data in sequence to avoid race conditions
        await refreshCustomerInfo();
        await loadOfferings();
      } catch (err: any) {
        console.error('Failed to initialize RevenueCat:', err);
        if (__DEV__) {
          console.log('🔧 Development: RevenueCat initialization failed, continuing without subscription features');
          setError(null); // Don't show error in dev mode
        } else {
          setError(err.message || 'Failed to initialize RevenueCat');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeRevenueCat();
  }, [apiKey, userId]);

  const refreshCustomerInfo = useCallback(async () => {
    if (!isConfigured) {
      if (__DEV__) {
        console.log('🔧 Development: RevenueCat not configured, skipping customer info fetch');
      }
      return;
    }

    try {
      const info = await revenueCat.getCustomerInfo();
      setCustomerInfo(info);
    } catch (err: any) {
      console.error('Failed to get customer info:', err);
      if (__DEV__) {
        console.log('🔧 Development: Customer info fetch failed, continuing without customer data');
        setCustomerInfo(null);
      } else {
        setError(err.message || 'Failed to get customer info');
      }
    }
  }, [revenueCat, isConfigured]);

  const loadOfferings = useCallback(async () => {
    if (!isConfigured) {
      if (__DEV__) {
        console.log('🔧 Development: RevenueCat not configured, skipping offerings fetch');
        setError('Development mode - no offerings available');
      }
      return;
    }

    try {
      const [allOfferings, current] = await Promise.all([
        revenueCat.getOfferings(),
        revenueCat.getCurrentOffering()
      ]);
      setOfferings(allOfferings);
      setCurrentOffering(current);
      
      // Clear any previous errors if offerings load successfully
      if (allOfferings.length > 0 || current) {
        setError(null);
      } else if (__DEV__) {
        // In development, this is normal
        console.log('ℹ️ No offerings available - this is normal during development');
        setError('No products configured - development mode');
      }
    } catch (err: any) {
      console.error('❌ Failed to load offerings:', err);
      
      if (__DEV__) {
        // In development, don't treat missing offerings as a critical error
        console.log('🔧 Development: Continuing without offerings (subscription features disabled)');
        setError('Development mode - no offerings available');
        setOfferings([]);
        setCurrentOffering(null);
      } else {
        setError(err.message || 'Failed to load offerings');
      }
    }
  }, [revenueCat, isConfigured]);

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
