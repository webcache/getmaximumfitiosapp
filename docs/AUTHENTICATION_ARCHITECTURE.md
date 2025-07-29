# Token-Based Authentication Architecture

## Overview

This app now uses a **pure token-based authentication system** with the following components:

### 🔐 Primary Storage: expo-secure-store
- **Secure hardware-based storage** for auth tokens
- **Encrypted by default** using device keychain/keystore
- **Best security** for sensitive authentication data

### 💾 Fallback Storage: AsyncStorage
- **Backup storage** when SecureStore is unavailable
- **Compatibility** with older devices or emulators
- **Automatic migration** from AsyncStorage to SecureStore

### ☁️ Cross-Device Sync: Firestore
- **Backup tokens** to Firestore for cross-device access
- **Non-blocking background sync** - won't fail authentication
- **Automatic token restoration** when signing in on new devices

### 🔄 State Management: Redux + Redux Persist
- **Primary authentication state** managed by Redux
- **Persists across app restarts** via redux-persist
- **Real-time state updates** throughout the app

## Architecture Components

### 1. SecureTokenService (`/services/secureTokenService.ts`)
- **Core token management** using expo-secure-store + AsyncStorage + Firestore
- **Storage priority**: SecureStore → AsyncStorage → Firestore
- **Automatic failover** between storage methods
- **Token validation** and expiry checking

### 2. TokenAuthService (`/services/tokenAuthService.ts`)
- **High-level authentication service** using SecureTokenService
- **Google Sign-In integration** with token persistence
- **User profile management** in Firestore
- **Redux state synchronization**
- **Independent of Firebase Auth state management**

### 3. Updated Auth Hook (`/hooks/useAuthFunctions.ts`)
- **Google Sign-In** now uses TokenAuthService
- **Email/password** auth still uses Firebase Auth (legacy)
- **Sign-out** clears all token storage locations
- **Token refresh** functionality

### 4. Updated Auth Provider (`/contexts/ReduxAuthProvider.tsx`)
- **Initialization** uses TokenAuthService instead of Firebase Auth service
- **Error handling** for auth loops and failures
- **Redux persistence** management

## Benefits

✅ **Secure**: Hardware-backed token storage via expo-secure-store
✅ **Reliable**: Multiple storage fallbacks (SecureStore → AsyncStorage → Firestore)
✅ **Cross-device**: Tokens synced to Firestore for device switching
✅ **Offline**: Works without internet using local token storage
✅ **Fast**: Local storage provides immediate authentication state
✅ **Redux-centric**: Pure token-based auth without Firebase Auth dependency

## Token Storage Flow

```
1. User authenticates (Google Sign-In)
2. Tokens saved to:
   - SecureStore (primary, encrypted)
   - AsyncStorage (fallback)
   - Redux state (immediate app use)
   - Firestore (background sync for cross-device)

3. App restart:
   - Try SecureStore → AsyncStorage → Firestore
   - First valid tokens found are used
   - Redux state updated immediately
```

## Files Modified

- ✅ `/services/secureTokenService.ts` (new)
- ✅ `/services/tokenAuthService.ts` (new)
- ✅ `/hooks/useAuthFunctions.ts` (updated)
- ✅ `/contexts/ReduxAuthProvider.tsx` (updated)
- ✅ `/package.json` (added expo-secure-store)

## Migration Notes

- **Google Sign-In**: Fully migrated to token-based system
- **Email/Password**: Still uses Firebase Auth (can be migrated later)
- **Existing tokens**: Will be automatically migrated to new system
- **Backward compatibility**: Maintained with existing components

## Testing

To test the new system:

1. **Sign in with Google** - should use new TokenAuthService
2. **Close and reopen app** - should restore from SecureStore
3. **Sign out** - should clear all storage locations
4. **Cross-device** - sign in on another device to test Firestore sync

## Future Enhancements

- [ ] Migrate email/password auth to custom token system
- [ ] Implement automatic token refresh logic
- [ ] Add biometric authentication option
- [ ] Enhanced cross-device token management
