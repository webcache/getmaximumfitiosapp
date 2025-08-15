# FeatureUsage Collection Migration

## Overview
This migration moves the `featureUsage` collection from a top-level collection to a subcollection under user profiles for better data organization and GDPR compliance.

## Migration Details

### Before (Top-level Collection)
```
featureUsage/
  {userId}/
    aiQueriesThisMonth: number
    lastAiQueryReset: string
    customWorkoutsCreated: number
    updatedAt: string
```

### After (Subcollection)
```
profiles/
  {userId}/
    featureUsage/
      default/
        aiQueriesThisMonth: number
        lastAiQueryReset: string
        customWorkoutsCreated: number
        updatedAt: string
        migratedAt: string (added during migration)
        migratedFrom: "featureUsage" (added during migration)
```

## Benefits

1. **Better Data Organization**: All user data is now consistently organized under `profiles/{userId}`
2. **Simplified GDPR Compliance**: Feature usage data is automatically included in user profile deletion
3. **Consistent Security Rules**: Uses the same subcollection pattern as other user data
4. **Cleaner Architecture**: Follows Firebase best practices for user-scoped data

## Migration Process

### 1. Run Migration Script

```bash
# Preview migration without changes
./scripts/migrate-feature-usage.sh
# Choose option 1 for dry run

# Run migration (keeping old data for safety)
./scripts/migrate-feature-usage.sh
# Choose option 2

# Full migration with cleanup (only after verification)
./scripts/migrate-feature-usage.sh
# Choose option 3
```

### 2. Manual Migration (Alternative)

```bash
# Dry run to preview changes
npx tsx scripts/migrateFeatureUsage.ts --dry-run

# Migrate data
npx tsx scripts/migrateFeatureUsage.ts

# Migrate and delete old data (after verification)
npx tsx scripts/migrateFeatureUsage.ts --delete-old
```

## Changes Made

### 1. Updated `useFeatureGating` Hook
- Changed from `featureUsage/{userId}` to `profiles/{userId}/featureUsage/default`
- Updated both `loadUsageData()` and `saveUsageData()` functions

### 2. Updated Firestore Security Rules
- Removed top-level `featureUsage/{userId}` rule
- Added subcollection rule under `profiles/{userId}/featureUsage/{usageId}`

### 3. Updated Cache Manager
- Removed explicit `featureUsage` deletion (now handled automatically)
- Added `featureUsage` to subcollections export list
- Updated comments to reflect new architecture

## Verification Steps

1. **Test Feature Usage**: Ensure AI query limits and custom workout limits still work
2. **Check Firebase Console**: Verify data exists in new subcollection path
3. **Test GDPR Deletion**: Ensure feature usage data is deleted with user account
4. **Monitor Logs**: Check for any errors related to feature usage tracking

## Rollback Plan (If Needed)

If issues occur, you can temporarily rollback by:

1. Reverting the `useFeatureGating` hook changes
2. Reverting the Firestore security rules
3. Re-adding explicit deletion in `cacheManager.ts`

The old data will still exist unless you used the `--delete-old` flag.

## Security Rule Changes

### Old Rule (Removed)
```javascript
// 📊 Feature usage tracking (root collection for performance)
match /featureUsage/{userId} {
  allow read, write: if isOwner(userId);
}
```

### New Rule (Added)
```javascript
// Within profiles/{userId} context:
// 📊 Feature usage tracking (subcollection for better organization)
match /featureUsage/{usageId} {
  allow read, write: if isOwner(userId);
}
```

## Important Notes

- The migration preserves all existing data
- Adds `migratedAt` and `migratedFrom` fields to track migration
- Uses document ID `default` for consistency
- Backward compatibility is not maintained - old app versions will not work after rule changes
- Always test in a development environment first

## Troubleshooting

### Migration Script Fails
- Check Firebase configuration
- Ensure proper permissions
- Verify network connectivity

### App Shows Feature Limits Incorrectly
- Check that new subcollection data exists
- Verify security rules are deployed
- Check app logs for Firestore errors

### Data Not Found After Migration
- Confirm migration completed successfully
- Check Firebase Console for data location
- Verify document ID is `default`
