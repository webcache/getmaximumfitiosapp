# Metro Reload Crash Fix

## Problem
The React Native Expo app crashes during Metro server reloads instead of gracefully reloading.

## Root Causes
1. **Singleton services not resetting** - TokenAuthService maintains state across reloads
2. **Firebase re-initialization issues** - Multiple initialization attempts
3. **Global state pollution** - Singletons holding stale references
4. **Authentication state conflicts** - Auth initialization running multiple times

## Solutions Applied

### 1. TokenAuthService Hot Reload Protection
- Added `resetInstance()` method for development
- Added `isInitializing` flag to prevent concurrent initializations
- Reset singleton on hot reload in `_layout.tsx`

### 2. Firebase Initialization Protection
- Check for existing Firebase apps before initializing
- Reuse existing app instances on hot reload
- Proper error handling for re-initialization

### 3. Development Environment Safeguards
```typescript
// In _layout.tsx
if (__DEV__) {
  // Reset singletons on hot reload to prevent stale state
  TokenAuthService.resetInstance();
}

// In tokenAuthService.ts
static resetInstance(): void {
  if (__DEV__) {
    console.log('🔄 Resetting TokenAuthService instance for hot reload');
    TokenAuthService.instance = null as any;
  }
}
```

### 4. Concurrent Initialization Prevention
```typescript
async initialize(): Promise<boolean> {
  // Prevent multiple simultaneous initializations
  if (this.isInitializing) {
    console.log('⏸️ TokenAuthService initialization already in progress');
    return false;
  }
  // ... rest of initialization with finally block
}
```

## Expected Behavior After Fix
- ✅ Metro reload should work gracefully without crashes
- ✅ Authentication state should reset properly
- ✅ Firebase should not attempt multiple initializations
- ✅ App should start fresh after each reload

## Additional Recommendations
1. **Avoid global state mutations** during app initialization
2. **Use proper cleanup** in useEffect hooks
3. **Test hot reloads frequently** during development
4. **Monitor console logs** for singleton reset messages

The app should now handle Metro reloads gracefully without crashing.
