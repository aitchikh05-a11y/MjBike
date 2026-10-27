import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, CalendarCheck, Phone } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '@/app/providers/I18nProvider';
import { usePublicData } from '@/app/providers/publicDataContext';
import { buildPath, type PublicPage } from '@/app/router/paths';
import { cn } from '@/lib/utilities/cn';

const NAV_ITEMS: { page: PublicPage; key: string }[] = [
  { page: 'home', key: 'nav.home' },
  { page: 'rentals', key: 'nav.rentals' },
  { page: 'tours', key: 'nav.tours' },
  { page: 'experiences', key: 'nav.experiences' },
  { page: 'offers', key: 'nav.offers' },
  { page: 'gallery', key: 'nav.gallery' },
  { page: 'contact', key: 'nav.contact' },
];

export function Header() {
  const { locale, t } = useI18n();
  const { data } = usePublicData();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const phone = data?.settings.phone;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-white/90 backdrop-blur transition',
        scrolled ? 'border-ink-100 shadow-sm' : 'border-transparent',
      )}
    >
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
        <Logo />

        <nav aria-label={t('nav.home')} className="hidden items-center gap-0.5 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.page}
              to={buildPath(item.page, locale)}
              end={item.page === 'home'}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3 py-2 text-[0.82rem] font-semibold transition',
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                )
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-50 xl:inline-flex"
            >
              <Phone className="size-4 text-brand-600" aria-hidden="true" />
              {phone}
            </a>
          )}
          <LanguageSwitcher className="hidden sm:block" />
          <Link to={buildPath('booking', locale)} className="btn-primary !px-4 !py-2.5 text-[0.82rem]">
            <CalendarCheck className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('nav.book')}</span>
            <span className="sm:hidden">{t('common.book')}</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
            aria-label={t('nav.menu')}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <Menu className="size-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.menu')} id="mobile-menu">
          <button type="button" className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" aria-label={t('common.close')} onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 end-0 flex w-[min(21rem,88vw)] flex-col bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-ink-100" aria-label={t('nav.close')}>
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t('nav.menu')}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.page}
                  to={buildPath(item.page, locale)}
                  end={item.page === 'home'}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-xl px-4 py-3 text-[0.95rem] font-semibold transition',
                      isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-ink-50',
                    )
                  }
                >
                  {t(item.key)}
                </NavLink>
              ))}
              <NavLink to={buildPath('lookup', locale)} className="block rounded-xl px-4 py-3 text-[0.95rem] font-medium text-ink-600 hover:bg-ink-50">
                {t('nav.findReservation')}
              </NavLink>
            </nav>
            <div className="space-y-3 border-t border-ink-100 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t('nav.language')}</span>
                <LanguageSwitcher />
              </div>
              <Link to={buildPath('booking', locale)} className="btn-primary w-full">
                {t('nav.book')}
              </Link>
              {phone && (
                <a href={`tel:${phone}`} className="btn-secondary w-full">
                  <Phone className="size-4" aria-hidden="true" />
                  {phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
