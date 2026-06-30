import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  title: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('matedex_token'));
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(localStorage.getItem('matedex_token')));

  useEffect(() => {
    if (!token) return;

    authApi
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('matedex_token');
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  function login(newToken: string, newUser: User) {
    localStorage.setItem('matedex_token', newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('matedex_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}