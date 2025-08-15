#!/usr/bin/env npx tsx

/**
 * Standalone migration script for featureUsage collection
 * 
 * This script initializes Firebase with environment variables and migrates
 * featureUsage data from top-level collection to subcollection
 */

import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

interface FeatureUsage {
  aiQueriesThisMonth: number;
  lastAiQueryReset: string;
  customWorkoutsCreated: number;
  updatedAt: string;
}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

async function migrateFeatureUsageStandalone() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const deleteOld = args.includes('--delete-old');
  
  console.log('🚀 Starting featureUsage migration...');
  console.log(`📋 Mode: ${isDryRun ? 'DRY RUN' : 'MIGRATION'}`);
  console.log(`🗑️  Delete old documents: ${deleteOld ? 'YES' : 'NO'}`);
  console.log('');

  // Validate Firebase config
  const missingVars = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('❌ Missing Firebase environment variables:');
    missingVars.forEach(varName => console.error(`   - EXPO_PUBLIC_${varName.toUpperCase()}`));
    console.error('\nPlease set these environment variables and try again.');
    process.exit(1);
  }

  try {
    // Initialize Firebase
    console.log('🔥 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
    console.log('');

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
      console.log('   - Update useFeatureGating hook to use subcollection path ✅ (already done)');
      console.log('   - Update Firestore security rules ✅ (already done)');
      console.log('   - Remove explicit featureUsage deletion from cacheManager.ts ✅ (already done)');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateFeatureUsageStandalone().catch(console.error);
}

export { migrateFeatureUsageStandalone };
