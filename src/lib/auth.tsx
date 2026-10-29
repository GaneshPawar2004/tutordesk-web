import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { api, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { Me, Permission } from '../api/types';

export interface RegisterInput {
  tuitionName: string;
  city: string;
  adminName: string;
  phone: string;
  email: string;
  password: string;
}

interface AuthState {
  me: Me | null;
  ready: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  acceptInvite: (phone: string, code: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  can: (p: Permission) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Signed-in user. The UI hides what a role cannot use, but the API is what
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

  const signIn = async (path: string, body: unknown) => {
    const { token } = await api<{ token: string }>(path, { method: 'POST', body });
    tokenStore.set(token);
    await refresh();
  };

  const value: AuthState = {
    me,
    ready,
    login: (identifier, password) => signIn('/auth/login', { identifier, password }),
    register: (input) => signIn('/auth/register', { ...input, email: input.email || undefined }),
    acceptInvite: (phone, code, password) => signIn('/auth/accept-invite', { phone, code, password }),
    logout,
    refresh,
    can: (p) => !!me && (me.permissions === 'all' || me.permissions.includes(p)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
