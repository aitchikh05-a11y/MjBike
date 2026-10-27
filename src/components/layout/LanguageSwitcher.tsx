import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { LOCALE_LABELS, LOCALES, type Locale } from '@shared/domain/types';
import { useI18n } from '@/app/providers/I18nProvider';
import { buildPath, matchPublicPath } from '@/app/router/paths';
import { cn } from '@/lib/utilities/cn';

/**
 * Keeps the visitor on the equivalent page when switching language:
 * /en/bike-rentals/ → /fr/location-velos/ → /ar/tajir-darajat/
 */
export function LanguageSwitcher({ variant = 'light', className }: { variant?: 'light' | 'dark'; className?: string }) {
  const { locale, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const changeLocale = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    const match = matchPublicPath(location.pathname);
    const page = match?.page ?? 'home';
    const query = location.search;
    navigate(`${buildPath(page, next)}${query}`, { replace: true });
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('nav.switchTo')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition',
          variant === 'light'
            ? 'text-ink-700 hover:bg-ink-100'
            : 'text-white/90 ring-1 ring-white/30 hover:bg-white/10',
        )}
      >
        <Globe className="size-4" aria-hidden="true" />
        <span className="uppercase">{locale}</span>
        <ChevronDown className={cn('size-3.5 transition', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t('nav.language')}
          className="absolute end-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-lift"
        >
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === locale}
              onClick={() => changeLocale(option)}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-start text-sm transition',
                option === locale ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-700 hover:bg-ink-50',
              )}
            >
              <span>
                {LOCALE_LABELS[option].native}
                <span className="ms-1 text-xs text-ink-400">{option.toUpperCase()}</span>
              </span>
              {option === locale && <Check className="size-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
