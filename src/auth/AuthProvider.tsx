import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { AuthState, AuthUser, AuthContextValue } from './authState';
import { getStoredToken } from './identityToken';
import { handleSuccessfulSignIn } from './signIn';
import { handleSignOut } from './signOut';

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    user: null,
    token: null,
    errorMessage: null,
  });

  useEffect(() => {
    const existingToken = getStoredToken();
    if (existingToken) {
      try {
        const user = handleSuccessfulSignIn(existingToken);
        setState({
          status: 'authenticated',
          user,
          token: existingToken,
          errorMessage: null,
        });
      } catch {
        handleSignOut();
        setState({
          status: 'unauthenticated',
          user: null,
          token: null,
          errorMessage: null,
        });
      }
    } else {
      setState({
        status: 'unauthenticated',
        user: null,
        token: null,
        errorMessage: null,
      });
    }
  }, []);

  const signInWithToken = (token: string, user: AuthUser) => {
    handleSuccessfulSignIn(token);
    setState({
      status: 'authenticated',
      user,
      token,
      errorMessage: null,
    });
  };

  const signOut = () => {
    handleSignOut();
    setState({
      status: 'unauthenticated',
      user: null,
      token: null,
      errorMessage: null,
    });
  };

  const setError = (msg: string) => {
    setState((prev) => ({ ...prev, errorMessage: msg }));
  };

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signInWithToken,
      signOut,
      setError,
    }),
    [state]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
