import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import CrashLogger from '../utils/crashLogger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (initialized) return;

    let mounted = true;
    
    const initAuth = async () => {
      try {
        CrashLogger.logAuthStep('Initializing simple auth provider');
        
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!mounted || isProcessing) return;
          
          setIsProcessing(true);
          
          try {
            CrashLogger.logAuthStep(`Auth state changed: ${user ? 'logged in' : 'logged out'}`);
            setUser(user);
          } catch (error) {
            console.error('Error handling auth state change:', error);
            CrashLogger.recordError(error as Error, 'SIMPLE_AUTH_STATE_CHANGE');
          } finally {
            if (mounted) {
              setLoading(false);
              setInitialized(true);
              setIsProcessing(false);
            }
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error initializing auth:', error);
        CrashLogger.recordError(error as Error, 'SIMPLE_AUTH_INIT');
        if (mounted) {
          setLoading(false);
          setInitialized(true);
          setIsProcessing(false);
        }
        return null;
      }
    };

    const unsubscribePromise = initAuth();

    return () => {
      mounted = false;
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) {
          unsubscribe();
        }
      }).catch(console.error);
    };
  }, [initialized, isProcessing]);

  const value = {
    user,
    loading,
    initialized,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
