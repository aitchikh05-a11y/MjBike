import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { backend } from '@/services/backend';
import type { Profile } from '@shared/domain/types';
import { can, type Permission } from '@shared/domain/permissions';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<Profile>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  allowed: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const session = await backend.getSession();
      setProfile(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify your session.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await backend.signIn(email, password);
    setProfile(result);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await backend.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      error,
      signIn,
      signOut,
      refresh,
      allowed: (permission: Permission) => can(profile?.role, permission),
    }),
    [profile, loading, error, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
