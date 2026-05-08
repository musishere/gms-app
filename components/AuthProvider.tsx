'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User { id: string; name: string; email: string; role: string; phone?: string; cnic?: string; address?: string; }
interface AuthCtx { user: User | null; loading: boolean; login(e: string, p: string): Promise<void>; logout(): Promise<void>; refreshUser(): Promise<void>; }
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const r = await fetch('/api/auth/me');
      if (r.ok) { const d = await r.json(); setUser(d.user); } else setUser(null);
    } catch { setUser(null); }
  };

  useEffect(() => { refreshUser().finally(() => setLoading(false)); }, []);

  const login = async (email: string, password: string) => {
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Login failed');
    setUser(d.user); router.push('/dashboard');
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null); router.push('/login');
  };

  return <Ctx.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
}
