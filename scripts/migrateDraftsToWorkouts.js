const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../firebase-admin-key.json');
  
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://getmaximumfit-default-rtdb.firebaseio.com"
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    console.log('📝 Make sure firebase-admin-key.json exists in the root directory');
    process.exit(1);
  }
}

const db = admin.firestore();

async function migrateDraftsToWorkouts(userId) {
  if (!userId) {
    console.error('❌ Please provide a user ID');
    process.exit(1);
  }

  try {
    console.log(`🔄 Starting migration for user: ${userId}`);
    
    // Get all workout drafts for the user
    const draftsRef = db.collection('profiles').doc(userId).collection('workoutDrafts');
    const draftsSnapshot = await draftsRef.get();
    
    if (draftsSnapshot.empty) {
      console.log('ℹ️  No workout drafts found for this user');
      return;
    }
    
    console.log(`📋 Found ${draftsSnapshot.size} workout draft(s) to migrate`);
    
    // Get workouts collection reference
    const workoutsRef = db.collection('profiles').doc(userId).collection('workouts');
    
    // Process each draft
    const batch = db.batch();
    const migratedDrafts = [];
    
    for (const draftDoc of draftsSnapshot.docs) {
      const draftData = draftDoc.data();
      
      console.log(`📄 Processing draft: "${draftData.title || 'Untitled'}"`);
      
      // Transform draft data to workout format
      const workoutData = {
        title: draftData.title || 'Untitled Workout',
        date: draftData.date,
        exercises: draftData.exercises || [],
        notes: draftData.notes || '',
        duration: draftData.duration,
        isCompleted: false, // Mark as planned workout (not completed)
        createdAt: draftData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Add a flag to indicate this was migrated from a draft
        migratedFromDraft: true,
        originalDraftId: draftDoc.id
      };
      
      // Remove draft-specific fields
      delete workoutData.status;
      
      // Add to workouts collection
      const newWorkoutRef = workoutsRef.doc();
      batch.set(newWorkoutRef, workoutData);
      
      // Delete from drafts collection
      batch.delete(draftDoc.ref);
      
      migratedDrafts.push({
        originalId: draftDoc.id,
        newId: newWorkoutRef.id,
        title: workoutData.title,
        date: workoutData.date
      });
    }
    
    // Execute the batch operation
    await batch.commit();
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Migration Summary:');
    migratedDrafts.forEach((draft, index) => {
      console.log(`  ${index + 1}. "${draft.title}"`);
      console.log(`     Date: ${draft.date}`);
      console.log(`     Draft ID: ${draft.originalId} → Workout ID: ${draft.newId}`);
      console.log('');
    });
    
    console.log(`🎉 Successfully migrated ${migratedDrafts.length} workout draft(s) to planned workouts`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.log('📝 Usage: node migrateDraftsToWorkouts.js <userId>');
  console.log('   Example: node migrateDraftsToWorkouts.js abc123def456');
  process.exit(1);
}

// Run the migration
migrateDraftsToWorkouts(userId)
  .then(() => {
    console.log('🏁 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
