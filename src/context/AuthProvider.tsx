import { useState, useEffect, type ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import api from '../api/axios';
import type { AuthUser } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Clear stale session if no token exists
    if (!parsed?.token) {
      localStorage.removeItem('user');
      return null;
    }
    return parsed;
  });

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/users/login', { email, password });
    const d = res.data.data ?? res.data;
    const token = d.token ?? d.accessToken ?? d.access_token;
    const userObj = d.user ?? d;
    const role = userObj.role ?? 'USER';
    setUser({
      id: userObj.id,
      email: userObj.email ?? email,
      name: userObj.name,
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      token,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        userRole: user?.role ?? null,
        login,
        logout: () => setUser(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
