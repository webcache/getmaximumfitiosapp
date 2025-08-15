#!/usr/bin/env npx tsx

/**
 * Migration script to move featureUsage from top-level collection to subcollection
 * 
 * Migration: featureUsage/{userId} → profiles/{userId}/featureUsage/default
 * 
 * This script:
 * 1. Reads all documents from the top-level featureUsage collection
 * 2. Migrates each document to the new subcollection path
 * 3. Verifies the migration was successful
 * 4. Optionally deletes the old documents (with confirmation)
 * 
 * Usage:
 *   npx tsx scripts/migrateFeatureUsage.ts
 *   npx tsx scripts/migrateFeatureUsage.ts --delete-old  # Also delete old documents
 *   npx tsx scripts/migrateFeatureUsage.ts --dry-run     # Preview migration without changes
 */

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface FeatureUsage {
  aiQueriesThisMonth: number;
  lastAiQueryReset: string;
  customWorkoutsCreated: number;
  updatedAt: string;
}

async function migrateFeatureUsage() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const deleteOld = args.includes('--delete-old');
  
  console.log('🚀 Starting featureUsage migration...');
  console.log(`📋 Mode: ${isDryRun ? 'DRY RUN' : 'MIGRATION'}`);
  console.log(`🗑️  Delete old documents: ${deleteOld ? 'YES' : 'NO'}`);
  console.log('');

  try {
    // Step 1: Get all documents from top-level featureUsage collection
    console.log('📊 Step 1: Reading top-level featureUsage collection...');
    const featureUsageRef = collection(db, 'featureUsage');
    const snapshot = await getDocs(featureUsageRef);
    
    if (snapshot.empty) {
      console.log('✅ No documents found in featureUsage collection. Migration not needed.');
      return;
    }
    
    console.log(`📄 Found ${snapshot.docs.length} documents to migrate`);
    console.log('');

    // Step 2: Migrate each document
    const migrationResults: { userId: string; status: 'success' | 'error' | 'skipped'; error?: string }[] = [];

    for (const docSnapshot of snapshot.docs) {
      const userId = docSnapshot.id;
      const data = docSnapshot.data() as FeatureUsage;
      
      console.log(`🔄 Migrating user: ${userId}`);
      
      try {
        // Check if target location already exists
        const newDocRef = doc(db, 'profiles', userId, 'featureUsage', 'default');
        const existingDoc = await getDoc(newDocRef);
        
        if (existingDoc.exists()) {
          console.log(`  ⚠️  Subcollection document already exists, skipping...`);
          migrationResults.push({ userId, status: 'skipped' });
          continue;
        }
        
        if (!isDryRun) {
          // Create the new document in the subcollection
          await setDoc(newDocRef, {
            ...data,
            migratedAt: new Date().toISOString(),
            migratedFrom: 'featureUsage'
          });
          
          console.log(`  ✅ Created: profiles/${userId}/featureUsage/default`);
        } else {
          console.log(`  📋 Would create: profiles/${userId}/featureUsage/default`);
        }
        
        migrationResults.push({ userId, status: 'success' });
        
      } catch (error) {
        console.error(`  ❌ Error migrating ${userId}:`, error);
        migrationResults.push({ 
          userId, 
          status: 'error', 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    console.log('');
    console.log('📊 Step 3: Migration Results Summary');
    console.log('=====================================');
    
    const successful = migrationResults.filter(r => r.status === 'success').length;
    const skipped = migrationResults.filter(r => r.status === 'skipped').length;
    const errors = migrationResults.filter(r => r.status === 'error').length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (errors > 0) {
      console.log('\n❌ Failed migrations:');
      migrationResults.filter(r => r.status === 'error').forEach(r => {
        console.log(`  - ${r.userId}: ${r.error}`);
      });
    }

    // Step 4: Optional cleanup of old documents
    if (deleteOld && !isDryRun && successful > 0) {
      console.log('\n🗑️  Step 4: Cleaning up old documents...');
      
      for (const result of migrationResults) {
        if (result.status === 'success') {
          try {
            const oldDocRef = doc(db, 'featureUsage', result.userId);
            await deleteDoc(oldDocRef);
            console.log(`  🗑️  Deleted: featureUsage/${result.userId}`);
          } catch (error) {
            console.error(`  ❌ Error deleting featureUsage/${result.userId}:`, error);
          }
        }
      }
    } else if (deleteOld && isDryRun) {
      console.log('\n📋 Would delete old documents (dry run mode)');
    } else if (!deleteOld) {
      console.log('\n⚠️  Old documents not deleted. Use --delete-old flag to remove them after verification.');
    }

    console.log('\n🎉 Migration completed!');
    
    if (!isDryRun) {
      console.log('\n⚠️  Important: After verifying the migration, update your application code to use the new paths.');
      console.log('   - Update useFeatureGating hook to use subcollection path');
      console.log('   - Update Firestore security rules');
      console.log('   - Remove explicit featureUsage deletion from cacheManager.ts');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateFeatureUsage().catch(console.error);
}

export { migrateFeatureUsage };
