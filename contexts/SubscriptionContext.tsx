import { createContext, ReactNode, useContext } from 'react';
import { CustomerInfo } from 'react-native-purchases';
import { useRevenueCat } from '../hooks/useRevenueCat';

interface SubscriptionContextType {
  customerInfo: CustomerInfo | null;
  hasActiveSubscription: boolean;
  hasEntitlement: (entitlementId: string) => boolean;
  isLoading: boolean;
  refreshCustomerInfo: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
  apiKey: string;
  userId?: string;
}

export function SubscriptionProvider({ children, apiKey, userId }: SubscriptionProviderProps) {
  const {
    customerInfo,
    hasActiveSubscription,
    isLoading,
    refreshCustomerInfo
  } = useRevenueCat(apiKey, userId);

  const hasEntitlement = (entitlementId: string): boolean => {
    if (!customerInfo) return false;
    return customerInfo.entitlements.active[entitlementId] !== undefined;
  };

  const value: SubscriptionContextType = {
    customerInfo,
    hasActiveSubscription,
    hasEntitlement,
    isLoading,
    refreshCustomerInfo
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

export default SubscriptionProvider;
