import { Link } from 'react-router-dom';
import { Seo } from '@/components/common/Seo';
import { EmptyState, LoadingBlock, SectionHeading } from '@/components/common/ui';
import { OfferCard } from '@/components/common/cards';
import { useI18n } from '@/app/providers/I18nProvider';
import { usePublicData } from '@/app/providers/publicDataContext';
import { buildPath } from '@/app/router/paths';

export function OffersPage() {
  const { locale, t } = useI18n();
  const { data, loading } = usePublicData();

  return (
    <>
      <Seo page="offers" title={t('pages.offers.title')} description={t('pages.offers.description')} />
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-white py-14 lg:py-20">
        <div className="container-page max-w-3xl">
          <p className="eyebrow mb-3">{t('offers.title')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{t('offers.title')}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-600 sm:text-base">{t('offers.intro')}</p>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          {loading && <LoadingBlock />}
          {!loading && (!data || data.offers.length === 0) && (
            <EmptyState
              title={t('offers.empty')}
              description={t('offers.intro')}
              action={
                <Link to={buildPath('contact', locale)} className="btn-primary text-xs">
                  {t('nav.contact')}
                </Link>
              }
            />
          )}
          {!loading && data && data.offers.length > 0 && (
            <>
              <SectionHeading title={t('offers.title')} description={t('home.offersText')} />
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
              <p className="mt-8 text-xs text-ink-500">{t('booking.totalNote')}</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
