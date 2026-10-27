import { DEFAULT_LOCALE, LOCALES, type Locale } from '@shared/domain/types';

export const PUBLIC_PAGES = [
  'home',
  'rentals',
  'tours',
  'experiences',
  'offers',
  'gallery',
  'booking',
  'reservationStatus',
  'lookup',
  'contact',
  'about',
  'faq',
  'privacy',
  'terms',
] as const;

export type PublicPage = (typeof PUBLIC_PAGES)[number];

/**
 * Localized slugs. Arabic uses natural transliterations instead of English words,
 * e.g. /ar/tajir-darajat/ (تأجير الدراجات) and /ar/jawalat/ (جولات).
 */
export const SLUGS: Record<Locale, Record<PublicPage, string>> = {
  en: {
    home: '',
    rentals: 'bike-rentals',
    tours: 'bike-tours',
    experiences: 'experiences',
    offers: 'offers',
    gallery: 'gallery',
    booking: 'reservations',
    reservationStatus: 'reservations/confirmation',
    lookup: 'find-reservation',
    contact: 'contact',
    about: 'about',
    faq: 'faq',
    privacy: 'privacy',
    terms: 'terms',
  },
  fr: {
    home: '',
    rentals: 'location-velos',
    tours: 'balades-velo',
    experiences: 'experiences',
    offers: 'offres',
    gallery: 'galerie',
    booking: 'reservations',
    reservationStatus: 'reservations/confirmation',
    lookup: 'trouver-reservation',
    contact: 'contact',
    about: 'a-propos',
    faq: 'faq',
    privacy: 'confidentialite',
    terms: 'conditions-generales',
  },
  ar: {
    home: '',
    rentals: 'tajir-darajat',
    tours: 'jawalat',
    experiences: 'tajarib',
    offers: 'urud',
    gallery: 'maarid',
    booking: 'hajz',
    reservationStatus: 'hajz/tamid',
    lookup: 'al-bahth-an-hajzi',
    contact: 'ittisal',
    about: 'man-nahnu',
    faq: 'asila',
    privacy: 'khousousiya',
    terms: 'shurut',
  },
};

/** Every admin path lives outside the locale space and is never indexed. */
export const ADMIN_PATHS = {
  login: '/admin/login',
  resetPassword: '/admin/reset-password',
  updatePassword: '/admin/update-password',
  dashboard: '/admin/dashboard',
  reservations: '/admin/reservations',
  reservation: (id: string) => `/admin/reservations/${id}`,
  calendar: '/admin/calendar',
  customers: '/admin/customers',
  customer: (id: string) => `/admin/customers/${id}`,
  offers: '/admin/offers',
  offer: (id: string) => `/admin/offers/${id}`,
  services: '/admin/services',
  service: (id: string) => `/admin/services/${id}`,
  inventory: '/admin/inventory',
  gallery: '/admin/gallery',
  testimonials: '/admin/testimonials',
  notes: '/admin/notes',
  visitors: '/admin/visitors',
  settings: '/admin/settings',
} as const;

export function buildPath(page: PublicPage, locale: Locale, params?: { reference?: string }): string {
  const slug = SLUGS[locale]?.[page] ?? SLUGS.en[page];
  const suffix = slug ? `/${slug}` : '';
  const base = `/${locale}${suffix}`;
  if (page === 'reservationStatus' && params?.reference) {
    return `${base}?ref=${encodeURIComponent(params.reference)}`;
  }
  return `${base}/`;
}

/** Strip the locale prefix and match a localized slug back to a page id. */
export function matchPublicPath(pathname: string): { locale: Locale; page: PublicPage; slug: string } | null {
  const segments = pathname.split('/').filter(Boolean);
  const [localeSegment, ...rest] = segments;
  if (!localeSegment || !(LOCALES as readonly string[]).includes(localeSegment)) return null;
  const locale = localeSegment as Locale;
  const slug = rest.join('/');
  if (slug === '') return { locale, page: 'home', slug: '' };
  for (const page of PUBLIC_PAGES) {
    if (SLUGS[locale][page] === slug) return { locale, page, slug };
  }
  return null;
}

/** Build hreflang alternates for the current page. */
export function alternatesFor(page: PublicPage): { locale: Locale; path: string }[] {
  return LOCALES.map((locale) => ({ locale, path: buildPath(page, locale) }));
}

export function detectPreferredLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('mjb.locale') : null;
  if (stored && (LOCALES as readonly string[]).includes(stored)) return stored as Locale;
  for (const language of navigator.languages ?? []) {
    const base = language.slice(0, 2).toLowerCase();
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale;
  }
  return DEFAULT_LOCALE;
}
