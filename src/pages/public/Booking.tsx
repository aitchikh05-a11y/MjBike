import { useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '@/components/common/Seo';
import { LoadingBlock, Alert } from '@/components/common/ui';
import { BookingForm } from '@/components/booking/BookingForm';
import { useI18n } from '@/app/providers/I18nProvider';
import { usePublicData } from '@/app/providers/publicDataContext';
import { buildPath } from '@/app/router/paths';

export function BookingPage() {
  const { locale, t } = useI18n();
  const { data, loading, error } = usePublicData();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <>
      <Seo page="booking" title={t('pages.booking.title')} description={t('pages.booking.description')} />
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-white py-12 lg:py-16">
        <div className="container-page max-w-3xl">
          <p className="eyebrow mb-3">{t('nav.book')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{t('booking.title')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">{t('booking.intro')}</p>
        </div>
      </section>

      <section className="section !pt-10">
        <div className="container-page">
          {loading && <LoadingBlock />}
          {error && !loading && <Alert tone="error" title={error} />}
          {!loading && data && (
            <BookingForm
              services={data.services}
              offers={data.offers}
              initialServiceSlug={params.get('service')}
              initialOfferSlug={params.get('offer')}
              onSuccess={(reservation) => {
                try {
                  sessionStorage.setItem('mjb.lastReservation', JSON.stringify(reservation));
                } catch {
                  /* session storage may be unavailable */
                }
                navigate(`${buildPath('reservationStatus', locale)}?ref=${encodeURIComponent(reservation.reference)}`, {
                  state: { reservation },
                  replace: true,
                });
              }}
            />
          )}
        </div>
      </section>
    </>
  );
}
