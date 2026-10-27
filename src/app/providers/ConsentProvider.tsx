import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'mjb.analytics.consent';

type ConsentValue = 'granted' | 'denied' | null;

interface ConsentContextValue {
  consent: ConsentValue;
  /** True once the visitor has answered; the banner is hidden from then on. */
  decided: boolean;
  accept: () => void;
  decline: () => void;
  reopen: () => void;
  anonymousId: string;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStoredConsent(): ConsentValue {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'granted' || value === 'denied') return value;
  } catch {
    /* ignore storage errors */
  }
  return null;
}

function getAnonymousId(): string {
  try {
    const existing = localStorage.getItem('mjb.anonymous.id');
    if (existing) return existing;
    const id = `anon-${crypto.randomUUID()}`;
    localStorage.setItem('mjb.anonymous.id', id);
    return id;
  } catch {
    return `anon-${Math.random().toString(36).slice(2)}`;
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentValue>(() => readStoredConsent());
  const anonymousId = useMemo(getAnonymousId, []);

  const persist = useCallback((value: Exclude<ConsentValue, null>) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setConsent(value);
  }, []);

  useEffect(() => {
    const handler = () => setConsent(readStoredConsent());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      decided: consent !== null,
      accept: () => persist('granted'),
      decline: () => persist('denied'),
      reopen: () => setConsent(null),
      anonymousId,
    }),
    [consent, persist, anonymousId],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) throw new Error('useConsent must be used inside <ConsentProvider>');
  return context;
}
