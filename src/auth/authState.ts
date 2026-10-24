export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
  isAdmin: boolean;
}

export interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  user: AuthUser | null;
  token: string | null;
  errorMessage: string | null;
}

export interface AuthContextValue extends AuthState {
  signInWithToken: (token: string, user: AuthUser) => void;
  signOut: () => void;
  setError: (msg: string) => void;
  updateDisplayName: (newName: string) => void;
}
