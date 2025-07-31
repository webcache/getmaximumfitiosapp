import { Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  // Get auth state from context
  const { user, initialized, loading } = useAuth();
  const isAuthenticated = !!user;

  // Debug: Log auth state changes
  console.log('🧭 Index: Auth state:', { 
    isAuthenticated, 
    hasUser: !!user, 
    userEmail: user?.email || 'none',
    initialized, 
    loading 
  });

  // Wait for auth to initialize before redirecting
  if (!initialized || loading) {
    console.log('🔄 Index: Waiting for auth initialization...');
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