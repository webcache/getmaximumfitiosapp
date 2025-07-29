import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { store } from '../store';
import { initializeApp } from '../store/authSlice';

const AuthStateInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { initialized } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    // @ts-ignore
    dispatch(initializeApp());
  }, [dispatch]);

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
};

export const ReduxAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <Provider store={store}>
      <AuthStateInitializer>{children}</AuthStateInitializer>
    </Provider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
