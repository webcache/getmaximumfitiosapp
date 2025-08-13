import { ScrollView, StyleSheet, View } from 'react-native';
import {
    LockIcon,
    PRO_COLORS,
    ProBadge,
    ProFeatureCard,
    TierBadge,
    UpgradeButton
} from '../components/ProComponents';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';

/**
 * ProComponents Demo Screen
 * 
 * This screen demonstrates all the available PRO components and their variants.
 * Use this as a reference for implementing consistent PRO/upgrade styling throughout the app.
 */
export default function ProComponentsDemo() {
  const handleUpgrade = () => {
    console.log('Navigate to upgrade screen');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>PRO Badges</ThemedText>
        <ThemedText style={styles.description}>
          Use these for indicating PRO features
        </ThemedText>
        
        <View style={styles.row}>
          <ProBadge size="tiny" />
          <ProBadge size="small" />
          <ProBadge size="medium" />
          <ProBadge size="large" />
          <ProBadge size="xlarge" />
        </View>
        
        <View style={styles.row}>
          <ProBadge size="small" showIcon={false} />
          <ProBadge size="medium" text="PREMIUM" />
          <ProBadge size="small" onPress={handleUpgrade} />
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Upgrade Buttons</ThemedText>
        <ThemedText style={styles.description}>
          Use these for upgrade actions
        </ThemedText>
        
        <View style={styles.column}>
          <UpgradeButton 
            size="tiny" 
            text="Upgrade" 
            onPress={handleUpgrade} 
          />
          <UpgradeButton 
            size="small" 
            onPress={handleUpgrade} 
          />
          <UpgradeButton 
            size="medium" 
            onPress={handleUpgrade} 
          />
          <UpgradeButton 
            size="large" 
            onPress={handleUpgrade} 
          />
          <UpgradeButton 
            size="xlarge" 
            onPress={handleUpgrade} 
          />
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Button Variants</ThemedText>
        
        <View style={styles.column}>
          <UpgradeButton 
            variant="primary" 
            onPress={handleUpgrade} 
          />
          <UpgradeButton 
            variant="secondary" 
            onPress={handleUpgrade} 
          />
          <UpgradeButton 
            variant="minimal" 
            onPress={handleUpgrade} 
          />
          <UpgradeButton 
            variant="primary"
            showIcon={false}
            text="No Icon"
            onPress={handleUpgrade} 
          />
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Tier Badges</ThemedText>
        
        <View style={styles.row}>
          <TierBadge tier="free" size="small" />
          <TierBadge tier="pro" size="small" />
          <TierBadge tier="free" size="medium" />
          <TierBadge tier="pro" size="medium" />
          <TierBadge tier="pro" size="large" />
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Pro Feature Cards</ThemedText>
        
        <ProFeatureCard
          title="Custom Workouts"
          description="Create unlimited custom workout plans tailored to your fitness goals"
          isLocked={true}
          onUpgrade={handleUpgrade}
          size="medium"
        />
        
        <ProFeatureCard
          title="Advanced Analytics"
          description="Track detailed progress and performance metrics"
          isLocked={false}
          size="small"
        >
          <ThemedText style={styles.cardContent}>
            This feature is unlocked! ✅
          </ThemedText>
        </ProFeatureCard>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Usage Examples</ThemedText>
        
        {/* Example: Settings row with PRO badge */}
        <View style={styles.settingsRow}>
          <View style={styles.settingsLeft}>
            <ThemedText style={styles.settingsTitle}>Premium Analytics</ThemedText>
            <ProBadge size="tiny" />
          </View>
          <LockIcon size={16} />
        </View>
        
        {/* Example: Feature list item */}
        <View style={styles.featureItem}>
          <ThemedText style={styles.featureText}>Unlimited AI Queries</ThemedText>
          <ProBadge size="small" />
        </View>
        
        {/* Example: Upgrade prompt */}
        <View style={styles.upgradePrompt}>
          <ThemedText style={styles.promptTitle}>Unlock Premium Features</ThemedText>
          <ThemedText style={styles.promptText}>
            Get access to unlimited workouts, advanced analytics, and more!
          </ThemedText>
          <UpgradeButton 
            size="large"
            variant="primary"
            onPress={handleUpgrade}
          />
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Color Reference</ThemedText>
        <ThemedText style={styles.description}>
          Use PRO_COLORS from ProComponents for consistent styling
        </ThemedText>
        
        <View style={styles.colorGrid}>
          <View style={[styles.colorSwatch, { backgroundColor: PRO_COLORS.background }]}>
            <ThemedText style={[styles.colorText, { color: 'white' }]}>
              Background
            </ThemedText>
          </View>
          <View style={[styles.colorSwatch, { backgroundColor: PRO_COLORS.gold }]}>
            <ThemedText style={[styles.colorText, { color: 'black' }]}>
              Gold
            </ThemedText>
          </View>
          <View style={[styles.colorSwatch, { backgroundColor: PRO_COLORS.upgradeBackground }]}>
            <ThemedText style={[styles.colorText, { color: 'white' }]}>
              Primary
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  column: {
    gap: 12,
    marginBottom: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  featureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
  },
  upgradePrompt: {
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  promptText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  cardContent: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  colorSwatch: {
    flex: 1,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
