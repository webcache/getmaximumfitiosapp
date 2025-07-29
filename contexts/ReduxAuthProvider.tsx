import React from 'react';
import { Provider } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { store } from '../store';
import { initializeApp } from '../store/authSlice';

// Dispatch the initialization action once when the app loads
// @ts-ignore
store.dispatch(initializeApp());

// Legacy hook for tests - alias for useAuth
export const useReduxAuth = useAuth;

export const ReduxAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <Provider store={store}>{children}</Provider>;
};
