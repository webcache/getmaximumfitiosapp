import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { initializeApp } from '../store/authSlice';
import { useAppDispatch } from '../store/hooks';

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { initialized } = useAuth();

  useEffect(() => {
    if (!initialized) {
      dispatch(initializeApp());
    }
  }, [dispatch, initialized]);

  return <>{children}</>;
};

export default AuthProvider;
