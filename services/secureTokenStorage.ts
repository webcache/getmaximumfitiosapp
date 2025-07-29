import * as SecureStore from 'expo-secure-store';
import { AppDispatch } from '../store';
import { setTokens } from '../store/authActions';
import CrashLogger from '../utils/crashLogger';

const ACCESS_TOKEN_KEY = 'firebase_accessToken';
const REFRESH_TOKEN_KEY = 'firebase_refreshToken';
const ID_TOKEN_KEY = 'firebase_idToken';
const TOKEN_EXPIRY_KEY = 'firebase_tokenExpiry';
const LAST_REFRESH_KEY = 'firebase_lastRefresh';

export async function saveTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  tokenExpiry: number;
  lastRefresh: number;
}): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
    await SecureStore.setItemAsync(ID_TOKEN_KEY, tokens.idToken);
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(tokens.tokenExpiry));
    await SecureStore.setItemAsync(LAST_REFRESH_KEY, String(tokens.lastRefresh));
    console.log('Tokens saved securely.');
  } catch (error) {
    CrashLogger.recordError(error as Error, 'SAVE_TOKENS_SECURE');
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
    await SecureStore.deleteItemAsync(LAST_REFRESH_KEY);
    console.log('Tokens cleared from secure storage.');
  } catch (error) {
    CrashLogger.recordError(error as Error, 'CLEAR_TOKENS_SECURE');
  }
}

export async function restoreAuthState(dispatch: AppDispatch): Promise<boolean> {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    const idToken = await SecureStore.getItemAsync(ID_TOKEN_KEY);
    const tokenExpiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    const lastRefreshStr = await SecureStore.getItemAsync(LAST_REFRESH_KEY);

    if (accessToken && refreshToken && idToken && tokenExpiryStr) {
      const tokenExpiry = parseInt(tokenExpiryStr, 10);
      const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : null;

      dispatch(
        setTokens({
          accessToken,
          refreshToken,
          idToken,
          tokenExpiry,
          lastRefresh,
        })
      );
      console.log('Auth state restored from secure storage.');
      return true;
    }
    console.log('No auth state found in secure storage.');
    return false;
  } catch (error) {
    CrashLogger.recordError(error as Error, 'RESTORE_AUTH_STATE');
    return false;
  }
}
