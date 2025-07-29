import * as SecureStore from 'expo-secure-store';
import { User } from 'firebase/auth';

const ACCESS_TOKEN_KEY = 'firebase_access_token';
const REFRESH_TOKEN_KEY = 'firebase_refresh_token';

/**
 * Stores Firebase authentication tokens securely.
 * @param user The Firebase user object containing the tokens.
 */
export const storeTokens = async (user: User): Promise<void> => {
  try {
    const idToken = await user.getIdToken();
    // @ts-ignore
    const refreshToken = user.refreshToken;

    if (idToken && refreshToken) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, idToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (error) {
    console.error('SecureTokenStorage: Failed to store tokens', error);
    // Depending on the app's needs, you might want to re-throw the error
  }
};

/**
 * Retrieves stored Firebase authentication tokens.
 * @returns An object containing the accessToken and refreshToken, or null if not found.
 */
export const getTokens = async (): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> => {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
    return null;
  } catch (error) {
    console.error('SecureTokenStorage: Failed to get tokens', error);
    return null;
  }
};

/**
 * Clears all stored authentication tokens.
 */
export const clearTokens = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('SecureTokenStorage: Failed to clear tokens', error);
  }
};
