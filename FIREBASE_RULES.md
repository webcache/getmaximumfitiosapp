# Firebase Firestore Security Rules

## Overview
This project includes Firestore security rules that allow users to:
- Read and write their own profile data
- Read and write their own workouts
- Read and write their own favorite exercises

## Deploying Rules

### Option 1: Using Firebase CLI (Recommended)

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option 2: Using Firebase Console

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database
4. Go to the "Rules" tab
5. Copy and paste the contents of `firestore.rules` into the rules editor
6. Click "Publish"

## Rules Explanation

The security rules ensure that:
- Only authenticated users can access data
- Users can only access their own data (based on their `userId`)
- Each user has access to:
  - `/profiles/{userId}` - their profile data
  - `/profiles/{userId}/workouts/{workoutId}` - their workouts
  - `/profiles/{userId}/favoriteExercises/{favoriteId}` - their favorite exercises

## Testing Rules

You can test the rules using the Firebase Console's Rules Playground or by setting up unit tests with the Firebase Rules Test SDK.
