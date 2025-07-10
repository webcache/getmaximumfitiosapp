# Firestore Exercise Database

This document explains how to set up and use the Firestore exercise database for the MaximumFit app.

## Overview

The app now supports storing and querying exercise data in Firebase Firestore for better performance, offline support, and advanced querying capabilities.

## Architecture

### Data Flow
1. **API Data Source** → External exercise API (https://raw.githubusercontent.com/exercemus/exercises/minified/minified-exercises.json)
2. **Migration Script** → Processes and uploads data to Firestore
3. **Firestore Service** → Provides querying and filtering capabilities
4. **App Components** → Use Firestore service for exercise data

### Collections

#### `exercises` Collection
Stores individual exercise documents with the following structure:

```typescript
{
  id: string;                    // Unique exercise ID
  name: string;                  // Exercise name
  category: string;              // Exercise category (strength, cardio, etc.)
  primary_muscles: string[];     // Primary muscles worked
  secondary_muscles: string[];   // Secondary muscles worked
  all_muscles: string[];         // Combined primary + secondary muscles
  equipment: string[];           // Required equipment
  instructions: string[];        // Step-by-step instructions
  description?: string;          // Exercise description
  tips?: string[];              // Exercise tips
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  level: string;                // Original difficulty level
  force?: string;               // Force type (push, pull, static)
  mechanic?: string;            // Movement mechanic
  searchKeywords: string[];     // For text search optimization
  createdAt: Date;              // Document creation date
  updatedAt: Date;              // Last update date
}
```

#### `exercise_metadata` Collection
Stores aggregated metadata for quick access:

```typescript
{
  totalExercises: number;       // Total count of exercises
  categories: string[];         // All available categories
  equipment: string[];          // All equipment types
  muscles: string[];            // All muscle groups
  levels: string[];             // All difficulty levels
  difficulties: string[];       // All difficulty categories
  lastUpdated: Date;            // Last data update
  version: string;              // Data version
  dataSource: string;           // Original data source URL
}
```

## Setup Instructions

### 1. Prerequisites
- Firebase project set up with Firestore enabled
- Environment variables configured in `.env`:
  ```
  EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
  EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
  EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
  ```

### 2. Firestore Security Rules
Add these security rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read access to exercises
    match /exercises/{exerciseId} {
      allow read: if true;
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Allow public read access to metadata
    match /exercise_metadata/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 3. Run the Migration
Execute the migration script to populate Firestore with exercise data:

```bash
npm run migrate-exercises
```

Or run directly:
```bash
node scripts/runMigration.js
```

The migration will:
1. Fetch data from the external API
2. Process and enhance the data (add search keywords, normalize equipment, etc.)
3. Clear existing Firestore data
4. Upload exercises in batches
5. Create metadata document

## Usage

### Basic Usage

```typescript
import { firestoreExerciseService } from '@/services/FirestoreExerciseService';

// Search exercises
const results = await firestoreExerciseService.searchExercises({
  category: 'strength',
  equipment: ['barbell'],
  searchTerm: 'squat',
  pageSize: 20
});

// Get exercise by ID
const exercise = await firestoreExerciseService.getExerciseById('exercise_123');

// Get categories
const categories = await firestoreExerciseService.getCategories();
```

### Advanced Filtering

```typescript
// Complex search with multiple filters
const results = await firestoreExerciseService.searchExercises({
  category: 'strength',
  primaryMuscle: 'quadriceps',
  equipment: ['barbell', 'dumbbell'],
  difficulty: 'Intermediate',
  searchTerm: 'squat',
  sortBy: 'name',
  sortDirection: 'asc',
  pageSize: 10
});
```

### Pagination

```typescript
let lastDoc = null;
const allExercises = [];

do {
  const results = await firestoreExerciseService.searchExercises({
    category: 'strength',
    pageSize: 20,
    lastDoc: lastDoc
  });
  
  allExercises.push(...results.data);
  lastDoc = results.lastDoc;
} while (results.hasMore);
```

## Integration with ExerciseBrowser

The existing `ExerciseBrowser` component automatically uses Firestore when available:

1. **Initialization**: Checks if Firestore has exercise data
2. **Fallback**: Falls back to API if Firestore is empty
3. **Local Data**: Uses local sample data if both fail

### Updated ExerciseLibrary

The `utils/exerciseLibrary.ts` now:
- Checks Firestore first for exercise data
- Maintains backward compatibility
- Automatically falls back to previous data sources

## Benefits

### Performance
- **Faster queries**: Firestore indexing provides fast filtered searches
- **Pagination**: Efficient loading of large datasets
- **Caching**: Firestore automatically caches data locally

### Features
- **Offline support**: Cached data works offline
- **Real-time updates**: Data updates propagate to all clients
- **Advanced querying**: Complex filters, sorting, and text search

### Scalability
- **No API limits**: Reduces dependency on external API
- **Custom data**: Can add custom exercises and modifications
- **User data**: Can link user-specific exercise data (favorites, custom routines)

## Data Management

### Adding New Exercises
```typescript
// Manual addition (requires authentication)
const newExercise = {
  name: 'Custom Exercise',
  category: 'strength',
  // ... other fields
};
// Add through Firebase Admin SDK or authenticated user
```

### Updating Exercise Data
Re-run the migration script to update all exercises:
```bash
npm run migrate-exercises
```

### Monitoring
Check Firestore console for:
- Document counts
- Query performance
- Storage usage
- Security rule violations

## Troubleshooting

### Common Issues

1. **Migration fails**: Check environment variables and Firebase permissions
2. **Empty results**: Verify Firestore security rules allow public read access
3. **Slow queries**: Ensure proper indexing (Firestore will suggest composite indexes)
4. **Network errors**: App falls back to local data automatically

### Debug Mode
Enable debug logging:
```typescript
// In your app initialization
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// Enable/disable network for testing
await disableNetwork(db); // Test offline mode
await enableNetwork(db);  // Re-enable network
```

## Future Enhancements

### User Features
- Custom exercise creation
- Exercise favorites
- Personal workout routines
- Exercise progress tracking

### Data Features
- Exercise ratings and reviews
- Exercise videos and images
- Equipment substitutions
- Related exercise suggestions

### Performance
- Incremental data updates
- Image optimization
- Search result caching
- Predictive loading
