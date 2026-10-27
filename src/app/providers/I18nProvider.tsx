import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { DEFAULT_LOCALE, DIRECTIONS, type Locale } from '@shared/domain/types';
import { formatDate, formatDateTime, formatNumber, formatTime, translate, type TranslateVars } from '@/locales';

interface I18nValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  t: (key: string, vars?: TranslateVars) => string;
  date: (isoDate: string, options?: Intl.DateTimeFormatOptions) => string;
  dateTime: (value: string) => string;
  time: (value: string) => string;
  number: (value: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const safeLocale = (locale ?? DEFAULT_LOCALE) as Locale;
    return {
      locale: safeLocale,
      dir: DIRECTIONS[safeLocale],
      isRtl: DIRECTIONS[safeLocale] === 'rtl',
      t: (key, vars) => translate(safeLocale, key, vars),
      date: (isoDate, options) => formatDate(isoDate, safeLocale, options),
      dateTime: (input) => formatDateTime(input, safeLocale),
      time: (input) => formatTime(input, safeLocale),
      number: (input) => formatNumber(input, safeLocale),
    };
  }, [locale]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = value.locale === 'ar' ? 'ar' : value.locale;
    document.documentElement.dir = value.dir;
    try {
      localStorage.setItem('mjb.locale', value.locale);
    } catch {
      /* storage can be unavailable in private mode — locale still works for this page */
    }
  }, [value.locale, value.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>');
  return context;
}

/** Convenience hook for components that only need the translator. */
export function useT() {
  return useI18n().t;
}

export function useLocaleHref() {
  const { locale } = useI18n();
  return useCallback((path: string) => `/${locale}${path === '/' ? '/' : path}`, [locale]);
}
