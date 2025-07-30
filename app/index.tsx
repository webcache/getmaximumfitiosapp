import { Redirect } from 'expo-router';
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export default function Index() {
  // Get auth state with safety guards
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const initialized = useSelector((state: RootState) => state.auth.initialized);
  const user = useSelector((state: RootState) => state.auth.user);

  // Wait for auth to initialize before redirecting
  if (!initialized) {
    console.log('🔄 Index: Waiting for auth initialization...');
    return null;
  }

  // Additional safety: ensure consistent auth state
  if (isAuthenticated && !user) {
    console.warn('⚠️ Index: Auth state inconsistent, waiting...');
    return null;
  }

  console.log('🧭 Index: Redirecting based on auth state:', { isAuthenticated, hasUser: !!user });

  // Redirect based on authentication status with bridge safety
  try {
    return isAuthenticated ? <Redirect href="/(tabs)/dashboard" /> : <Redirect href="/login/loginScreen" />;
  } catch (redirectError) {
    console.error('❌ Index: Redirect error:', redirectError);
    return null;
  }
}