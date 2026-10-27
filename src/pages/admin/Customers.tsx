import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Search, StickyNote, Users } from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, Panel, StatCard } from '@/components/admin/widgets';
import { Field, Spinner, StatusBadge } from '@/components/common/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/authentication/AuthProvider';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import { ADMIN_PATHS } from '@/app/router/paths';

export function AdminCustomersPage() {
  const { t, date, number } = useI18n();
  const [search, setSearch] = useState('');
  const customers = useAsync(() => backend.listCustomers(search.trim() || undefined), [search]);

  const totalValue = useMemo(
    () => (customers.data ?? []).reduce((sum, customer) => sum + (customer.total_value ?? 0), 0),
    [customers.data],
  );

  return (
    <div>
      <AdminPageHeader title={t('admin.customers.title')} subtitle={t('admin.customers.subtitle')} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={t('admin.customers.total')} value={number(customers.data?.length ?? 0)} icon={<Users className="size-4" />} />
        <StatCard label={t('admin.customers.value')} value={`${number(Math.round(totalValue))} MAD`} tone="brand" />
        <StatCard label={t('admin.customers.returning')} value={number((customers.data ?? []).filter((customer) => (customer.reservations_count ?? 0) > 1).length)} />
      </div>

      <div className="card mb-4 flex items-center gap-2 p-3">
        <Search className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
        <input
          type="search"
          className="field !border-0 !py-1.5 !shadow-none focus:!ring-0"
          placeholder={t('admin.customers.searchPlaceholder')}
          aria-label={t('admin.common.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {customers.loading && <AdminLoading />}
      {customers.error && <AdminError message={customers.error} onRetry={customers.reload} />}

      {customers.data && customers.data.length === 0 && (
        <p className="card px-4 py-10 text-center text-sm text-ink-500">{t('admin.customers.empty')}</p>
      )}

      {customers.data && customers.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.customers.name')}</th>
                <th>{t('common.email')}</th>
                <th>{t('common.phone')}</th>
                <th className="text-center">{t('admin.customers.bookings')}</th>
                <th className="text-end">{t('admin.customers.value')}</th>
                <th>{t('admin.customers.lastBooking')}</th>
                <th>{t('admin.customers.language')}</th>
              </tr>
            </thead>
            <tbody>
              {customers.data.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link to={ADMIN_PATHS.customer(customer.id)} className="text-xs font-semibold text-brand-700 hover:underline">
                      {customer.full_name}
                    </Link>
                  </td>
                  <td className="text-xs" dir="ltr">
                    {customer.email}
                  </td>
                  <td className="text-xs" dir="ltr">
                    {customer.phone}
                  </td>
                  <td className="text-center text-xs">{customer.reservations_count ?? 0}</td>
                  <td className="text-end text-xs tabular-nums">{number(Math.round(customer.total_value ?? 0))} MAD</td>
                  <td className="text-xs">{customer.last_booking_at ? date(customer.last_booking_at.slice(0, 10)) : '—'}</td>
                  <td className="text-xs uppercase">{customer.locale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminCustomerDetailPage() {
  const { id = '' } = useParams();
  const { t, date, dateTime, number } = useI18n();
  const { allowed } = useAuth();
  const customer = useAsync(() => backend.getCustomer(id), [id]);
  const reservations = useAsync(() => backend.listReservations({ search: customer.data?.email ?? '', limit: 50 }), [customer.data?.email]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const saveNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await backend.addCustomerNote(id, note.trim());
      setNote('');
      customer.reload();
    } finally {
      setSaving(false);
    }
  };

  if (customer.loading) return <AdminLoading />;
  if (customer.error) return <AdminError message={customer.error} onRetry={customer.reload} />;
  if (!customer.data) return <p className="text-sm text-ink-500">{t('admin.customers.notFound')}</p>;

  const record = customer.data;

  return (
    <div>
      <Link to={ADMIN_PATHS.customers} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-3.5 rtl:rotate-180" aria-hidden="true" />
        {t('admin.customers.title')}
      </Link>

      <AdminPageHeader title={record.full_name} subtitle={`${t('admin.customers.clientSince')} ${date(record.first_seen_at.slice(0, 10))}`} />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Panel title={t('admin.customers.reservations')}>
            {reservations.loading && <AdminLoading />}
            {reservations.data && reservations.data.items.length === 0 && (
              <p className="text-xs text-ink-400">{t('admin.customers.noReservations')}</p>
            )}
            {reservations.data && reservations.data.items.length > 0 && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.reservations.reference')}</th>
                    <th>{t('common.date')}</th>
                    <th>{t('admin.reservations.status')}</th>
                    <th className="text-end">{t('admin.reservations.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.data.items.map((reservation) => (
                    <tr key={reservation.id}>
                      <td>
                        <Link to={ADMIN_PATHS.reservation(reservation.id)} className="font-mono text-[0.7rem] font-semibold text-brand-700 hover:underline" dir="ltr">
                          {reservation.reference}
                        </Link>
                      </td>
                      <td className="text-xs">
                        {date(reservation.reservation_date)} · {reservation.start_time.slice(0, 5)}
                      </td>
                      <td>
                        <StatusBadge status={reservation.status} />
                      </td>
                      <td className="text-end text-xs tabular-nums">{number(reservation.total_price)} MAD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title={t('admin.customers.notesTitle')}>
            {allowed('customers:manage_notes') ? (
              <div className="mb-3 space-y-2">
                <Field label={t('admin.customers.addNote')} htmlFor="customer-note">
                  <textarea id="customer-note" rows={2} className="field" value={note} onChange={(event) => setNote(event.target.value)} />
                </Field>
                <button type="button" className="btn-primary text-xs" onClick={() => void saveNote()} disabled={saving || !note.trim()}>
                  {saving && <Spinner className="size-3.5 text-white" />}
                  {t('common.save')}
                </button>
              </div>
            ) : (
              <p className="mb-3 text-[0.7rem] text-ink-400">{t('admin.customers.noNotesAccess')}</p>
            )}

            {record.notes && record.notes.length > 0 ? (
              <ul className="space-y-2">
                {record.notes.map((entry) => (
                  <li key={entry.id} className="rounded-xl bg-ink-50 p-3 text-xs text-ink-700">
                    <p className="whitespace-pre-line">{entry.note}</p>
                    <p className="mt-1 text-[0.65rem] text-ink-400">
                      {entry.author_name} · {dateTime(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-400">{t('admin.customers.notesEmpty')}</p>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={t('admin.customers.contact')}>
            <ul className="space-y-2 text-xs text-ink-700">
              <li className="flex items-center gap-2">
                <Mail className="size-3.5 text-ink-400" aria-hidden="true" />
                <a href={`mailto:${record.email}`} className="hover:underline" dir="ltr">
                  {record.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-3.5 text-ink-400" aria-hidden="true" />
                <a href={`tel:${record.phone}`} className="hover:underline" dir="ltr">
                  {record.phone}
                </a>
              </li>
              <li>
                {t('admin.customers.language')}: <span className="uppercase">{record.locale}</span>
              </li>
              <li>
                {t('admin.customers.marketing')}: {record.marketing_consent ? t('common.yes') : t('common.no')}
              </li>
            </ul>
          </Panel>

          <Panel title={t('admin.customers.summary')}>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('admin.customers.bookings')}</dt>
                <dd className="font-semibold">{record.reservations_count ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('admin.customers.value')}</dt>
                <dd className="font-semibold">{number(Math.round(record.total_value ?? 0))} MAD</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('admin.customers.lastBooking')}</dt>
                <dd className="font-semibold">{record.last_booking_at ? date(record.last_booking_at.slice(0, 10)) : '—'}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title={t('admin.customers.privacy')}>
            <p className="flex gap-2 text-[0.7rem] leading-relaxed text-ink-500">
              <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {t('admin.customers.privacyText')}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
