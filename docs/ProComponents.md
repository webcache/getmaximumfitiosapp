# ProComponents System

A comprehensive, reusable component system for consistent PRO badges, upgrade buttons, and premium feature indicators throughout the GetMaximumFit app.

## Overview

The ProComponents system provides standardized components that ensure visual consistency across all PRO/premium features and upgrade flows in the app.

## Components

### 1. ProBadge

A small badge that indicates PRO features.

```tsx
import { ProBadge } from '../components/ProComponents';

// Basic usage
<ProBadge />

// With different sizes
<ProBadge size="tiny" />
<ProBadge size="small" />  // default
<ProBadge size="medium" />
<ProBadge size="large" />
<ProBadge size="xlarge" />

// Customization
<ProBadge text="PREMIUM" />
<ProBadge showIcon={false} />
<ProBadge onPress={() => navigateToUpgrade()} />
```

### 2. UpgradeButton

A call-to-action button for upgrade flows.

```tsx
import { UpgradeButton } from '../components/ProComponents';

// Basic usage
<UpgradeButton onPress={handleUpgrade} />

// With variants
<UpgradeButton variant="primary" onPress={handleUpgrade} />   // Blue background
<UpgradeButton variant="secondary" onPress={handleUpgrade} /> // Outlined
<UpgradeButton variant="minimal" onPress={handleUpgrade} />   // Text only

// Different sizes
<UpgradeButton size="small" onPress={handleUpgrade} />
<UpgradeButton size="large" onPress={handleUpgrade} />

// Customization
<UpgradeButton 
  text="Get Premium Now"
  showIcon={false}
  disabled={isLoading}
  onPress={handleUpgrade}
/>
```

### 3. TierBadge

Shows the user's current subscription tier.

```tsx
import { TierBadge } from '../components/ProComponents';

<TierBadge tier="free" />
<TierBadge tier="pro" />
<TierBadge tier="pro" size="large" />
```

### 4. ProFeatureCard

A complete card component for PRO features with optional upgrade button.

```tsx
import { ProFeatureCard } from '../components/ProComponents';

<ProFeatureCard
  title="Custom Workouts"
  description="Create unlimited workout plans"
  isLocked={!hasFeature('customWorkouts')}
  onUpgrade={() => router.push('/premiumUpgrade')}
  size="medium"
>
  {/* Optional children content */}
  <CustomWorkoutPreview />
</ProFeatureCard>
```

### 5. LockIcon

A consistent lock icon for locked features.

```tsx
import { LockIcon } from '../components/ProComponents';

<LockIcon />
<LockIcon size={20} color="#999" />
```

## Size Options

All components support consistent sizing:

- `tiny`: Very small, for inline usage
- `small`: Default size, good for most cases
- `medium`: Slightly larger, for emphasis
- `large`: Prominent placement
- `xlarge`: Hero sections, main CTAs

## Color System

Use the exported `PRO_COLORS` for custom styling:

```tsx
import { PRO_COLORS } from '../components/ProComponents';

const customStyle = {
  backgroundColor: PRO_COLORS.background,  // #1a1a1a
  color: PRO_COLORS.gold,                  // #FFD700
  borderColor: PRO_COLORS.upgradeBackground, // #007AFF
};
```

## Usage Guidelines

### 1. PRO Badges
- Use `ProBadge` next to feature names that require PRO
- Place in headers, settings rows, or feature lists
- Keep `size="small"` for most cases unless emphasis is needed

### 2. Upgrade Buttons
- Use `UpgradeButton` for all upgrade call-to-actions
- `variant="primary"` for main upgrade flows
- `variant="secondary"` for alternative upgrade options
- `variant="minimal"` for subtle upgrade hints

### 3. Feature Gating
- Use `ProFeatureCard` for complete feature sections
- Combine `ProBadge` + `LockIcon` for simple locked features
- Use `TierBadge` to show current subscription status

### 4. Consistency Rules
- Always use ProComponents instead of custom PRO styling
- Maintain the same upgrade navigation: `router.push('/premiumUpgrade')`
- Use consistent text: "Upgrade to Pro", "PRO", "Premium"

## Migration Guide

### Replace Custom PRO Badges

**Before:**
```tsx
<View style={styles.proBadge}>
  <FontAwesome5 name="star" size={12} color="#FFD700" />
  <Text style={styles.proText}>PRO</Text>
</View>
```

**After:**
```tsx
<ProBadge size="small" />
```

### Replace Custom Upgrade Buttons

**Before:**
```tsx
<TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
  <Text style={styles.upgradeText}>Upgrade to Pro</Text>
  <FontAwesome5 name="arrow-right" size={14} />
</TouchableOpacity>
```

**After:**
```tsx
<UpgradeButton onPress={handleUpgrade} />
```

### Replace Custom Tier Indicators

**Before:**
```tsx
<View style={[styles.tierBadge, { backgroundColor: isPro ? '#4CAF50' : '#FF9500' }]}>
  <FontAwesome5 name={isPro ? 'crown' : 'user'} />
  <Text>{isPro ? 'Pro' : 'Free'}</Text>
</View>
```

**After:**
```tsx
<TierBadge tier={isPro ? 'pro' : 'free'} />
```

## Examples

See `app/proComponentsDemo.tsx` for complete examples of all components and their variants.

## Testing

To test the new components:

1. Navigate to `/proComponentsDemo` in your app
2. View all component variants and sizes
3. Test interaction behaviors
4. Verify consistent styling across different screen sizes

## Color Palette

- **PRO Background**: `#1a1a1a` (Dark)
- **PRO Text/Gold**: `#FFD700` (Gold)
- **Primary Button**: `#007AFF` (Blue)
- **Success/Pro Tier**: `#4CAF50` (Green)
- **Warning/Free Tier**: `#FF9500` (Orange)
- **White Text**: `#FFFFFF`

This system ensures that all PRO features and upgrade flows maintain a consistent, professional appearance throughout the app.
