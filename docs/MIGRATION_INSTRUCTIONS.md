# FeatureUsage Migration Instructions

## Current Status
✅ **Code Updated**: All application code has been updated to use the new subcollection structure:
- `useFeatureGating` hook now uses `profiles/{userId}/featureUsage/default`
- Firestore security rules updated with subcollection support  
- Cache manager updated to handle subcollection automatically
- Migration scripts created

## Migration Steps

### Option 1: Deploy and Let App Migrate Automatically (Recommended)

The easiest approach is to let the app migrate the data automatically:

1. **Deploy the updated Firestore rules** (temporarily includes both old and new paths)
2. **Test the app** - The new `useFeatureGating` hook will automatically:
   - Try to read from the new subcollection location
   - If not found, it will create a new document in the subcollection
   - This effectively migrates users as they use the app

3. **Monitor for a few days** to ensure all active users have migrated

4. **Remove the old rule** from `firestore.rules` (the temporary top-level featureUsage rule)

### Option 2: Run Manual Migration (Advanced)

If you want to migrate all data at once:

1. **Deploy the Firestore rules** (with the temporary rule)
2. **Create a Firebase Admin Service Account** with appropriate permissions
3. **Update the migration script** to use Admin SDK instead of client SDK
4. **Run the migration script**

### Option 3: Firebase Console Manual Migration (Small Scale)

For small amounts of data:

1. **Export data** from Firebase Console (`featureUsage` collection)
2. **Import data** to the new subcollection paths manually
3. **Verify** and delete old data

## Current Firestore Rules Status

The rules file now includes:
- ✅ New subcollection rule: `profiles/{userId}/featureUsage/{usageId}`
- 🔄 Temporary old rule: `featureUsage/{userId}` (for migration)

**After migration is complete**, remove the temporary rule.

## Testing

1. **Test with a user account** that has existing feature usage data
2. **Verify** the data appears in the new subcollection location
3. **Check** that limits and tracking work correctly

## Notes

- The app will now create new feature usage documents in the subcollection
- Old documents remain until manually deleted
- GDPR deletion now automatically includes feature usage data
- No breaking changes for users

## Recommended Next Steps

1. **Deploy the current Firestore rules**
2. **Test the app** with existing users
3. **Monitor** for any issues
4. **Clean up** old data after confirmation
5. **Remove temporary rule** from firestore.rules
