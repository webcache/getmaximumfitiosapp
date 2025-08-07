// Direct script to check current user's drafts and migrate them
// This script is designed to work with your existing Firebase client setup

const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } = require('firebase/firestore');
const { initializeApp } = require('firebase/app');

// You'll need to provide your Firebase config
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

console.log('Usage: node scripts/migrateUserDrafts.js <userEmail> <userPassword>');
console.log('This will sign in as the user and migrate their drafts to workouts\n');

const userEmail = process.argv[2];
const userPassword = process.argv[3];

if (!userEmail || !userPassword) {
  console.error('❌ Error: Email and password are required');
  console.log('📝 Usage: node scripts/migrateUserDrafts.js <email> <password>');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function migrateCurrentUserDrafts() {
  try {
    // Sign in the user
    console.log(`🔐 Signing in user: ${userEmail}...`);
    const userCredential = await signInWithEmailAndPassword(auth, userEmail, userPassword);
    const user = userCredential.user;
    console.log(`✅ Successfully signed in user: ${user.uid}\n`);
    
    // Check for workout drafts
    console.log('🔍 Checking for workout drafts...');
    const draftsRef = collection(db, 'profiles', user.uid, 'workoutDrafts');
    const draftsSnapshot = await getDocs(draftsRef);
    
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
      const draftName = draftData.name || draftData.title || 'Unnamed Draft';
      
      try {
        console.log(`📦 Migrating draft: "${draftName}"...`);
        
        // Transform draft data to workout format
        const workoutData = {
          ...draftData,
          isCompleted: false,
          userId: user.uid,
          migratedFrom: 'workoutDraft',
          migratedAt: new Date(),
          originalDraftId: draftDoc.id
        };
        
        // Add to workouts collection
        const workoutRef = await addDoc(collection(db, 'workouts'), workoutData);
        console.log(`   ✅ Created workout with ID: ${workoutRef.id}`);
        
        // Delete the original draft
        await deleteDoc(doc(db, 'profiles', user.uid, 'workoutDrafts', draftDoc.id));
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
    
    if (error.code === 'auth/user-not-found') {
      console.log('   User not found. Please check the email address.');
    } else if (error.code === 'auth/wrong-password') {
      console.log('   Incorrect password. Please check your password.');
    } else if (error.code === 'auth/invalid-email') {
      console.log('   Invalid email format.');
    }
  }
}

migrateCurrentUserDrafts();
