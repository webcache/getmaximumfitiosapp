# Firebase v11 AsyncStorage Token Management Solution

## Overview

This implementation provides a comprehensive AsyncStorage-based token management system as a workaround for Firebase v11's lack of native persistence in Expo React Native applications.

## Architecture

### 1. Enhanced Redux Auth Slice (`store/authSlice.ts`)
- **Token State Management**: Added `TokenState` interface to track access tokens, refresh tokens, ID tokens, expiry times, and last refresh timestamps
- **AsyncStorage Integration**: Enhanced `restoreAuthState` and `persistAuthState` to handle both user data and tokens
- **New Actions**: 
  - `setTokens`: Update token state in Redux
  - `clearTokens`: Clear all tokens from state
  - `persistTokens`: Save tokens to AsyncStorage

### 2. Enhanced Firebase Auth Service (`services/firebaseAuthService.ts`)
- **Token Storage Keys**: Centralized storage key management for consistent AsyncStorage access
- **Core Token Methods**:
  - `saveUserTokens(user)`: Extract and save tokens from Firebase user
  - `restoreUserFromTokens()`: Restore authentication state from stored tokens
  - `getCurrentIdToken(forceRefresh)`: Get current token with automatic refresh
  - `clearStoredTokens()`: Comprehensive cleanup of all stored auth data
  - `handleGoogleSignInCredentials()`: Enhanced Google Sign-In with token management
  - `getAuthStatus()`: Comprehensive authentication status including token validity
  - `isUserAuthenticated()`: Token-aware authentication check

### 3. Enhanced Auth Functions (`hooks/useAuthFunctions.ts`)
- **Automatic Token Saving**: All sign-in/sign-up flows automatically save tokens
- **New Methods**:
  - `refreshTokens()`: Force token refresh
  - `getCurrentToken()`: Get current valid token
- **Enhanced Error Handling**: Graceful degradation when token operations fail

### 4. Enhanced Social Auth (`utils/socialAuth.ts`)
- **Google Sign-In Integration**: Uses new `handleGoogleSignInCredentials` method
- **Token Management**: Automatically extracts and saves Google tokens
- **Error Handling**: Improved error handling for token-related issues

### 5. Enhanced Auth Hook (`hooks/useEnhancedAuth.ts`)
- **Token-Aware State**: Provides authentication state with token validity checks
- **API Integration**: `useAuthenticatedApi` hook for automatic token injection
- **Comprehensive Status**: Real-time authentication and token status

## Storage Strategy

### AsyncStorage Keys
```typescript
const STORAGE_KEYS = {
  ACCESS_TOKEN: '@firebase_access_token',
  REFRESH_TOKEN: '@firebase_refresh_token', 
  ID_TOKEN: '@firebase_id_token',
  TOKEN_EXPIRY: '@firebase_token_expiry',
  USER_DATA: '@auth_user',
  USER_PROFILE: '@auth_profile',
  LAST_TOKEN_REFRESH: '@last_token_refresh'
};
```

### Redux vs AsyncStorage
- **Redux Store**: Excludes `auth` from redux-persist to avoid conflicts
- **Manual AsyncStorage**: Direct AsyncStorage management for auth tokens and user data
- **Hybrid Approach**: Redux for in-memory state, AsyncStorage for persistence

## Token Lifecycle

### 1. Sign-In Flow
1. User signs in (email/password or Google)
2. Firebase returns user with tokens
3. `saveUserTokens()` extracts and stores tokens to AsyncStorage
4. Redux state updated with user and token data
5. Auth state persisted for app restart

### 2. App Initialization
1. `restoreUserFromTokens()` checks AsyncStorage for valid tokens
2. If valid tokens found, updates Redux state
3. `restoreAuthState()` loads user profile data
4. Firebase auth state listener established
5. User session restored without re-authentication

### 3. Token Refresh
1. `getCurrentIdToken()` checks token expiry (5-minute buffer)
2. If near expiry, forces Firebase token refresh
3. New tokens automatically saved to AsyncStorage
4. Redux state updated with fresh tokens

### 4. Sign-Out Flow
1. Redux state cleared immediately
2. `clearStoredTokens()` removes all AsyncStorage data
3. Firebase sign-out called
4. Complete cleanup of auth state

## Benefits

### 1. Persistence Workaround
- **Solves Firebase v11 Issue**: Provides reliable auth persistence in Expo
- **Cross-Session State**: Authentication state survives app restarts
- **Token Management**: Automatic token refresh and validation

### 2. Performance
- **Reduced Re-Authentication**: Users stay signed in across sessions
- **Efficient Token Usage**: Smart refresh strategy minimizes Firebase calls
- **Background Persistence**: AsyncStorage operations don't block UI

### 3. Developer Experience
- **Simple API**: Enhanced hooks provide easy access to auth state
- **Error Resilience**: Graceful degradation when storage operations fail
- **Debugging Support**: Comprehensive logging for troubleshooting

### 4. Security
- **Token Validation**: Checks token expiry and validity
- **Automatic Refresh**: Prevents expired token usage
- **Secure Storage**: Uses React Native's AsyncStorage securely

## Usage Examples

### Basic Authentication Check
```typescript
const { isAuthenticated, tokens } = useEnhancedAuth();
const hasValidToken = tokens.idToken && tokens.tokenExpiry > Date.now();
```

### API Requests with Authentication
```typescript
const { authenticatedFetch } = useAuthenticatedApi();
const response = await authenticatedFetch('/api/user-data');
```

### Manual Token Management
```typescript
const { getCurrentToken, refreshTokens } = useAuthFunctions();
const token = await getCurrentToken();
const refreshed = await refreshTokens();
```

## Error Handling

### Graceful Degradation
- Token operations fail silently without breaking auth flow
- Fallback to Firebase default behavior when AsyncStorage fails
- Comprehensive error logging for debugging

### Recovery Strategies
- Automatic token refresh on expiry
- Fallback authentication checks
- User re-authentication prompts when needed

## Testing Considerations

### Unit Tests
- Mock AsyncStorage operations
- Test token expiry scenarios
- Validate error handling paths

### Integration Tests
- Test complete auth flows
- Verify persistence across app restarts
- Validate token refresh cycles

This solution provides a robust, production-ready workaround for Firebase v11's persistence limitations in Expo React Native applications, ensuring users stay authenticated across app sessions while maintaining security and performance.
