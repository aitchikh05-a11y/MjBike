import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Seo } from '@/components/common/Seo';
import { useI18n } from '@/app/providers/I18nProvider';
import { buildPath } from '@/app/router/paths';

const ITEMS = Array.from({ length: 8 }, (_, index) => index + 1);

export function FaqPage() {
  const { locale, t } = useI18n();

  return (
    <>
      <Seo page="faq" title={t('pages.faq.title')} description={t('pages.faq.description')} />
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-white py-14 lg:py-20">
        <div className="container-page max-w-3xl">
          <p className="eyebrow mb-3">{t('footer.faq')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{t('faq.title')}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-600">{t('faq.intro')}</p>
        </div>
      </section>
      <section className="section">
        <div className="container-page max-w-3xl">
          <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
            {ITEMS.map((index) => (
              <details key={index} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink-900 marker:hidden">
                  {t(`faq.q${index}`)}
                  <ChevronDown className="size-4 shrink-0 text-ink-400 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">{t(`faq.a${index}`)}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={buildPath('contact', locale)} className="btn-primary text-xs">
              {t('nav.contact')}
            </Link>
            <Link to={buildPath('booking', locale)} className="btn-secondary text-xs">
              {t('common.bookNow')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
