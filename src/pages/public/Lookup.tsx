import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Search } from 'lucide-react';
import { Seo } from '@/components/common/Seo';
import { CustomerStatusBadge, Field, Spinner } from '@/components/common/ui';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import { buildPath } from '@/app/router/paths';
import { formatDuration } from '@/lib/utilities/localized';
import type { Reservation } from '@shared/domain/types';

export function LookupPage() {
  const { locale, t, date } = useI18n();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setReservation(null);
    setLoading(true);
    try {
      const result = await backend.lookupReservation(reference, email);
      if (!result) {
        setError(t('lookup.notFound'));
      } else {
        setReservation(result);
      }
    } catch {
      setError(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo page="lookup" title={t('pages.lookup.title')} description={t('pages.lookup.description')} robots="noindex,follow" />
      <section className="section">
        <div className="container-page max-w-2xl">
          <p className="eyebrow mb-3">{t('footer.reservationLookup')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">{t('lookup.title')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">{t('lookup.intro')}</p>

          <form onSubmit={submit} className="card mt-8 space-y-4 p-5 sm:p-6">
            <Field label={t('lookup.reference')} htmlFor="lookup-reference" required hint={t('lookup.referenceHint')}>
              <input
                id="lookup-reference"
                className="field font-mono uppercase"
                placeholder="MJB-260101-ABCD"
                dir="ltr"
                value={reference}
                onChange={(event) => setReference(event.target.value.toUpperCase())}
                required
                autoComplete="off"
              />
            </Field>
            <Field label={t('lookup.email')} htmlFor="lookup-email" required>
              <input
                id="lookup-email"
                type="email"
                dir="ltr"
                className="field"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </Field>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
              {loading ? <Spinner className="size-4 text-white" /> : <Search className="size-4" aria-hidden="true" />}
              {loading ? t('lookup.searching') : t('lookup.submit')}
            </button>
          </form>

          {error && (
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          {reservation && (
            <div className="card mt-6 overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-5 py-3">
                <div>
                  <p className="text-xs text-ink-500">{t('lookup.resultTitle')}</p>
                  <p className="font-mono text-sm font-bold text-ink-900" dir="ltr">
                    {reservation.reference}
                  </p>
                </div>
                <CustomerStatusBadge status={reservation.status} />
              </div>
              <dl className="divide-y divide-ink-100 text-sm">
                <div className="flex justify-between gap-3 px-5 py-3">
                  <dt className="text-ink-500">{t('lookup.forDate')}</dt>
                  <dd className="font-medium text-ink-900">{date(reservation.reservation_date)}</dd>
                </div>
                <div className="flex justify-between gap-3 px-5 py-3">
                  <dt className="text-ink-500">{t('booking.startTime')}</dt>
                  <dd className="font-medium text-ink-900" dir="ltr">
                    {reservation.start_time} · {formatDuration(reservation.duration_hours, t)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 px-5 py-3">
                  <dt className="text-ink-500">{t('booking.quantityPeople')}</dt>
                  <dd className="font-medium text-ink-900">{reservation.participants}</dd>
                </div>
                <div className="flex justify-between gap-3 px-5 py-3">
                  <dt className="text-ink-500">{t('lookup.totalLabel')}</dt>
                  <dd className="font-bold text-ink-900" dir="ltr">
                    {reservation.total_price} {t('common.mad')}
                  </dd>
                </div>
                <div className="px-5 py-3">
                  <dt className="text-ink-500">{t('lookup.statusLabel')}</dt>
                  <dd className="mt-1 text-ink-700">{t(`statusHelp.${reservation.status}`)}</dd>
                </div>
                {reservation.proposed_date && (
                  <div className="px-5 py-3">
                    <dt className="text-ink-500">{t('booking.successNext3')}</dt>
                    <dd className="mt-1 font-medium text-ink-900">
                      {date(reservation.proposed_date)} {reservation.proposed_time ?? ''}
                    </dd>
                  </div>
                )}
              </dl>
              <p className="border-t border-ink-100 px-5 py-3 text-xs text-ink-500">{t('lookup.contactHint')}</p>
            </div>
          )}

          <p className="mt-6 text-xs text-ink-500">
            {t('booking.successChange')}{' '}
            <Link to={buildPath('contact', locale)} className="font-semibold text-brand-700 hover:underline">
              {t('nav.contact')}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
