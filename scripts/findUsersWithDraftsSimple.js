// Simple script to find users with drafts using Firebase client SDK
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function findUsersWithDrafts() {
  try {
    console.log('🔍 Searching for users with workout drafts...\n');
    
    // Get all user profiles
    const profilesSnapshot = await getDocs(collection(db, 'profiles'));
    let usersWithDrafts = [];
    let totalUsers = 0;
    
    for (const profileDoc of profilesSnapshot.docs) {
      totalUsers++;
      const userId = profileDoc.id;
      
      try {
        // Check if this user has any workout drafts
        const draftsSnapshot = await getDocs(collection(db, 'profiles', userId, 'workoutDrafts'));
        
        if (!draftsSnapshot.empty) {
          const drafts = [];
          draftsSnapshot.forEach(draftDoc => {
            const draftData = draftDoc.data();
            drafts.push({
              id: draftDoc.id,
              name: draftData.name || 'Unnamed Draft',
              createdAt: draftData.createdAt ? new Date(draftData.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date',
              exercises: draftData.exercises ? draftData.exercises.length : 0
            });
          });
          
          usersWithDrafts.push({
            userId,
            email: profileDoc.data().email || 'Unknown email',
            draftsCount: drafts.length,
            drafts
          });
        }
      } catch (error) {
        console.warn(`⚠️  Could not check drafts for user ${userId}:`, error.message);
      }
    }
    
    // Display results
    console.log(`📊 Scan Results:`);
    console.log(`   Total users scanned: ${totalUsers}`);
    console.log(`   Users with drafts: ${usersWithDrafts.length}\n`);
    
    if (usersWithDrafts.length === 0) {
      console.log('✅ No users found with workout drafts. Migration not needed.');
      return;
    }
    
    // Show detailed results
    usersWithDrafts.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`);
      console.log(`   User ID: ${user.userId}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Drafts: ${user.draftsCount}`);
      
      user.drafts.forEach((draft, draftIndex) => {
        console.log(`   📝 Draft ${draftIndex + 1}: "${draft.name}" (${draft.exercises} exercises, created ${draft.createdAt})`);
      });
      console.log('');
    });
    
    // Show migration commands
    console.log('🚀 To migrate drafts, run:');
    usersWithDrafts.forEach(user => {
      console.log(`   node scripts/migrateDraftsToWorkouts.js ${user.userId}`);
    });
    
  } catch (error) {
    console.error('❌ Error searching for users with drafts:', error);
  }
}

// Run the search
findUsersWithDrafts();
