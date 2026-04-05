import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@chatxiv/cdm';
import { getAuthApiClient } from '../../clients/authApi/instance';
import { logger } from '../../lib/logger/instance';

export interface AuthState {
  readonly user: AuthUser | null;
  readonly loading: boolean;
  readonly login: () => void;
  readonly logout: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const client = getAuthApiClient();
    try {
      const result = await client.fetchMe();
      setUser(result?.user ?? null);
    } catch (err: unknown) {
      logger.warn('Auth check failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const login = useCallback(() => {
    const client = getAuthApiClient();
    window.location.href = client.getLoginUrl();
  }, []);

  const logout = useCallback(async () => {
    const client = getAuthApiClient();
    try {
      await client.logout();
    } catch (err: unknown) {
      logger.warn('Logout request failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchUser();
  }, [fetchUser]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
