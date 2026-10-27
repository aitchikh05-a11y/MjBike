import { DEFAULT_LOCALE, type Locale, type Offer, type Service } from '@shared/domain/types';
import { formatMAD } from '@shared/domain/pricing';

export function localizedValue(record: Record<Locale, string> | null | undefined, locale: Locale): string {
  if (!record) return '';
  return record[locale] ?? record[DEFAULT_LOCALE] ?? Object.values(record)[0] ?? '';
}

export function serviceTranslation(service: Service, locale: Locale) {
  const translation =
    service.translations.find((item) => item.locale === locale) ??
    service.translations.find((item) => item.locale === DEFAULT_LOCALE) ??
    service.translations[0];
  return {
    name: translation?.name ?? service.slug,
    short_description: translation?.short_description ?? '',
    description: translation?.description ?? '',
    highlights: translation?.highlights ?? [],
    meta_title: translation?.meta_title ?? null,
    meta_description: translation?.meta_description ?? null,
  };
}

export function offerTranslation(offer: Offer, locale: Locale) {
  const translation =
    offer.translations.find((item) => item.locale === locale) ??
    offer.translations.find((item) => item.locale === DEFAULT_LOCALE) ??
    offer.translations[0];
  return {
    title: translation?.title ?? offer.slug,
    short_description: translation?.short_description ?? '',
    description: translation?.description ?? '',
    included: translation?.included ?? [],
  };
}

export function price(amount: number, locale: Locale): string {
  return formatMAD(amount, locale);
}

/** "50 MAD / h" style label based on the service price unit. */
export function unitSuffix(unit: Service['price_unit'], t: (key: string) => string): string {
  if (unit === 'per_bike') return `/ ${t('common.perBike')}`;
  if (unit === 'per_person') return `/ ${t('common.perPerson')}`;
  return `/ ${t('common.perGroup')}`;
}

export function formatDuration(hours: number, t: (key: string) => string): string {
  if (hours < 1) return `${Math.round(hours * 60)} ${t('common.minutes')}`;
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole} ${whole === 1 ? t('common.hour') : t('common.hours')}`;
  return `${whole} ${t('common.hours')} ${minutes} ${t('common.minutes')}`;
}

export const phoneHref = (phone: string) => `tel:${phone.replace(/\s/g, '')}`;

export function whatsappHref(number: string, message?: string): string {
  const digits = number.replace(/[^\d]/g, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
