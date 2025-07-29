import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { initializeApp } from '../store/authSlice';

// Dispatch the initialization action once when the app loads
// @ts-ignore
store.dispatch(initializeApp());

export const ReduxAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <Provider store={store}>{children}</Provider>;
};
