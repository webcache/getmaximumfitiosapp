import { useEffect } from 'react';
import { initializeAuth } from '../store/authSlice';
import { useAppDispatch } from '../store/hooks';
import { useAuth } from './useAuth'; // Assuming useAuth hook is in the same directory

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { initialized } = useAuth();

  useEffect(() => {
    if (!initialized) {
      // @ts-ignore
      dispatch(initializeAuth());
    }
  }, [dispatch, initialized]);

  return <>{children}</>;
};

export default AuthProvider;
