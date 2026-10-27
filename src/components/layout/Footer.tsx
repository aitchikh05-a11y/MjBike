import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, MapPin, Phone, Clock, Mail, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useI18n } from '@/app/providers/I18nProvider';
import { usePublicData } from '@/app/providers/publicDataContext';
import { buildPath } from '@/app/router/paths';

export function Footer() {
  const { locale, t } = useI18n();
  const { data } = usePublicData();
  const settings = data?.settings;
  const year = new Date().getFullYear();

  const explore = [
    { page: 'rentals' as const, key: 'nav.rentals' },
    { page: 'tours' as const, key: 'nav.tours' },
    { page: 'experiences' as const, key: 'nav.experiences' },
    { page: 'offers' as const, key: 'nav.offers' },
    { page: 'gallery' as const, key: 'nav.gallery' },
  ];
  const support = [
    { page: 'contact' as const, key: 'nav.contact' },
    { page: 'faq' as const, key: 'footer.faq' },
    { page: 'lookup' as const, key: 'footer.reservationLookup' },
    { page: 'privacy' as const, key: 'footer.privacy' },
    { page: 'terms' as const, key: 'footer.terms' },
  ];

  return (
    <footer className="mt-auto border-t border-ink-100 bg-ink-950 text-ink-200">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo variant="light" />
          <p className="max-w-xs text-sm leading-relaxed text-ink-300">{t('footer.tagline')}</p>
          <div className="flex items-center gap-2 pt-1">
            {settings?.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noreferrer noopener" aria-label="Instagram" className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20">
                <Instagram className="size-4" aria-hidden="true" />
              </a>
            )}
            {settings?.facebook_url && (
              <a href={settings.facebook_url} target="_blank" rel="noreferrer noopener" aria-label="Facebook" className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20">
                <Facebook className="size-4" aria-hidden="true" />
              </a>
            )}
            {settings?.youtube_url && (
              <a href={settings.youtube_url} target="_blank" rel="noreferrer noopener" aria-label="YouTube" className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20">
                <Youtube className="size-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">{t('footer.services')}</h2>
          <ul className="space-y-2 text-sm">
            {explore.map((item) => (
              <li key={item.page}>
                <Link to={buildPath(item.page, locale)} className="text-ink-300 transition hover:text-white">
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">{t('footer.support')}</h2>
          <ul className="space-y-2 text-sm">
            {support.map((item) => (
              <li key={item.page}>
                <Link to={buildPath(item.page, locale)} className="text-ink-300 transition hover:text-white">
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">{t('footer.contact')}</h2>
          <ul className="space-y-3 text-sm text-ink-300">
            {settings?.phone && (
              <li>
                <a href={`tel:${settings.phone}`} className="inline-flex items-start gap-2 transition hover:text-white">
                  <Phone className="mt-0.5 size-4 shrink-0 text-brand-400" aria-hidden="true" />
                  <span dir="ltr">{settings.phone}</span>
                </a>
              </li>
            )}
            {settings?.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex items-start gap-2 transition hover:text-white">
                  <Mail className="mt-0.5 size-4 shrink-0 text-brand-400" aria-hidden="true" />
                  {settings.email}
                </a>
              </li>
            )}
            {settings?.opening_hours?.[0] && (
              <li className="inline-flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-400" aria-hidden="true" />
                <span>
                  {t('common.openingHours')}: {settings.opening_hours.map((entry) => entry.hours).join(' · ')}
                </span>
              </li>
            )}
            <li>
              <a href={settings?.maps_url || '#'} target="_blank" rel="noreferrer noopener" className="inline-flex items-start gap-2 transition hover:text-white">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-400" aria-hidden="true" />
                <span>{settings?.address?.[locale] ?? t('common.address')}</span>
              </a>
            </li>
          </ul>
          <Link to="/admin/login" className="mt-5 inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white/80">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {t('footer.admin')}
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>
            © {year} {settings?.business_name ?? 'MJ Bike Tangier'}. {t('footer.rights')}
          </p>
          <p>{t('footer.builtFor')}</p>
        </div>
      </div>
    </footer>
  );
}
