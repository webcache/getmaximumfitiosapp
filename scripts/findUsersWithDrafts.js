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

async function findUsersWithDrafts() {
  try {
    console.log('🔍 Searching for users with workout drafts...');
    
    // Get all profiles
    const profilesSnapshot = await db.collection('profiles').get();
    
    const usersWithDrafts = [];
    
    for (const profileDoc of profilesSnapshot.docs) {
      const userId = profileDoc.id;
      
      // Check if this user has workout drafts
      const draftsRef = db.collection('profiles').doc(userId).collection('workoutDrafts');
      const draftsSnapshot = await draftsRef.get();
      
      if (!draftsSnapshot.empty) {
        const drafts = [];
        draftsSnapshot.forEach(doc => {
          const data = doc.data();
          drafts.push({
            id: doc.id,
            title: data.title || 'Untitled',
            date: data.date,
            exerciseCount: data.exercises ? data.exercises.length : 0
          });
        });
        
        usersWithDrafts.push({
          userId,
          draftCount: draftsSnapshot.size,
          drafts
        });
      }
    }
    
    if (usersWithDrafts.length === 0) {
      console.log('ℹ️  No users found with workout drafts');
      return;
    }
    
    console.log(`\n📋 Found ${usersWithDrafts.length} user(s) with workout drafts:\n`);
    
    usersWithDrafts.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.userId}`);
      console.log(`   Draft count: ${user.draftCount}`);
      user.drafts.forEach((draft, draftIndex) => {
        console.log(`   ${draftIndex + 1}. "${draft.title}" (${draft.exerciseCount} exercises) - ${draft.date}`);
      });
      console.log('');
    });
    
    console.log('💡 To migrate drafts for a specific user, run:');
    console.log(`   node migrateDraftsToWorkouts.js <userId>`);
    
  } catch (error) {
    console.error('❌ Error finding users with drafts:', error);
    throw error;
  }
}

// Run the search
findUsersWithDrafts()
  .then(() => {
    console.log('🏁 Search completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Search failed:', error);
    process.exit(1);
  });
