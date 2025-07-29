import { Redirect } from 'expo-router';
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export default function Index() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  // Redirect based on authentication status
  return isAuthenticated ? <Redirect href="/(tabs)/dashboard" /> : <Redirect href="/login/loginScreen" />;
}