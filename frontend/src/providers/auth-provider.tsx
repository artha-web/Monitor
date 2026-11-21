'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserResponse } from '@artha-monitor/shared';

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Redirect logic
  useEffect(() => {
    if (!loading) {
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
      const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

      if (!user && !isPublicPath && pathname !== '/') {
        router.push('/login');
      } else if (user && isPublicPath) {
        router.push('/monitors');
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Login failed');
    }

    const resData = await response.json();
    if (resData.data?.accessToken && typeof window !== 'undefined') {
      localStorage.setItem('access_token', resData.data.accessToken);
    }
    if (resData.data) {
      setUser(resData.data);
    }

    await fetchUser();
    router.push('/monitors');
    router.refresh();
  };

  const register = async (email: string, password: string, name?: string) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Registration failed');
    }

    const resData = await response.json();
    if (resData.data?.accessToken && typeof window !== 'undefined') {
      localStorage.setItem('access_token', resData.data.accessToken);
    }
    if (resData.data) {
      setUser(resData.data);
    }

    await fetchUser();
    router.push('/monitors');
    router.refresh();
  };

  const logout = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {}

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
