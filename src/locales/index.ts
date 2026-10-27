import { en, type Dictionary } from './en';
import { fr } from './fr';
import { ar } from './ar';
import { DEFAULT_LOCALE, DIRECTIONS, LOCALES, type Locale } from '@shared/domain/types';

export type { Dictionary };
export const dictionaries: Record<Locale, Dictionary> = { en, fr, ar };

export const isLocale = (value: string | undefined | null): value is Locale =>
  !!value && (LOCALES as readonly string[]).includes(value);

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export type TranslateVars = Record<string, string | number>;

/**
 * Resolve a dot-separated key and interpolate `{placeholders}`.
 * Missing keys are surfaced in development and fall back to English, then the key itself.
 */
export function translate(locale: Locale, key: string, vars?: TranslateVars): string {
  const resolve = (dictionary: Dictionary): unknown =>
    key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, dictionary);

  let value = resolve(getDictionary(locale));
  if (typeof value !== 'string') value = resolve(dictionaries.en);
  if (typeof value !== 'string') {
    if (import.meta.env?.DEV) console.warn(`[i18n] Missing translation key: ${key} (${locale})`);
    return key;
  }
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

export const directionFor = (locale: Locale): 'ltr' | 'rtl' => DIRECTIONS[locale] ?? 'ltr';

export const htmlLang = (locale: Locale): string => (locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-MA' : 'en');

/** Locale-aware date formatting used across the site and the admin. */
export function formatDate(isoDate: string, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat(htmlLang(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatDateTime(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(htmlLang(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(time: string, locale: Locale): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours)) return time;
  return new Intl.DateTimeFormat(htmlLang(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2024, 0, 1, hours, minutes ?? 0)));
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(htmlLang(locale)).format(value);
}
