import { Link } from 'react-router-dom';
import { useConsent } from '@/app/providers/ConsentProvider';
import { useI18n } from '@/app/providers/I18nProvider';
import { buildPath } from '@/app/router/paths';

export function ConsentBanner() {
  const { decided, accept, decline } = useConsent();
  const { locale, t } = useI18n();
  if (decided) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4" role="dialog" aria-labelledby="consent-title" aria-describedby="consent-text">
      <div className="container-page">
        <div className="card flex flex-col gap-4 p-4 shadow-lift sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="max-w-2xl">
            <p id="consent-title" className="text-sm font-bold text-ink-900">
              {t('consent.bannerTitle')}
            </p>
            <p id="consent-text" className="mt-1 text-xs leading-relaxed text-ink-500">
              {t('consent.bannerText')}{' '}
              <Link to={buildPath('privacy', locale)} className="font-semibold text-brand-700 underline underline-offset-2">
                {t('consent.learnMore')}
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={decline} className="btn-secondary !py-2.5 text-xs">
              {t('consent.decline')}
            </button>
            <button type="button" onClick={accept} className="btn-primary !py-2.5 text-xs">
              {t('consent.accept')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
