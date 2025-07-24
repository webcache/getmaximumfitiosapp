# Debug Google Sign-In Profile Creation

## Current Issue
After Google Sign-In, the user profile in Firestore shows empty values for:
- `firstName: ""`
- `lastName: ""`
- `displayName: ""`

## Debug Steps

### 1. Check what Google Sign-In returns
Add this debug logging to `useAuthFunctions.ts` in the `signInWithGoogle` function:

```typescript
const signInWithGoogle = async (): Promise<User> => {
  console.log('Starting Redux-integrated Google Sign-In...');
  const user = await utilSignInWithGoogle();
  
  // DEBUG: Log what Google returns
  console.log('Google Sign-In user object:', {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    providerData: user.providerData.map(p => ({
      providerId: p.providerId,
      displayName: p.displayName,
      email: p.email
    }))
  });
  
  // Continue with existing logic...
```

### 2. Check Firestore document after creation
Add this debug logging after the `setDoc` call:

```typescript
console.log('Profile data being saved to Firestore:', {
  firstName: user.displayName ? user.displayName.split(' ')[0] : '',
  lastName: user.displayName && user.displayName.split(' ').length > 1 
    ? user.displayName.split(' ').slice(1).join(' ') 
    : '',
  displayName: user.displayName || '',
  email: user.email || ''
});
```

### 3. Possible Issues

1. **Google doesn't provide displayName**: Some Google accounts might not have a display name set
2. **Provider data might have better info**: Check `user.providerData[0].displayName`
3. **Real name might be in different fields**: Google might provide given_name/family_name in additional user info

### 4. Improved Profile Creation Logic

```typescript
// Try to extract first/last name from multiple sources
let firstName = '';
let lastName = '';
let displayName = user.displayName || '';

// First try: user.displayName
if (user.displayName) {
  const nameParts = user.displayName.trim().split(' ');
  firstName = nameParts[0] || '';
  lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
}

// Fallback: try provider data
if (!firstName && user.providerData && user.providerData.length > 0) {
  const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
  if (googleProvider && googleProvider.displayName) {
    displayName = googleProvider.displayName;
    const nameParts = googleProvider.displayName.trim().split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  }
}

// Last resort: use email prefix as first name
if (!firstName && user.email) {
  firstName = user.email.split('@')[0];
}

console.log('Extracted name info:', { firstName, lastName, displayName });
```
