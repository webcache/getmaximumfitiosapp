#!/bin/bash

# Migration script runner for featureUsage collection
# This script helps run the TypeScript migration safely

echo "🚀 FeatureUsage Migration Script"
echo "================================="
echo ""
echo "This will migrate featureUsage data from:"
echo "  FROM: featureUsage/{userId} (top-level collection)"
echo "  TO:   profiles/{userId}/featureUsage/default (subcollection)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if firebase config exists
if [ ! -f "firebase.ts" ]; then
    echo "❌ Error: Firebase configuration not found"
    exit 1
fi

echo "📋 Migration Options:"
echo "  1. Dry run (preview changes without making them)"
echo "  2. Migrate data (copy to new location)"
echo "  3. Migrate and delete old data (full migration)"
echo ""

read -p "Choose an option (1/2/3): " choice

case $choice in
    1)
        echo "🔍 Running dry run migration..."
        npx tsx scripts/migrateFeatureUsageStandalone.ts --dry-run
        ;;
    2)
        echo "📦 Running migration (keeping old data)..."
        npx tsx scripts/migrateFeatureUsageStandalone.ts
        ;;
    3)
        echo "⚠️  WARNING: This will delete old data after migration!"
        read -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            echo "🔄 Running full migration with cleanup..."
            npx tsx scripts/migrateFeatureUsageStandalone.ts --delete-old
        else
            echo "❌ Migration cancelled"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid option. Please choose 1, 2, or 3."
        exit 1
        ;;
esac

echo ""
echo "✅ Migration script completed!"
echo ""
echo "📋 Next steps after successful migration:"
echo "  1. Test your app to ensure featureUsage works correctly"
echo "  2. Verify the new subcollection structure in Firebase Console"
echo "  3. Monitor for any errors in the app logs"
echo "  4. Deploy the updated Firestore security rules"
echo ""
