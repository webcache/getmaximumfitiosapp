import { createAction } from '@reduxjs/toolkit';

// Action creators extracted to avoid circular dependencies
export const setTokens = createAction<{
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  tokenExpiry?: number | null;
  lastRefresh?: number | null;
}>('auth/setTokens');

export const clearTokens = createAction('auth/clearTokens');
