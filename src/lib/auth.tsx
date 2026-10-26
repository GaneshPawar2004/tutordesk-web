import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { api, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { Me, Permission } from '../api/types';

interface AuthState {
  me: Me | null;
  ready: boolean;
  loginAs: (role: 'admin' | 'staff', staffId?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  can: (p: Permission) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Demo sign-in. The UI hides what a role cannot use, but the API is what
 * actually enforces access — every restricted request returns 403.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setMe(null);
      return;
    }
    try {
      setMe(await api<Me>('/me'));
    } catch {
      tokenStore.set(null);
      setMe(null);
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setMe(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    refresh().finally(() => setReady(true));
  }, [refresh, logout]);

  const loginAs = async (role: 'admin' | 'staff', staffId?: string) => {
    const { token } = await api<{ token: string }>('/auth/demo-login', { method: 'POST', body: { role, staffId } });
    tokenStore.set(token);
    await refresh();
  };

  const can = (p: Permission) => !!me && (me.permissions === 'all' || me.permissions.includes(p));

  return <AuthContext.Provider value={{ me, ready, loginAs, logout, refresh, can }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** Narrowed helper for pages that only render once signed in. */
export function useMe() {
  const { me, ...rest } = useAuth();
  if (!me) throw new Error('useMe requires a signed-in user');
  return { me, ...rest };
}
