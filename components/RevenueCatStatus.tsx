import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { getRevenueCatApiKey } from '../config/revenuecat';
import { useRevenueCat } from '../hooks/useRevenueCat';

interface RevenueCatStatusProps {
  showDetails?: boolean;
}

export function RevenueCatStatus({ showDetails = false }: RevenueCatStatusProps) {
  const { 
    isConfigured, 
    isLoading, 
    error, 
    currentOffering, 
    offerings,
    hasActiveSubscription 
  } = useRevenueCat(getRevenueCatApiKey());

  if (!__DEV__ || !showDetails) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="information-circle" size={16} color="#007AFF" />
        <Text style={styles.title}>RevenueCat Status (Dev Only)</Text>
      </View>
      
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Configured:</Text>
          <View style={[styles.indicator, { backgroundColor: isConfigured ? '#4CAF50' : '#FF5722' }]} />
          <Text style={styles.statusValue}>{isConfigured ? 'Yes' : 'No'}</Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Loading:</Text>
          <View style={[styles.indicator, { backgroundColor: isLoading ? '#FF9500' : '#4CAF50' }]} />
          <Text style={styles.statusValue}>{isLoading ? 'Yes' : 'No'}</Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Has Offering:</Text>
          <View style={[styles.indicator, { backgroundColor: currentOffering ? '#4CAF50' : '#FF5722' }]} />
          <Text style={styles.statusValue}>{currentOffering ? 'Yes' : 'No'}</Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Offerings Count:</Text>
          <Text style={styles.statusValue}>{offerings?.length || 0}</Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Active Sub:</Text>
          <View style={[styles.indicator, { backgroundColor: hasActiveSubscription ? '#4CAF50' : '#999' }]} />
          <Text style={styles.statusValue}>{hasActiveSubscription ? 'Yes' : 'No'}</Text>
        </View>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorLabel}>Error:</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {currentOffering && (
        <View style={styles.offeringContainer}>
          <Text style={styles.offeringLabel}>Available Packages:</Text>
          {currentOffering.availablePackages.map((pkg, index) => (
            <Text key={index} style={styles.packageText}>
              • {pkg.product.identifier} - {pkg.product.priceString}
            </Text>
          ))}
        </View>
      )}
      
      <View style={styles.expectedContainer}>
        <Text style={styles.expectedLabel}>Expected Product IDs (from RevenueCat):</Text>
        <Text style={styles.expectedText}>• pro (Monthly)</Text>
        <Text style={styles.expectedText}>• proannual (Annual)</Text>
        <Text style={styles.expectedText}>• lifetime (Lifetime)</Text>
        <Text style={styles.expectedText}>• proupgrade (Custom)</Text>
      </View>
      
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          💡 If "Has Offering" is No, check the StoreKit configuration setup guide in docs/
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  errorContainer: {
    backgroundColor: '#fff5f5',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e53e3e',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#e53e3e',
    lineHeight: 16,
  },
  offeringContainer: {
    backgroundColor: '#f0fff4',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#c6f6d5',
  },
  offeringLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22543d',
    marginBottom: 4,
  },
  packageText: {
    fontSize: 11,
    color: '#22543d',
    lineHeight: 16,
  },
  expectedContainer: {
    backgroundColor: '#fff9e6',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  expectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#744210',
    marginBottom: 4,
  },
  expectedText: {
    fontSize: 11,
    color: '#744210',
    lineHeight: 16,
  },
  helpContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  helpText: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
