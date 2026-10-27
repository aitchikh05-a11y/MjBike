import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Seo } from '@/components/common/Seo';
import { useI18n } from '@/app/providers/I18nProvider';
import { buildPath } from '@/app/router/paths';

export function NotFoundPage() {
  const { locale, t } = useI18n();
  return (
    <section className="section">
      <Seo page="home" title={t('pages.notFound.title')} description={t('pages.notFound.description')} robots="noindex,follow" />
      <div className="container-page max-w-xl text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-700">
          <Compass className="size-8" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{t('notFound.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{t('notFound.text')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={buildPath('home', locale)} className="btn-primary text-sm">
            {t('notFound.home')}
          </Link>
          <Link to={buildPath('booking', locale)} className="btn-secondary text-sm">
            {t('notFound.booking')}
          </Link>
        </div>
      </div>
    </section>
  );
}
