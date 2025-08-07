// Simple script to migrate drafts to workouts using Firebase client SDK
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } = require('firebase/firestore');

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateDraftsToWorkouts(userId) {
  if (!userId) {
    console.error('❌ Error: User ID is required');
    console.log('📝 Usage: node scripts/migrateDraftsToWorkoutsSimple.js <userId>');
    process.exit(1);
  }
  
  try {
    console.log(`🚀 Starting migration for user: ${userId}\n`);
    
    // Get all workout drafts for this user
    const draftsSnapshot = await getDocs(collection(db, 'profiles', userId, 'workoutDrafts'));
    
    if (draftsSnapshot.empty) {
      console.log('✅ No workout drafts found for this user. Nothing to migrate.');
      return;
    }
    
    console.log(`📝 Found ${draftsSnapshot.size} draft(s) to migrate:\n`);
    
    let migratedCount = 0;
    let failedCount = 0;
    
    // Process each draft
    for (const draftDoc of draftsSnapshot.docs) {
      const draftData = draftDoc.data();
      const draftName = draftData.name || 'Unnamed Draft';
      
      try {
        console.log(`📦 Migrating draft: "${draftName}"...`);
        
        // Transform draft data to workout format
        const workoutData = {
          ...draftData,
          isCompleted: false,
          userId: userId,
          migratedFrom: 'workoutDraft',
          migratedAt: new Date(),
          originalDraftId: draftDoc.id
        };
        
        // Add to workouts collection
        const workoutRef = await addDoc(collection(db, 'workouts'), workoutData);
        console.log(`   ✅ Created workout with ID: ${workoutRef.id}`);
        
        // Delete the original draft
        await deleteDoc(doc(db, 'profiles', userId, 'workoutDrafts', draftDoc.id));
        console.log(`   🗑️  Deleted original draft: ${draftDoc.id}`);
        
        migratedCount++;
        console.log(`   ✅ Migration complete for "${draftName}"\n`);
        
      } catch (error) {
        console.error(`   ❌ Failed to migrate draft "${draftName}":`, error.message);
        failedCount++;
      }
    }
    
    // Summary
    console.log('📊 Migration Summary:');
    console.log(`   Successfully migrated: ${migratedCount} draft(s)`);
    console.log(`   Failed migrations: ${failedCount} draft(s)`);
    
    if (migratedCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('   Your workout drafts are now available as "Upcoming Workouts" in the app.');
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
migrateDraftsToWorkouts(userId);
