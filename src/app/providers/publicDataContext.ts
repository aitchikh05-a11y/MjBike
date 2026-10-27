import { createContext, useContext } from 'react';
import type { PublicData } from '@/services/backend/types';

export interface PublicDataState {
  data: PublicData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const PublicDataContext = createContext<PublicDataState | null>(null);

export function usePublicData(): PublicDataState & { data: PublicData | null } {
  const context = useContext(PublicDataContext);
  if (!context) throw new Error('usePublicData must be used inside <AppProviders>');
  return context;
}

/** Convenience accessor used by pages that render a full loading state. */
export function useRequirePublicData(): PublicData {
  const { data, loading, error } = usePublicData();
  if (loading) throw new Promise(() => {});
  if (error || !data) throw new Error(error ?? 'Public content is unavailable.');
  return data;
}
