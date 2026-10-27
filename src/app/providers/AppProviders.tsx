import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { backend } from '@/services/backend';
import type { PublicData } from '@/services/backend/types';
import { PublicDataContext, type PublicDataState } from './publicDataContext';

export function PublicDataLoader({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await backend.getPublicData();
      if (mounted.current) setData(result);
    } catch (caught) {
      if (mounted.current) setError(caught instanceof Error ? caught.message : 'Unable to load content.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const value = useMemo<PublicDataState>(() => ({ data, loading, error, reload: load }), [data, loading, error, load]);

  return <PublicDataContext.Provider value={value}>{children}</PublicDataContext.Provider>;
}

/** Scrolls to the top on route change while keeping hash navigation working. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

/**
 * Public-site shell: loads published content once for the header, footer and pages,
 * keeps hash navigation working, and renders the consent banner through PublicLayout.
 */
export function PublicSiteProviders() {
  return (
    <PublicDataLoader>
      <ScrollToTop />
      <Outlet />
    </PublicDataLoader>
  );
}
