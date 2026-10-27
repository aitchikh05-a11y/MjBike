import { Link } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { buildPath } from '@/app/router/paths';
import { cn } from '@/lib/utilities/cn';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'light';
  showWordmark?: boolean;
  linkTo?: string;
}

/** MJ Bike wheel + smile mark, drawn with the brand green from the shop identity. */
export function Logo({ className, variant = 'default', showWordmark = true, linkTo }: LogoProps) {
  const { locale, t } = useI18n();
  const target = linkTo ?? buildPath('home', locale);

  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'grid size-11 place-items-center rounded-full shadow-sm',
          variant === 'light' ? 'bg-white/15 ring-1 ring-white/30' : 'bg-brand-600',
        )}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true" className="size-8">
          <g fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="20" cy="34" r="9" />
            <circle cx="44" cy="34" r="9" />
            <path d="M20 34l6-13h10l8 13" />
            <path d="M26 21h8" />
            <path d="M44 34l-4-13h-4" />
          </g>
          <path d="M14 47c5 4 12 5 18 5s13-1 18-5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'text-[1.15rem] font-extrabold tracking-tight',
              variant === 'light' ? 'text-white' : 'text-ink-900',
            )}
          >
            MJ Bike
          </span>
          <span
            className={cn(
              'mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.3em]',
              variant === 'light' ? 'text-white/70' : 'text-brand-700',
            )}
          >
            Tangier
          </span>
        </span>
      )}
      <span className="sr-only">{t('meta.siteName')}</span>
    </span>
  );

  return (
    <Link to={target} className="rounded-full focus-visible:outline-offset-4" aria-label={t('meta.siteName')}>
      {content}
    </Link>
  );
}
