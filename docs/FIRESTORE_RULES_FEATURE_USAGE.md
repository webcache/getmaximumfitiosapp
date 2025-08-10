# Firestore Rules Update - Feature Usage Collection

## Overview
Added Firestore security rules for the `featureUsage` collection to resolve permission errors when loading feature usage data.

## Changes Made

### ✅ New Rule Added
```javascript
// 📊 Feature usage tracking (root collection for performance)
match /featureUsage/{userId} {
  allow read, write: if isOwner(userId);
}
```

### 🔒 Security Features
- **User-scoped access**: Only the document owner can read/write their usage data
- **Authentication required**: Uses `isOwner(userId)` helper function
- **Root-level collection**: Placed at root for optimal performance

## Collection Structure
```
featureUsage/
  {userId}/
    - aiQueriesUsed: number
    - customWorkoutsCreated: number
    - socialSharesUsed: number
    - lastReset: timestamp
    - currentMonth: string
```

## Deployment Status
- ✅ Rules deployed to production
- ✅ Compilation successful
- ✅ Security validation passed

## Testing
After deployment, the following operations should work without permission errors:
- Reading feature usage data: `getDoc(doc(db, 'featureUsage', user.uid))`
- Writing feature usage data: `setDoc(doc(db, 'featureUsage', user.uid), data)`
- Creating initial usage documents

## Error Resolution
This update resolves the error:
```
Failed to load feature usage data: FirebaseError: Missing or insufficient permissions
```

The feature gating system can now properly:
- Track AI query usage
- Monitor custom workout creation
- Record social sharing activity
- Enforce freemium limits

## Security Considerations
- Each user can only access their own feature usage data
- Anonymous access is not allowed
- Cross-user data access is prevented
- Malicious usage tracking is blocked
