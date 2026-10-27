import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Clock, Copy, MessageCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { Seo } from '@/components/common/Seo';
import { CustomerStatusBadge } from '@/components/common/ui';
import { useI18n } from '@/app/providers/I18nProvider';
import { usePublicData } from '@/app/providers/publicDataContext';
import { buildPath } from '@/app/router/paths';
import { formatDuration, whatsappHref } from '@/lib/utilities/localized';
import type { Reservation } from '@shared/domain/types';

export function ConfirmationPage() {
  const { locale, t, date } = useI18n();
  const { data } = usePublicData();
  const [params] = useSearchParams();
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const stateReservation = (location.state as { reservation?: Reservation } | null)?.reservation;
  const reference = stateReservation?.reference ?? params.get('ref') ?? '';
  const reservation = stateReservation;
  const settings = data?.settings;

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <>
      <Seo page="reservationStatus" title={t('pages.reservationStatus.title')} description={t('pages.reservationStatus.description')} robots="noindex,follow" />
      <section className="section">
        <div className="container-page max-w-3xl">
          <div className="card overflow-hidden">
            <div className="bg-brand-600 px-6 py-8 text-center text-white">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/15 ring-1 ring-white/30">
                <CheckCircle2 className="size-7" aria-hidden="true" />
              </span>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{t('booking.successTitle')}</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-brand-50">{t('booking.successText')}</p>
              {reference && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-ink-900">
                  <span className="font-mono text-base font-extrabold tracking-wide" dir="ltr">
                    {reference}
                  </span>
                  <button type="button" onClick={() => void copyReference()} className="rounded-full p-1 text-ink-500 hover:bg-ink-100" aria-label={t('common.copy')}>
                    <Copy className="size-4" aria-hidden="true" />
                  </button>
                  {copied && <span className="text-xs font-semibold text-brand-700">{t('common.copied')}</span>}
                </div>
              )}
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-50 ring-1 ring-amber-200/40">
                <Clock className="size-3.5" aria-hidden="true" />
                {t('booking.successPending')}
              </p>
            </div>

            <div className="space-y-6 p-6">
              {reservation && (
                <div className="rounded-xl border border-ink-100">
                  <dl className="divide-y divide-ink-100 text-sm">
                    <div className="flex justify-between gap-3 px-4 py-3">
                      <dt className="text-ink-500">{t('lookup.bookedOn')}</dt>
                      <dd className="font-medium text-ink-900">{date(reservation.reservation_date)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 px-4 py-3">
                      <dt className="text-ink-500">{t('booking.startTime')}</dt>
                      <dd className="font-medium text-ink-900" dir="ltr">
                        {reservation.start_time} · {formatDuration(reservation.duration_hours, t)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 px-4 py-3">
                      <dt className="text-ink-500">{t('booking.customer')}</dt>
                      <dd className="font-medium text-ink-900">{reservation.full_name}</dd>
                    </div>
                    <div className="flex justify-between gap-3 px-4 py-3">
                      <dt className="text-ink-500">{t('lookup.statusLabel')}</dt>
                      <dd>
                        <CustomerStatusBadge status={reservation.status} />
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 px-4 py-3">
                      <dt className="text-ink-500">{t('lookup.totalLabel')}</dt>
                      <dd className="font-bold text-ink-900">
                        {new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-MA' : 'en-MA', {
                          style: 'currency',
                          currency: 'MAD',
                          maximumFractionDigits: 0,
                        }).format(reservation.total_price)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              <div>
                <h2 className="text-base font-bold text-ink-900">{t('booking.successNext')}</h2>
                <ol className="mt-3 space-y-2.5 text-sm text-ink-600">
                  {[t('booking.successNext1'), t('booking.successNext2'), t('booking.successNext3')].map((step, index) => (
                    <li key={step} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[0.65rem] font-extrabold text-brand-800">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <p className="mt-4 rounded-xl bg-ink-50 px-3 py-2.5 text-xs text-ink-600">{t('booking.successEmail')}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {settings?.whatsapp && (
                  <a
                    href={whatsappHref(settings.whatsapp, `${t('booking.successText')} ${reference}`)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-primary text-xs"
                  >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    {t('booking.successWhatsapp')}
                  </a>
                )}
                <Link to={buildPath('lookup', locale)} className="btn-secondary text-xs">
                  <Search className="size-4" aria-hidden="true" />
                  {t('booking.successLookup')}
                </Link>
                <Link to={buildPath('booking', locale)} className="btn-ghost text-xs">
                  {t('booking.successBookAnother')}
                </Link>
              </div>

              <p className="border-t border-ink-100 pt-4 text-xs text-ink-500">
                {t('booking.successChange')}
                {settings?.phone && (
                  <>
                    {' '}
                    <a href={`tel:${settings.phone}`} className="font-semibold text-brand-700" dir="ltr">
                      {settings.phone}
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-400">
            <CalendarCheck className="size-4" aria-hidden="true" />
            {t('booking.notConfirmedNotice')}
          </div>
        </div>
      </section>
    </>
  );
}
